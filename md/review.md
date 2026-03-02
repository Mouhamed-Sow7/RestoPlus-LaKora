 # RestoPlus Architecture & Logic Review

 ## Overview

 RestoPlus (“La Kora”) is a restaurant ordering and management application built with:

 - **Backend**: Node.js, Express, MongoDB (via Mongoose)
 - **Frontend**: Static HTML/CSS/JavaScript served directly by Express (no bundler or SPA framework)

 The application supports:

 - **Customer flows**: scan a table QR, browse the menu, build a cart, place an order, get a QR ticket, and track status.
 - **Staff/admin flows**: log into the admin dashboard, view and manage orders, scan/validate customer QR tickets, merge orders, and see basic analytics.
 - **Reservations**: a reservation UI on the frontend and a reservation API on the backend (currently not fully wired together).

 The main entrypoint is:

 - `backend/server.js` → bootstraps database and HTTP server.
 - `backend/app.js` → configures Express, middleware, static serving, and API routes.

 ---

 ## Backend Architecture

 ### Structure

 - `backend/server.js`
   - Loads environment variables.
   - Connects to MongoDB.
   - Imports `app` from `backend/app.js`.
   - Starts the HTTP server on the configured port.
 - `backend/app.js`
   - Configures Express and CORS.
   - Registers JSON and URL-encoded body parsers.
   - Serves static assets from `public`.
   - Mounts API route modules:
     - `/api/orders`
     - `/api/reservations`
     - `/api/analytics`
     - `/api/auth`
   - Provides a simple `/api` health-check endpoint.
   - Adds global 404 and 500 error handlers.

 - `backend/routes/`
   - `orders.js`: order creation and lifecycle management, QR scan/validation, payment status, and order fusion.
   - `reservations.js`: reservation CRUD (not currently used by the main frontend).
   - `analytics.js`: aggregates orders/revenue/reservations for dashboards.
   - `auth.js`: admin/server login and token verification.

 - `backend/models/`
   - `Order.js`: schema and model for customer orders.
   - `Reservation.js`: schema and model for reservations.
   - `Analytics.js`: schema and model for daily analytics snapshots.

 - `backend/middleware/`
   - `auth.js`: JWT verification and role-based access control (`requireAdmin`, `requireServer`, `requireAdminOrServer`).

 - `backend/data/`
   - `menu.json`: static menu data (currently not used by the main frontend, which embeds its own menu).

 ### Middleware & Error Handling

 - **Middleware stack (in `app.js`)**
   - `cors()` with default configuration (all origins allowed).
   - `express.json()` and `express.urlencoded({ extended: true })` for body parsing.
   - `express.static("../public")` to serve the frontend assets.

 - **Error handling**
   - A catch-all 404 middleware that returns a JSON `{ message: "Route not found" }`.
   - A final error-handling middleware that logs the stack and returns a generic 500 response `{ error: "Internal server error" }`.
   - Most route handlers wrap logic in `try/catch` blocks and respond with 4xx/5xx JSON errors as appropriate.

 ### Orders Flow (Backend)

 - **Creation**
   - `POST /api/orders`
   - Accepts data such as table, items, totals, payment method, and order mode (group/individual).
   - Persists an `Order` document with:
     - `orderId`
     - `table`
     - `mode`
     - `items` (name, quantity, price, etc.)
     - `total`
     - `paymentMethod` and `paymentStatus`
     - `status` (starts as `pending`/`pending_approval` depending on flow)
   - This endpoint is **not authenticated** to allow customers to place orders from the public UI.

 - **Status / Payment Updates**
   - Authenticated staff endpoints (protected via JWT middleware) allow:
     - Updating `status` (e.g. `pending`, `pending_scan`, `pending_approval`, `accepted`, `preparing`, `ready`, `served`, `cancelled`).
     - Updating `paymentStatus` (e.g. `unpaid`, `paid`, `partial`).

 - **QR Scan & Validation**
   - Endpoints to record QR scans and validation decisions:
     - `POST /api/orders/:id/scan/validate`
     - `POST /api/orders/:id/scan/reject`
   - These update `scan`-related fields on the `Order` document and may transition the status (e.g. from `pending_approval` to `accepted`).

 - **Fusion/Merging**
   - `POST /api/orders/fuse`
   - Used by staff to merge multiple orders from the same table into a single consolidated order with aggregated items and totals.

 - **Listing**
   - `GET /api/orders`
   - Returns one or more collections of orders (e.g. active vs historical) for the admin dashboard.

 ### Reservations Flow (Backend)

 - `backend/models/Reservation.js` defines fields such as:
   - `reservationId`
   - `customerName`, `customerPhone`, `customerEmail`
   - `table`
   - `partySize`
   - `reservationDate`, `reservationTime`
   - `status` (e.g. pending, confirmed, cancelled, completed)
 - `backend/routes/reservations.js` exposes endpoints to create, list, update, and cancel reservations.
 - **Note**: The main frontend reservation page currently only uses `localStorage` and does not call these APIs, so the reservation backend is effectively unused by the current UI.

 ### Analytics Flow (Backend)

 - `backend/models/Analytics.js` stores daily aggregates:
   - Totals for orders, revenue, reservations, and table usage.
   - Breakdowns by `status` (pending, accepted, preparing, ready, served, cancelled).
 - `backend/routes/analytics.js` provides endpoints for:
   - Daily stats for dashboard/reports.
   - Possibly popular items / revenue per period (depending on implementation).
 - **Issue to note**: The analytics schema does **not** include the order status `pending_approval`, but the order routes attempt to increment `analytics.orders.byStatus[order.status]` when an order is in that state. This can lead to invalid increments (`undefined + 1`) and inconsistent analytics.

 ---

 ## Frontend Architecture

 ### Pages & Layout

 All frontend files live under `public` and are served directly by Express:

 - `public/index.html`
   - Landing page and entry point for table QR scanning.
   - Detects whether the user came from a table QR, then routes them to the menu flow.

 - `public/menu.html`
   - Main customer ordering interface.
   - Displays menu sections (plats, boissons, desserts).
   - Integrates the cart, checkout, and QR ticket flows.

 - `public/reservation.html`
   - Customer reservation form UI.
   - Stores reservations locally (in `localStorage`) rather than calling the backend reservation APIs.

 - `public/admin.html`
   - Admin/staff dashboard.
   - Displays orders grouped by status.
   - Allows actions such as accepting/rejecting orders, updating statuses and payments, scanning/validating customer QR codes, and fusing orders.

 - `public/login.html`
   - Login page for admin/server roles.
   - On success, redirects to the admin dashboard and stores JWT tokens in `sessionStorage`/`localStorage`.

 Additional static/demo content exists in files like `public/static.html` and under `public/clone/`.

 ### JavaScript Modules

 The frontend uses plain `<script>` tags and globals rather than a bundler or module system. Key modules include:

 - `public/js/main.js`
   - Defines `NotificationManager` to show user notifications.
   - Defines `TableDetector` to infer or store the current table (via query parameters and storage).
   - Defines `menuData` with hard-coded menu items (plats, boissons, desserts).

 - `public/js/menu.js`
   - Implements `MenuManager`, responsible for:
     - Rendering menu categories and items.
     - Handling tab switching between categories.
     - Wiring “add to cart” actions to the cart manager.
     - Showing item details in a modal.

 - `public/js/cart.js`
   - Implements `CartManager`, which:
     - Stores cart items in `localStorage`.
     - Computes totals and service fees.
     - Manages the checkout flow (choose payment method, confirm, generate QR).
     - On order confirmation, calls `POST /api/orders` to create an order on the backend.
     - Generates a QR code ticket representing the order, which servers can scan in the admin dashboard.
     - Manages the order-confirmation modal and status display.

 - `public/js/admin-auth.js`
   - Implements `AdminAuthManager`, which:
     - Handles storage and retrieval of JWT tokens and user role.
     - Calls `/api/auth/verify` to validate the token.
     - Clears tokens and redirects on logout.

 - `public/js/admin.js`
   - Implements `AdminManager`, which:
     - Fetches orders via `GET /api/orders`.
     - Renders orders by status into different sections of the admin dashboard.
     - Handles actions: accept/reject/fuse orders, update statuses, update payment status.
     - Integrates with QR scanning:
       - When a QR is scanned, calls `POST /api/orders/:id/scan/validate` or reject endpoints.
     - Keeps frontend state in sync using:
       - `localStorage` (`orderStatusUpdates`).
       - `BroadcastChannel` for cross-tab communication.
     - Uses many `console.log` calls for debugging.

 - `public/js/login.js`
   - Implements `LoginManager`:
     - Handles form submission and calls `POST /api/auth/login`.
     - Stores JWT token and user role in `sessionStorage` or `localStorage` (for “Remember me”).
     - Redirects to the admin dashboard on success.

 - `public/js/reservation.js`
   - Implements `ReservationManager`:
     - Handles the reservation form on `public/reservation.html`.
     - Stores reservations purely on the client using `localStorage`.
     - Does **not** call backend reservation APIs, so reservations never reach the database.

 - `public/js/table-manager.js`
   - Manages restaurant table configuration and associated QR codes.
   - Stores table definitions in `localStorage`.

 - `public/js/order-history.js`
   - Implements `OrderHistoryManager`:
     - Stores and displays a history of past orders in `localStorage` (`restoplus_order_history`).
     - Allows reopening a QR code for a past order.

 - `public/js/qr-scanner-manager.js`
   - Wraps the HTML5 QR code library to provide camera selection and scanning logic.
   - Used in both the admin dashboard and the main app for QR-based flows.

 ### State Management (Frontend)

 State is primarily managed via browser storage and globals:

 - **Authentication**
   - JWT token and user info stored in `sessionStorage` (by default) or `localStorage` (for persistent logins).
   - Keys such as `adminToken` and `adminUser` are used.

 - **Cart & Orders**
   - Cart items: `localStorage.cart`.
   - Order history: `localStorage.restoplus_order_history`.
   - Order status updates: `localStorage.orderStatusUpdates` plus a `BroadcastChannel` to notify other tabs.

 - **Tables**
   - Current table: `localStorage.currentTable` and/or `sessionStorage.scannedTable`.
   - Table configuration: `localStorage.restaurantTables`.

 - **Reservations**
   - Client-side only: `localStorage.restaurantReservations`.

 Because scripts are loaded globally, ordering of `<script>` tags and reliance on `window.*` objects is important and can be fragile.

 ---

 ## Data & Models

 ### Order Model (`backend/models/Order.js`)

 The `Order` schema includes:

 - Identification & context
   - `orderId`: an application-specific identifier (prefixes differ between frontend and backend).
   - `table`: table identifier/name.
   - `mode`: order mode, e.g. `group` or `individual`.
 - Items
   - `items`: array of objects containing fields such as `name`, `quantity`, `unitPrice`, `subtotal`, etc.
 - Totals & payment
   - `total`: total amount (likely in the smallest currency unit or as a float).
   - `paymentMethod`: e.g. cash, card, mobile.
   - `paymentStatus`: e.g. `unpaid`, `paid`, `partial`.
 - Status & lifecycle
   - `status`: one of several states representing the order lifecycle:
     - `pending`, `pending_scan`, `pending_approval`, `accepted`, `preparing`, `ready`, `served`, `cancelled`, etc.
   - Timestamps for creation and updates.
 - QR/scan details
   - `scan` subdocument holding information such as:
     - `firstScannedBy`
     - `lastValidatedBy`
     - Validation timestamps and possibly device info.

 The model defines indexes on fields like `orderId`, `table`, `timestamp`, `status`, and `paymentStatus` to support efficient queries in dashboards and analytics.

 ### Reservation Model (`backend/models/Reservation.js`)

 The `Reservation` schema includes:

 - `reservationId`
 - Customer details: `customerName`, `customerPhone`, `customerEmail`.
 - Table and party details: `table`, `partySize`.
 - Date/time: `reservationDate`, `reservationTime`.
 - `status`: e.g. pending, confirmed, cancelled, completed.

 It defines indexes on date/time, status, and table to support listing/rescheduling efficiently.

 ### Analytics Model (`backend/models/Analytics.js`)

 The `Analytics` schema stores:

 - Basic counts:
   - Number of orders.
   - Total revenue.
   - Reservations and tables counts.
 - Status breakdown:
   - Status buckets for `pending`, `accepted`, `preparing`, `ready`, `served`, `cancelled`.
 - Likely daily snapshots (date-keyed documents).

 **Mismatch**: The analytics status breakdown does **not** include `pending_approval`, even though the order routes can set that status and attempt to increment a corresponding analytics bucket.

 ---

 ## Authentication & Security

 ### Auth Flow

 - **Login**
   - `POST /api/auth/login` expects `username` and `password`.
   - Compares credentials to values from environment variables:
     - `ADMIN_DEFAULT_USER`, `ADMIN_DEFAULT_PASS`
     - `SERVER_DEFAULT_USER`, `SERVER_DEFAULT_PASS`
   - On success, issues a JWT with:
     - Payload containing username and role (`admin` or `server`).
     - Secret read from `JWT_SECRET` (with a default fallback).
     - Expiration (e.g. 24 hours).

 - **Token Verification**
   - Middleware in `backend/middleware/auth.js` validates the `Authorization: Bearer <token>` header.
   - Populates `req.user` with decoded claims and enforces roles:
     - `requireAdmin`
     - `requireServer`
     - `requireAdminOrServer`

 - **On the Frontend**
   - `LoginManager` stores the token and user info in storage and redirects to `/admin.html`.
   - `AdminAuthManager`:
     - Adds the `Authorization` header to admin/staff API calls.
     - Periodically or on load, calls `/api/auth/verify` to ensure the token is valid.
     - Logs the user out if verification fails.

 ### Security Considerations

 **Positive aspects**

 - Clear separation of roles between `admin` and `server` with role-based middleware.
 - JWT-based stateless auth suitable for multi-instance deployments.
 - Admin-only operations (order management, QR validation, fusion) are guarded by auth middleware.

 **Risks / Issues**

 - **Plaintext password comparison**
   - The login route compares the submitted password directly against environment variables.
   - `bcrypt` / `bcryptjs` dependencies exist in `package.json` files but are not used for hashing or verification.
   - This means passwords are effectively stored and checked in plaintext, which is not secure.

 - **Weak default JWT secret**
   - Both the auth route and middleware fall back to a hard-coded secret like `"your-secret-key"` if `JWT_SECRET` is not set.
   - This is insecure in production and makes tokens guessable.

 - **No rate limiting**
   - There is no protection against brute-force login attempts or excessive requests to any endpoint.

 - **Public data exposure**
   - Analytics endpoints under `/api/analytics` are not protected by auth, exposing revenue and other operational metrics.
   - Reservation APIs under `/api/reservations` also lack auth; anyone can list/create/update reservations directly.

 - **Unprotected order creation**
   - `POST /api/orders` is intentionally public so customers can place orders.
   - However, there is no rate limiting, captcha, or basic abuse protection, making it vulnerable to spam or automated abuse.

 - **CORS**
   - `app.use(cors())` is configured with default settings, allowing all origins. This is convenient during development but should be restricted in production.

 - **Credential hints**
   - `backend/env.example` exposes example/default credentials (e.g. `admin123`, `server123`), which are fine as examples but must not be used in production.

 ---

 ## Notable Strengths

 - **End-to-end QR flow**
   - Integration from table QR scanning → menu → order placement → QR ticket → admin QR validation is well thought out.

 - **Clear order lifecycle**
   - The order status model supports a detailed lifecycle with intermediate states (`pending_scan`, `pending_approval`, `preparing`, `ready`, etc.), which allows fine-grained tracking in the admin UI.

 - **Role-based access control**
   - Middleware for `admin` and `server` roles makes it straightforward to protect sensitive endpoints.

 - **Use of Mongoose indexes**
   - Indexes on high-cardinality fields (orderId, table, timestamps, status, paymentStatus) are in place, which is good for performance.

 - **Structured routing**
   - Separate route files for orders, reservations, analytics, and auth make the backend organization easier to navigate and extend.

 - **Client-side synchronization**
   - Use of `localStorage` and `BroadcastChannel` for order status updates allows multiple tabs to stay in sync without a full real-time backend.

 ---

 ## Notable Risks & Technical Debt

 - **Reservation backend not integrated**
   - The reservation UI writes to `localStorage` only and never calls the reservation APIs, so reservations don’t reach the database.
   - Field naming between frontend form and backend schema is not fully aligned.

 - **Analytics model mismatch**
   - The `Analytics` model lacks fields for `pending_approval`, but the order routes attempt to increment analytics counters based on that status.
   - This can cause runtime errors or silently broken analytics.

 - **Menu duplication**
   - Menu data is embedded in `public/js/main.js` instead of being loaded from `backend/data/menu.json` or an API.
   - This makes menu updates more error-prone and duplicates business data between frontend and backend.

 - **Global script coupling**
   - Heavy reliance on global variables (`window.LaKora`, `window.cartManager`, `window.adminAuth`, etc.) and implicit script loading order.
   - Makes refactoring, testing, and scaling the frontend more difficult.

 - **Minor navigation issues**
   - `public/admin.html` contains links that assume paths like `../public/index.html`, which may not match how Express serves static files.

 - **Order ID inconsistencies**
   - Frontend and backend may use different `orderId` prefixes or formats (e.g. `AUD-ORD-` vs `ORD-`), which could be confusing when cross-referencing logs and analytics.

 - **Mocked payment logic**
   - Card/mobile payment flows in the cart are simulated with timeouts and UI feedback only; there is no actual payment provider integration.

 - **Redundant/unused dependencies**
   - Both `bcrypt` and `bcryptjs` appear across `package.json` files, but hashing is not used.
   - `body-parser` is listed even though modern Express has built-in body parsing.

 - **Lack of input validation**
   - Request bodies are not validated with a schema library (e.g. Joi, Zod).
   - This increases the risk of unexpected shapes reaching the database or causing runtime errors.

 - **Logging and observability**
   - Logging is mostly `console.log` sprinkled through the code, without formal levels or structured logging.
   - This can be noisy and not very helpful in production debugging.

 - **Duplicated utility logic**
   - Utility functions such as `formatPrice` appear independently in multiple frontend scripts, leading to duplication and potential inconsistencies.

 ---

 ## Summary

 The current architecture is a classic Node/Express + static frontend setup with clearly separated domains (orders, reservations, analytics, auth) and a feature-rich QR-based ordering flow. The main opportunities for improvement are around **security hardening**, **removing data model mismatches (especially in analytics)**, **integrating reservations end-to-end**, and **reducing duplication and global coupling on the frontend**. Overall, the codebase is a solid foundation for a small-to-medium restaurant app, with clear extension points for future improvements such as real payment integration, stricter auth, and a more modular frontend.

