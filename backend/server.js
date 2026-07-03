import express from "express";
import cors from "cors";
import pg from "pg";
import { createClient } from "redis";

const app = express();
const port = process.env.PORT || 5000;
const databaseUrl = process.env.DATABASE_URL || "postgres://papertrail:papertrail@localhost:5432/papertrail";
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const pool = new pg.Pool({ connectionString: databaseUrl });
const redis = createClient({ url: redisUrl });

app.use(cors());
app.use(express.json());

async function connectWithRetry() {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      await pool.query("select 1");
      if (!redis.isOpen) await redis.connect();
      return;
    } catch (error) {
      console.log(`Waiting for services... attempt ${attempt}`);
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }
}

async function migrate() {
  await pool.query(`
    create table if not exists users (
      id serial primary key,
      name text not null,
      contact text not null,
      email text unique not null,
      delivery_address text not null,
      created_at timestamptz default now()
    );
    create table if not exists cart_items (
      id serial primary key,
      user_email text not null,
      book_id text not null,
      title text not null,
      authors text,
      thumbnail text,
      price numeric(8,2) not null default 12.99,
      quantity integer not null default 1,
      unique(user_email, book_id)
    );
  `);
}

const fallbackBooks = [
  {
    id: "papertrail-local-1",
    title: "The Midnight Library",
    authors: ["Matt Haig"],
    description: "A reflective novel about choices, regrets, and the lives we imagine for ourselves.",
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780525559474-L.jpg",
    categories: ["Fiction"],
    price: 16.99
  },
  {
    id: "papertrail-local-2",
    title: "Atomic Habits",
    authors: ["James Clear"],
    description: "A practical guide to building better habits through small, consistent improvements.",
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg",
    categories: ["Self-Help"],
    price: 18.99
  },
  {
    id: "papertrail-local-3",
    title: "Project Hail Mary",
    authors: ["Andy Weir"],
    description: "A smart, funny science-fiction rescue story set far from Earth.",
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg",
    categories: ["Science Fiction"],
    price: 15.49
  }
];

function normalizeBook(item, index) {
  const info = item.volumeInfo || item;
  const id = item.id || `book-${index}`;
  return {
    id,
    title: info.title || "Untitled book",
    authors: info.authors || ["Unknown author"],
    description: (info.description || "A carefully selected Papertrail shelf pick.").replace(/<[^>]*>/g, ""),
    thumbnail: info.imageLinks?.thumbnail?.replace("http://", "https://") || info.thumbnail || "",
    categories: info.categories || ["General"],
    price: Number((10 + (id.length % 14) + 0.99).toFixed(2))
  };
}

app.get("/api/health", async (_req, res) => {
  const db = await pool.query("select now()");
  res.json({ ok: true, database: db.rows[0].now, redis: redis.isOpen });
});

app.get("/api/books", async (req, res) => {
  const query = req.query.q || "modern fiction";
  const genre = req.query.genre || "";
  const cacheKey = `books:${query}:${genre}`;
  const cached = redis.isOpen ? await redis.get(cacheKey) : null;
  if (cached) return res.json(JSON.parse(cached));

  const search = encodeURIComponent(`${query} ${genre}`.trim());
  try {
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${search}&maxResults=24`);
    const payload = await response.json();
    const books = (payload.items || []).map(normalizeBook);
    const result = books.length ? books : fallbackBooks;
    if (redis.isOpen) await redis.set(cacheKey, JSON.stringify(result), { EX: 900 });
    res.json(result);
  } catch {
    res.json(fallbackBooks);
  }
});

app.post("/api/login", async (req, res) => {
  const { name, contact, email, deliveryAddress } = req.body;
  if (!name || !contact || !email || !deliveryAddress) {
    return res.status(400).json({ message: "Name, contact, email, and delivery address are required." });
  }
  const result = await pool.query(
    `insert into users (name, contact, email, delivery_address)
     values ($1, $2, $3, $4)
     on conflict (email) do update
     set name = excluded.name, contact = excluded.contact, delivery_address = excluded.delivery_address
     returning id, name, contact, email, delivery_address as "deliveryAddress"`,
    [name, contact, email, deliveryAddress]
  );
  res.json(result.rows[0]);
});

app.get("/api/profile/:email", async (req, res) => {
  const result = await pool.query(
    `select id, name, contact, email, delivery_address as "deliveryAddress" from users where email = $1`,
    [req.params.email]
  );
  res.json(result.rows[0] || null);
});

app.get("/api/cart/:email", async (req, res) => {
  const result = await pool.query("select * from cart_items where user_email = $1 order by id desc", [req.params.email]);
  res.json(result.rows);
});

app.post("/api/cart", async (req, res) => {
  const { email, book } = req.body;
  if (!email || !book?.id) return res.status(400).json({ message: "Email and book are required." });
  const result = await pool.query(
    `insert into cart_items (user_email, book_id, title, authors, thumbnail, price)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (user_email, book_id) do update set quantity = cart_items.quantity + 1
     returning *`,
    [email, book.id, book.title, (book.authors || []).join(", "), book.thumbnail, book.price || 12.99]
  );
  res.json(result.rows[0]);
});

app.delete("/api/cart/:email/:bookId", async (req, res) => {
  await pool.query("delete from cart_items where user_email = $1 and book_id = $2", [req.params.email, req.params.bookId]);
  res.json({ ok: true });
});

await connectWithRetry();
await migrate();
app.listen(port, () => console.log(`Papertrail API running on ${port}`));
