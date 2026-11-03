# HotelPro

HotelPro is a local MERN hotel booking and operations app. It includes public room search, guest reservations, staff check-in/out and service requests, administrator inventory and account management, in-app notifications, printable invoices, payment records and operating reports.

## Local setup

1. Install Node.js 18+ and run MongoDB locally (or point `MONGO_URI` at your MongoDB instance).
2. Copy `backend/.env.example` to `backend/.env`, set a unique long `JWT_SECRET`, and confirm `MONGO_URI`.
3. From `backend`, install dependencies and run `npm run seed:rooms`. The seed adds missing demo room numbers only; it will not overwrite existing records.
4. For a first admin, set `ADMIN_NAME`, `ADMIN_EMAIL`, and a unique `ADMIN_PASSWORD` of at least 12 characters in `backend/.env`, then run `npm run create-admin`. Remove the bootstrap password from the environment after account creation.
5. Start the API from `backend` with `npm run dev`.
6. Start the React site from `frontend` with `npm run dev -- --host 0.0.0.0`. Open the local address Vite prints.

Guest accounts are created through the site. The first administrator is bootstrapped once with `npm run create-admin`. After signing in through the header's **Staff / admin** option, an administrator can open **Manage team → Add team account**, choose Staff or Administrator, and set an initial password. Staff use the same **Staff / admin** sign-in option and land on the front desk. Public guest registration cannot grant team access.

## Payments

Reservations can be made with payment due at the property. To enable online Razorpay Checkout, add the merchant's test or live `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `backend/.env`, then restart the API. The API verifies the payment signature and captured transaction with Razorpay before marking a booking paid. Never put the secret key in the frontend or commit a populated `.env` file.

## Main modules

- Guest registration, profile, room search, booking changes, cancellations, service requests, reviews, notifications and invoices.
- Staff reservation desk, room readiness, cash payment recording, service assignment and check-in/check-out.
- Administrator room inventory, seasonal rates, staff roles, payment and refund records, reports and audit history.
