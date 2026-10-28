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

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Supabase Authentication and PostgreSQL
- React Router
- Recharts
- Lucide React
- date-fns

## Getting started

### Requirements

- Node.js 18 or newer
- npm
- A Supabase project with the HotelPro database schema applied

### Install dependencies

```bash
npm install
```

### Configure Supabase

The application expects these public client settings to be available in the local environment:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Use the values from your Supabase project. Do not commit local environment files or secret keys to GitHub.

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

## Database

The database schema is maintained through Supabase migrations in `supabase/migrations/`. The schema includes:

- User profiles and role-based access
- Hotels and room categories
- Rooms and availability states
- Bookings and payments
- Reviews and notifications
- Service requests
- Staff assignments
- Seasonal rates
- Invoices
- Activity logs

Row-level security policies protect user data and restrict staff and administrator actions by role.

## Project structure

```text
src/
├── components/       Shared UI elements and feedback components
├── layouts/          Guest, staff, admin, and public layouts
├── lib/              Authentication, Supabase, routing, theme, and utilities
└── pages/            Public, guest, staff, and admin screens

supabase/
└── migrations/       Database schema and security migrations
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

- Authentication uses Supabase email and password authentication.
- Protected pages require an active authenticated session.
- Database policies enforce ownership and role-based access.
- Never expose service-role keys in browser code.
- Never commit environment files, access tokens, or private credentials.

## License

This project is private unless a separate license is added by the project owner.
