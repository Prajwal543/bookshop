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
  },
  {
    id: "papertrail-local-4",
    title: "Dune",
    authors: ["Frank Herbert"],
    description: "A landmark science-fiction epic of politics, ecology, power, and survival on a desert planet.",
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780441172719-L.jpg",
    categories: ["Science Fiction"],
    price: 14.99
  },
  {
    id: "papertrail-local-5",
    title: "The Song of Achilles",
    authors: ["Madeline Miller"],
    description: "A lyrical retelling of Achilles and Patroclus, full of intimacy, myth, and tragedy.",
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780062060624-L.jpg",
    categories: ["Romance"],
    price: 13.99
  },
  {
    id: "papertrail-local-6",
    title: "Educated",
    authors: ["Tara Westover"],
    description: "A memoir about family, self-invention, and the difficult path toward education.",
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780399590504-L.jpg",
    categories: ["Biography"],
    price: 17.49
  },
  {
    id: "papertrail-local-7",
    title: "The Hobbit",
    authors: ["J. R. R. Tolkien"],
    description: "A timeless fantasy adventure through mountains, riddles, treasure, and courage.",
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780547928227-L.jpg",
    categories: ["Fantasy"],
    price: 12.99
  },
  {
    id: "papertrail-local-8",
    title: "The Thursday Murder Club",
    authors: ["Richard Osman"],
    description: "A witty mystery featuring four unlikely investigators with sharp minds and excellent timing.",
    thumbnail: "https://covers.openlibrary.org/b/isbn/9781984880963-L.jpg",
    categories: ["Mystery"],
    price: 15.99
  },
  {
    id: "papertrail-local-9",
    title: "Sapiens",
    authors: ["Yuval Noah Harari"],
    description: "A sweeping history of humankind, from early societies to modern systems of belief and power.",
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg",
    categories: ["History"],
    price: 19.99
  },
  {
    id: "papertrail-local-10",
    title: "Deep Work",
    authors: ["Cal Newport"],
    description: "A focused guide to doing meaningful work in an age of constant distraction.",
    thumbnail: "https://covers.openlibrary.org/b/isbn/9781455586691-L.jpg",
    categories: ["Business"],
    price: 16.49
  },
  {
    id: "papertrail-local-11",
    title: "Circe",
    authors: ["Madeline Miller"],
    description: "A bold mythological novel about exile, transformation, voice, and power.",
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780316556347-L.jpg",
    categories: ["Fantasy"],
    price: 14.49
  },
  {
    id: "papertrail-local-12",
    title: "Tomorrow, and Tomorrow, and Tomorrow",
    authors: ["Gabrielle Zevin"],
    description: "A tender novel about creative partnership, games, ambition, and friendship over decades.",
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780593321201-L.jpg",
    categories: ["Fiction"],
    price: 18.49
  },
  {
    id: "papertrail-local-13",
    title: "The Psychology of Money",
    authors: ["Morgan Housel"],
    description: "Short, memorable lessons about wealth, behavior, patience, luck, and risk.",
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780857197689-L.jpg",
    categories: ["Business"],
    price: 15.49
  },
  {
    id: "papertrail-local-14",
    title: "A Man Called Ove",
    authors: ["Fredrik Backman"],
    description: "A warm novel about grief, neighborhood, stubbornness, and unexpected connection.",
    thumbnail: "https://covers.openlibrary.org/b/isbn/9781476738024-L.jpg",
    categories: ["Fiction"],
    price: 13.49
  },
  {
    id: "papertrail-local-15",
    title: "The Silent Patient",
    authors: ["Alex Michaelides"],
    description: "A psychological thriller built around silence, obsession, and a startling reveal.",
    thumbnail: "https://covers.openlibrary.org/b/isbn/9781250301697-L.jpg",
    categories: ["Mystery"],
    price: 14.99
  },
  {
    id: "papertrail-local-16",
    title: "Pride and Prejudice",
    authors: ["Jane Austen"],
    description: "A classic comedy of manners about love, judgment, family, and first impressions.",
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg",
    categories: ["Romance"],
    price: 10.99
  },
  {
    id: "papertrail-local-17",
    title: "The Name of the Wind",
    authors: ["Patrick Rothfuss"],
    description: "A richly told fantasy about music, magic, memory, and a legendary life in the making.",
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780756404741-L.jpg",
    categories: ["Fantasy"],
    price: 16.99
  },
  {
    id: "papertrail-local-18",
    title: "Thinking, Fast and Slow",
    authors: ["Daniel Kahneman"],
    description: "A major work on judgment, decision-making, intuition, and cognitive bias.",
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg",
    categories: ["Self-Help"],
    price: 18.49
  },
  {
    id: "papertrail-local-19",
    title: "The Book Thief",
    authors: ["Markus Zusak"],
    description: "A moving historical novel about words, danger, kindness, and survival.",
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780375842207-L.jpg",
    categories: ["History"],
    price: 13.99
  },
  {
    id: "papertrail-local-20",
    title: "Klara and the Sun",
    authors: ["Kazuo Ishiguro"],
    description: "A quiet, elegant novel about artificial intelligence, devotion, and what people ask of love.",
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780593318171-L.jpg",
    categories: ["Science Fiction"],
    price: 15.99
  },
  {
    id: "papertrail-local-21",
    title: "Becoming",
    authors: ["Michelle Obama"],
    description: "A personal memoir of family, identity, public life, and becoming more fully yourself.",
    thumbnail: "https://covers.openlibrary.org/b/isbn/9781524763138-L.jpg",
    categories: ["Biography"],
    price: 18.99
  },
  {
    id: "papertrail-local-22",
    title: "The Lean Startup",
    authors: ["Eric Ries"],
    description: "A practical business book on fast learning, experiments, and building products people need.",
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780307887894-L.jpg",
    categories: ["Business"],
    price: 16.99
  },
  {
    id: "papertrail-local-23",
    title: "The Seven Husbands of Evelyn Hugo",
    authors: ["Taylor Jenkins Reid"],
    description: "A glamorous, emotional novel of fame, secrets, ambition, and complicated love.",
    thumbnail: "https://covers.openlibrary.org/b/isbn/9781501161933-L.jpg",
    categories: ["Fiction"],
    price: 14.99
  },
  {
    id: "papertrail-local-24",
    title: "Gone Girl",
    authors: ["Gillian Flynn"],
    description: "A sharp psychological thriller about marriage, media, lies, and manipulation.",
    thumbnail: "https://covers.openlibrary.org/b/isbn/9780307588371-L.jpg",
    categories: ["Mystery"],
    price: 13.99
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
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${search}&maxResults=40`);
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
