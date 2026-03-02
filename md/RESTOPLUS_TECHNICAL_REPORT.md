# Restoplus Technical Report

**Generated:** February 26, 2026

---

## 1. Application Purpose

Restoplus is a restaurant management web application aimed at small establishments such as "La Kora".
It provides:

- Menu browsing and order creation by customers seated at numbered tables.
- QR‑code based tickets for order validation/approval by staff.
- An administration dashboard where staff (server/admin) can scan, approve/reject, modify and
  track orders as they move through statuses (`pending` → `accepted` → `preparing` → `ready` → `served`).
- Reservation management for table bookings.
- Simple analytics (daily/weekly/monthly) built from orders, payments and reservations.
- Static front‑end pages served from the same Express server.

Although currently a monolithic demo, its code supports essential restaurant workflows without a
payment gateway or real user database.

---

## 2. Technology Stack

| Concern | Technology / Approach |
|---------|----------------------|
| Frontend | Vanilla HTML/CSS/JavaScript, static files under `public/`.
| Backend  | Node.js (14+), Express.js.
| Database | MongoDB via Mongoose ODM; collections: `orders`, `reservations`, `analytics`.
| Authentication | JWT tokens signed with a secret; credentials stored in environment variables (admin/server).
| Storage | Menu stored as `backend/data/menu.json`, assets in `public/`.
| Automation | No cron jobs or scheduled scripts detected.

---

## 3. Data Flow

### Orders
1. Customer selects items in the browser; cart manager generates an `orderId` (`ORD-<timestamp>-xxx`).
2. POST `/api/orders` stores the order. Initial status is `pending_approval`.
3. QR code contains order metadata; staff scans using admin page which calls `/scan/validate` or `/scan/reject`.
4. Status updates propagate via polling from the front‑end (`GET /api/orders/:orderId`) and
   analytics are updated synchronously in the request handler.
5. Admin may change status/payment via protected PATCH endpoints; orders may be fused or deleted.

### Users
- Only two user roles exist: `admin` and `server`.
- Credentials are hard‑coded in environment variables; there is no user collection.
- Authentication is performed against the env values; successful login returns a JWT.
- Token is stored client‑side and attached to `Authorization: Bearer` in subsequent requests.

### Products
- Menu items are read from a static JSON file (`backend/data/menu.json`).
- Frontend embeds this via a global `window.LaKora.menuData` or fetch (depending on page).
- No API exists to modify products in runtime.

### Payments
- The system records a `paymentMethod` enum (`cash`, `card`, `mobile`) and a `paymentStatus`.
- No integration with external payment providers; all payment state is managed manually by admin.

### Attendance
- No explicit attendance or staff tracking mechanism.

---

## 4. Core Business Logic Files

- `backend/models/Order.js` – order schema, indexing, revenue virtual.
- `backend/models/Reservation.js` – reservation schema, status management.
- `backend/routes/orders.js` – API for creating, updating, fusing, scanning and querying orders; analytics update logic.
- `backend/routes/reservations.js` – reservation CRUD and statistics (not yet reviewed but assumed).
- `backend/routes/analytics.js` – dashboard endpoints and aggregated queries.
- `backend/routes/auth.js` & `backend/middleware/auth.js` – authentication and role checks.

These files encapsulate the critical operations that drive the application.

---

## 5. Supporting but Necessary Files

- `backend/app.js` / `backend/server.js` – Express initialization, middleware, DB connection.
- `backend/models/Analytics.js` – schema for pre‑computed daily/weekly/monthly stats.
- `public/js/*` – numerous front‑end helpers (cart, menu, admin UI, login, scanner, etc.).
- HTML pages under `public/`.
- `backend/data/menu.json` – static product catalogue.
- `md/` documentation files.

---

## 6. Unused, Duplicated or Dead Code

- **`routes/routes-tables.js`** defines table CRUD but is never mounted in `app.js` → dead code.
- Duplicate `console.log("POST /orders reached");` lines in `orders.js`.
- Several comments in English/French hints of copy‑paste (e.g. in table routes) which suggest scaffolding left in place.
- `backend/.env` and `env.example` exposures of secrets; no `.gitignore` shown but `.env` is present.

