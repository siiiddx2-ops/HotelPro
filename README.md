# HotelPro

HotelPro is a modern hotel management platform for guests, hotel staff, and administrators. It combines room discovery and booking with day-to-day hotel operations, payment records, housekeeping, staff management, and reporting.

## Features

### Guest experience

- Browse rooms by hotel, availability, price, capacity, and amenities
- View room details, photos, pricing, and guest reviews
- Book rooms with check-in, check-out, guest count, and payment method
- View booking details and payment status
- Download a booking invoice
- Submit and track hotel service requests
- Receive booking, payment, and service notifications
- Manage profile information and password

### Staff operations

- Staff dashboard with operational summaries
- Check guests in and out
- View arrivals, departures, and in-house guests
- Search and manage reservations
- Manage housekeeping and service requests
- Update room and reservation statuses

### Administration

- Dashboard with hotel performance metrics
- Manage hotels, room categories, rooms, and seasonal rates
- Review and manage all bookings
- Track payments and process refunds
- Manage users, roles, and staff assignments
- Review activity logs
- View reports and operational analytics

## User roles

- **Guest** — Search rooms, make bookings, manage stays, and submit service requests
- **Staff** — Manage reservations, check-ins, check-outs, rooms, and housekeeping
- **Admin** — Manage the complete hotel operation, users, staff, payments, and reports

## Technology

- JavaScript and React JSX
- React 18 with Vite
- Bootstrap 5 and Bootstrap Icons
- Node.js and Express.js API
- MongoDB with Mongoose
- JSON Web Token authentication
- React Router
- Recharts
- Lucide React
- date-fns

## Getting started

### Requirements

- Node.js 18 or newer
- npm
- MongoDB running locally or a MongoDB connection string

### Install dependencies

```bash
npm install
```

### Configure MongoDB and JWT

Set these server values in your local environment. Never commit local environment files or secret keys to GitHub.

- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_ORIGIN` (optional; defaults to `http://localhost:5173`)
- `PORT` (optional; defaults to `4000`)

### Start the application

```bash
npm run dev
```

### Create a production build

```bash
npm run build
```

### Type-check the project

```bash
npm run typecheck
```

## API

The Express server provides JWT-protected authentication, profile updates, hotel and room data, bookings, role-protected staff operations, and MongoDB-backed CRUD data routes. Public registration creates guest accounts; staff and administrator roles are managed through administrator-only operations.

## Project structure

```text
src/
├── components/       Shared UI elements and feedback components
├── layouts/          Guest, staff, admin, and public layouts
├── lib/              API client, JWT session, routing, theme, and utilities
└── pages/            Public, guest, staff, and admin screens

server/
└── index.ts          Express API, MongoDB models, and JWT middleware
```

## Application routes

| Area | Route | Access |
| --- | --- | --- |
| Landing page | `/` | Public |
| Sign in | `/signin` | Public |
| Sign up | `/signup` | Public |
| Guest dashboard | `/guest` | Guest |
| Staff dashboard | `/staff` | Staff and admin |
| Admin dashboard | `/admin` | Admin |

## Security notes

- Passwords are hashed with bcrypt before storage.
- Protected API routes require a signed JWT.
- Staff and administrator operations require role checks on the server.
- Never commit environment files, access tokens, or private credentials.

## License

This project is private unless a separate license is added by the project owner.
