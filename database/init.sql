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