Several front‑end JS files import features (notification manager, table detector) that are defined in the
workspace but may not be used on every page. A global search could yield additional orphaned functions.

---

## 7. Security Risks

1. **Static credentials** – admin/server usernames and passwords stored in plaintext environment variables.
2. **Weak JWT handling** – fallback to hard‑coded secret, no rotation, tokens valid 24h without refresh protection.
3. **No password hashing** – credentials are compared in plain text.
4. **No brute‑force protection or rate limiting** – login endpoint vulnerable.
5. **Missing HTTPS enforcement/CORS controls** – `cors()` called with default allow‑all. Token in transit unprotected.
6. **Lack of input validation/sanitization** – e.g. route parameters and bodies passed directly to Mongoose.
7. **Cross‑site scripting (XSS)** – data from the server is injected into DOM without escaping.
8. **CSRF risks** – no CSRF tokens present despite state‑changing endpoints accessible from the browser.
9. **Exposed development configs** – `.env` committed and used directly.
10. **No authorization on analytics** – routes in `analytics.js` are unprotected.

These issues make the app unsafe for anything beyond an internal demo.

---

## 8. Scalability Issues

- Monolithic Express process; no clustering or horizontal scaling configuration.
- MongoDB connection string hard‑coded, no read/write splitting or sharding.
- Large analytical aggregations executed synchronously on each request; could block under heavy load.
- `updateAnalytics()` invoked on every order change, with no batching; races possible under concurrency.
- Menu and static assets served from the same Node instance; no CDN or static file server.
- No caching layer (Redis, memcached) for frequent read endpoints (`/api/orders/public`).
- Order ID generation using `Date.now()` + random number may collide at high throughput.
- Pagination limits fixed (20/50/100) and many queries download entire collections.
- No indexes on all queried fields – some aggregations rely on scan.

---

## 9. Folder Organization Critiques

- Backend and frontend mixed at the workspace root; better separation (`/backend`, `/frontend`).
- `routes/routes-tables.js` is misnamed (others are singular) and located in `routes` but not referenced.
- Model files sit directly under `models/`; business logic and helpers are intermingled in routes rather than
  extracted into services.
- No `controllers/` directory; route handlers are monolithic.
- Public assets are top‑level; build tools (if any) not configured.
- Documentation in `md/` folder is good but unlinked to code; some markdown appears to be templates for audits.

---

## 10. Professional Production‑Ready Architecture Suggestion

A modern, maintainable transformation would look like:

```
MermaidDiagram
``` (see below)

1. **Separation of Concerns**
   - `api/` service exposing REST (or GraphQL) endpoints with layered controllers/services/repositories.
   - `web/` service or static site (Next.js/Vite/React) built into a CDN or object store.
   - `auth/` service or integration with OAuth2 provider / Identity server.
   - `analytics/` worker that precomputes aggregates asynchronously (e.g. queue + cron).
   - `payments/` microservice calling external gateways.

2. **Infrastructure**
   - Containerized applications orchestrated by Kubernetes / Docker Compose.
   - MongoDB Atlas or managed cluster with replica set, sharding for scale.
   - Redis for caching session tokens and analytics results.
   - NGINX ingress for TLS termination, static file serving.
   - CI/CD pipeline with linting, tests and automated deployments.

3. **Security Hardening**
   - Secrets in vaults (Vault, AWS Secrets Manager).
   - HTTPS everywhere; HSTS, secure cookies, CSP headers.
   - JWT with short lifespan + refresh tokens + revocation list.
   - Input validation with Joi/Zod and ORM sanitization.
   - Audit logging and monitoring (Elasticsearch/Prometheus/Grafana).

4. **Observability & Ops**
   - Structured logging, distributed tracing (OpenTelemetry).
   - Health checks, readiness/liveness probes.
   - Alerting on error rates and latency.

