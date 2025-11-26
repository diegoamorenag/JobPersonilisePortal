# TASK.md

## Current Objective

Bootstrap the Express/MongoDB API with foundational infrastructure.

---

## Tasks

### 2. App Entry Point
- [ ] Create `app.js` — Express app setup (middleware registration, route mounting)
- [ ] Create `server.js` — Server bootstrap, DB connect, graceful shutdown

### 3. Base Middleware
- [ ] `middleware/errorHandler.js` — Centralized async error handler
- [ ] `middleware/notFound.js` — 404 catch-all
- [ ] `middleware/requestLogger.js` — Basic request logging (method, path, status, duration)

### 4. Utility Layer
- [ ] `utils/AppError.js` — Custom error class with status code
- [ ] `utils/asyncHandler.js` — Wrapper to catch async errors in controllers
- [ ] `utils/responseFormatter.js` — Standardized JSON response helper

### 5. Health Check Endpoint
- [ ] `routes/health.js` — `GET /health` returning `{ status: 'ok', timestamp, uptime }`
- [ ] Mount in `app.js`

### 7. Scripts & Dev Setup
- [ ] Add npm scripts: `start`, `dev` (nodemon), `test`
- [ ] Verify nodemon restarts on file changes

---

## Acceptance Criteria

- [ ] `npm run dev` starts server, connects to MongoDB, logs success
- [ ] `GET /health` returns 200 with JSON payload
- [ ] Invalid routes return 404 with structured error
- [ ] Thrown errors caught by errorHandler, return 500 with message (no stack in prod)
- [ ] Example CRUD endpoints functional against MongoDB

---

## Notes

- Keep controllers thin—delegate to services
- Repositories abstract Mongoose calls; services shouldn't import models directly
- Fail fast: if DB connection fails on startup, exit with non-zero code
