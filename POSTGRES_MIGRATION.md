# PostgreSQL Migration Guide

This project now uses Prisma with `postgresql` datasource.

## 1) Set PostgreSQL URL

Update `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/flightbox?schema=public"
```

## 2) Create database

```bash
sudo -u postgres psql -c "CREATE DATABASE flightbox;"
```

## 3) Import old SQLite data (recommended)

If your old DB is `prisma/dev.db`, use `pgloader`:

```bash
pgloader sqlite:///www/wwwroot/www.avispotters.net/FlightBox/prisma/dev.db \
         postgresql://USER:PASSWORD@127.0.0.1:5432/flightbox
```

## 4) Generate Prisma client

```bash
npx prisma generate
```

## 5) Sync schema

For first migration from SQLite, use:

```bash
npx prisma db push
```

Then run app build:

```bash
npm run build
```

## 6) PM2 restart

```bash
pm2 restart flightbox --update-env
pm2 save
```