This architecture can scale to hundreds of concurrent users, supports continuous deployments and
complies with security best practices.

---

## Architecture Diagram

```mermaid
flowchart LR
    subgraph Browser
      U[User<br/>(Table, Admin)]
      U -->|interacts| S(Static SPA)
      U -->|POST/GET| API[API Gateway<br/>(Express.js)]
    end

    subgraph API
      API --> AuthSvc[Auth Middleware & JWT]
      API --> OrderSvc[Order Controller/Service]
      API --> ReservationSvc[Reservation Service]
      API --> AnalyticsSvc[Analytics Service]
      API --> MenuSvc[Menu Loader]
    end

    subgraph DataLayer
      OrderSvc --> Mongo[(MongoDB Cluster)]
      ReservationSvc --> Mongo
      AnalyticsSvc --> Mongo
      MenuSvc --> FS[File Storage / CDN]
    end

    AuthSvc -->|verifies token| Redis[(Redis)]
    AnalyticsSvc -->|writes| Queue[(Message Queue)]
    Queue --> Worker[Background Worker]
    Worker --> Mongo

    style Browser fill:#f9f,stroke:#333,stroke-width:1px
    style API fill:#bbf,stroke:#333,stroke-width:1px
    style DataLayer fill:#bfb,stroke:#333,stroke-width:1px

```

---

## Optimization Roadmap

| Timeframe | Focus Areas |
|-----------|-------------|
| **Short‑term (weeks)** | Remove dead code; add missing route mounts; enforce CORS whitelist;
| | add basic input validation; hide secrets; fix duplicate logs; implement simple rate limiting.
| **Mid‑term (months)** | Extract services from routes; add unit/integration tests; introduce caching;
| | migrate menu to DB; build a user collection; separate static build pipeline.
| **Long‑term (6+ months)** | Re‑architect as microservices or modular monolith;
| | deploy on scalable infrastructure; implement full auth flow;
| | incorporate analytics worker, payment integration, monitoring and CI/CD.

---

## Refactoring Plan

1. **Codebase cleanup**
   - Delete unused `routes-tables.js` or integrate properly.
   - Remove duplicated logging and commented scaffolding.

2. **Modularisation**
   - Introduce `controllers/`, `services/` and `models/` directories.
   - Move business logic (analytics update, fusion) out of route handlers.
   - Use a configuration module (`config/index.js`) to centralize env handling.

3. **Data validation**
   - Add request schema validation (Joi/Zod) on all routes.
   - Sanitize user input before persisting.

4. **Authentication/Users**
   - Add a `User` model with hashed passwords (bcrypt) and roles.
   - Replace environment based login with DB lookup.
   - Implement refresh token endpoint with revocation list.

5. **Frontend improvements**
   - Consolidate JS files into a build system (Webpack/Vite); minify assets.
   - Implement CSP and escape server data.
   - Replace polling with web sockets for live order status.

---

## Security Improvement Plan

- Store secrets in a secure vault and remove `.env` from repository.
- Use HTTPS with valid certificates; enforce CORS origins and CSRF tokens.
- Rate‑limit authentication and critical endpoints (e.g. `express-rate-limit`).
- Validate all inputs and use parameterized queries.
- Escape data when injecting into DOM; enable Content Security Policy.
- Hash passwords and store salted hashes. Remove default credentials.
- Protect analytics routes with proper auth middleware.

---

## Performance Improvement Plan

- Add missing MongoDB indexes (`paymentStatus`, `status`, `table`, `timestamp`).
- Cache public order history and menu using Redis or CDN.
- Offload analytics updates to a background queue (Bull/Kue).
- Implement pagination on all large queries; avoid unbounded limits.
- Consider horizontal scaling using Node.js cluster or multiple container replicas.
- Use a dedicated static file server or CDN for frontend assets.
- Monitor query performance with MongoDB Profiler.

---

*This report provides a structured foundation for evolving Restoplus from a proof‑of‑concept into a
secure, scalable, production‑ready SaaS platform.*
