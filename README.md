# Papertrail

A full-stack minimalist bookstore app with:

- Frontend: static HTML, CSS, and JavaScript served by Nginx
- Backend: Node.js and Express API
- Database: PostgreSQL
- Cache: Redis for book search caching
- Book data: Google Books API with local fallback books

## Run

```bash
docker compose up -d --build
```

Open:

- Storefront: http://localhost:8080
- API health: http://localhost:5000/api/health

## Features

- Newcomer login/profile form
- Profile fields for name, contact, email, and delivery address
- Multiple sections/pages for home, catalog, categories, profile, and cart
- Book search by keyword and genre
- Sorting and filters
- Book preview details on hover
- Persistent cart stored in Postgres
- Redis-cached API searches
- Papertrail logo and footer contact details

## Stop

```bash
docker compose down
```
