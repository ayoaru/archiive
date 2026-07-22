# Archiive

A full-stack digital wardrobe manager — catalog your closet, track a shopping wishlist, and pull product details straight from a retailer's URL instead of typing them in by hand.

Built as a MERN-style application (MongoDB, Express, React, Node) with cloud object storage for images and a small web-scraping engine for wishlist imports.

> Related: See [archiive-bfl-klein](https://github.com/ayoaru/archiive-bfl-klein)

## Overview

Archiive lets a user maintain two structured collections of clothing:

- **Closet** — items you own, with brand, category, season, style, color, and fit metadata plus front/back photos.
- **Wishlist** — items you want, with the same metadata plus price and a link back to the product page.

Rather than manually re-typing product details when adding something to the wishlist, a user can paste a product URL and the backend will attempt to extract the name, brand, price, and images automatically.

## Technical Highlights

This project was used to get hands-on with a few areas of full-stack engineering:

- **REST API design** — a resource-oriented Express API (`/closet/*`, `/wishlist/*`) with consistent create/read/update/delete semantics across two related but independently-evolving Mongoose schemas.
- **Cloud object storage with signed access** — images are stored in AWS S3 by key only; the API generates short-lived presigned URLs (`getSignedUrl`) on read instead of storing/exposing permanent public URLs, and cleans up orphaned S3 objects whenever an item's image is replaced or the item is deleted.
- **Dual-source image ingestion** — an item's photo can come from either a direct file upload (`multer`, in-memory storage, MIME-type + size validation) or a remote URL, with both paths converging on the same S3 upload helper.
- **Web scraping / structured data extraction** — a two-stage strategy for importing wishlist items from an arbitrary product URL:
  1. Try the retailer's Shopify Storefront JSON endpoint (`<product-url>.json`) for clean, structured product data.
  2. Fall back to scraping Open Graph meta tags and heuristics (`cheerio` + `axios`) when a site isn't Shopify-backed.
- **Schema evolution with data migration** — `server/migrate.js` is a one-off script that migrated existing documents from a single `image` field to separate `imageFront` / `imageBack` fields using MongoDB's aggregation-pipeline `updateMany`, without dropping existing data.
- **Storage provider migration** — the project originally used Cloudinary for image hosting and was migrated to AWS S3 with presigned URLs as storage needs evolved (see [Roadmap](#roadmap)).

## Architecture

```
 React (client)                Express API (server)
 MUI + react-router    <--->   /closet/*  /wishlist/*
                                     |
                                     |  Mongoose
                                     v
                                  MongoDB
                          closet_items / wishlist_items
                                     |
                       ------------------------------
                       |                             |
                       v                             v
                    AWS S3                  Shopify JSON / HTML
              image storage via            scraping (axios + cheerio)
               presigned URLs               for wishlist URL imports
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, Material UI 7 (`@mui/material`, `@mui/x-data-grid`), Axios |
| Backend | Node.js, Express 5, Mongoose 8 |
| Database | MongoDB |
| Object storage | AWS S3 (`@aws-sdk/client-s3`, presigned URLs via `@aws-sdk/s3-request-presigner`) |
| File uploads | Multer (in-memory, image-only, 5MB limit) |
| Web scraping | Axios + Cheerio, with a Shopify Storefront JSON fast path |
| Tooling | Nodemon (dev server), Create React App (`react-scripts`), dotenv |

## Project Structure

```
archiive/
├── client/                 # React app (Create React App)
│   └── src/
│       ├── components/     # ItemCard, NavBar, Add/Update forms, etc.
│       └── pages/          # Home, Closet, Wishlist, Add/Update/Search
└── server/                 # Express API
    ├── config/s3.js        # AWS S3 client configuration
    ├── middleware/upload.js# Multer file-upload middleware
    ├── models/item.js      # Closet + Wishlist Mongoose schemas
    ├── routes/items.js     # All closet/wishlist REST endpoints + scraping
    ├── migrate.js           # One-off data migration script
    └── index.js             # App entry point
```

## Getting Started

### Prerequisites

- Node.js
- A MongoDB connection string (e.g. MongoDB Atlas)
- An AWS S3 bucket + credentials

### Setup

```bash
# Install dependencies for root, client, and server
npm install
cd client && npm install
cd ../server && npm install
```

Create a `server/.env` file:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
AWS_REGION=your_aws_region
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=your_bucket_name
```

Run the app (two terminals):

```bash
# Terminal 1 — API server (http://localhost:5000)
cd server && npm run dev

# Terminal 2 — React client (http://localhost:3000, proxies API calls to :5000)
cd client && npm start
```

## API Reference

All endpoints are mirrored under `/closet` and `/wishlist`.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/closet/create` | Create a closet item (multipart file upload or image URL) |
| `GET` | `/closet/read` | List all closet items with presigned image URLs |
| `GET` | `/closet/get/:id` | Fetch a single closet item |
| `PUT` | `/closet/update/:id` | Update a closet item, including swapping/clearing images |
| `DELETE` | `/closet/delete/:id` | Delete a closet item and its S3 images |
| `POST` | `/wishlist/create` | Create a wishlist item |
| `POST` | `/wishlist/create/url` | Scrape a product URL for name/brand/price/images |
| `GET` | `/wishlist/read` | List all wishlist items with presigned image URLs |
| `GET` | `/wishlist/get/:id` | Fetch a single wishlist item |
| `PUT` | `/wishlist/update/:id` | Update a wishlist item |
| `DELETE` | `/wishlist/delete/:id` | Delete a wishlist item and its S3 images |

## Roadmap / Build Log

Summary of how Archiive evolved, from initial commit to current state:

1. **Client/server scaffold** — migrated the project into a proper client/server app (React frontend, Express API).
2. **Closet CRUD + search** — closet item create/read/update/delete, with a searchable, sortable data-grid view (MUI Data Grid).
3. **Cloudinary → AWS S3 migration** — moved image storage off Cloudinary onto AWS S3, generating short-lived presigned URLs on read and cleaning up orphaned objects on every update/delete.
4. **Wishlist collection** — added a second Mongoose schema (closet fields + price + product link) for items a user wants but doesn't own yet.
5. **URL-import scraper** — two-stage product scraper for the wishlist: try the retailer's Shopify Storefront JSON endpoint first, fall back to Open Graph meta-tag scraping (`axios` + `cheerio`) for non-Shopify sites.
6. **Add/update/delete flow rework** — reworked the add-item and update-item flows, wired up item deletion with confirmation dialogs and toast feedback.
7. **Front/back image support** — extended both schemas from a single `image` field to `imageFront`/`imageBack`, with a [`migrate.js`](server/migrate.js) backfill script to convert existing records without losing data.
8. **Navigation** — added Closet/Wishlist links to the navbar.

### Planned

- Virtual try-on (VTO) model pipeline integration into frontend, [see this repo for more information](https://github.com/ayoaru/archiive-bfl-klein)
- Automated test coverage for API routes and React components
- Deployment pipeline (CI + hosted client/server/database)

## License

Personal project — license unspecified.
