# Planning

## Project Overview

Node.js/Express REST API with MongoDB persistence layer following MVC architecture.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB |
| ODM | Mongoose |
| Dev Server | Nodemon |
| HTTP Client | Axios (for external API calls) |
| Environment | dotenv |

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Routes    │────▶│ Controllers │────▶│  Services   │────▶│   Models    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                                       │
                    ┌──────┴──────┐                               ▼
                    │ Middleware  │                          ┌─────────┐
                    └─────────────┘                          │ MongoDB │
                                                             └─────────┘
```

**Directory Responsibilities:**
- `routes/` — Route definitions, maps endpoints to controllers
- `controllers/` — Request/response handling, input validation
- `services/` — Business logic, orchestration
- `repositories/` — Data access layer, Mongoose queries
- `models/` — Mongoose schemas and model definitions
- `middleware/` — Auth, error handling, logging, rate limiting
- `config/` — Environment config, DB connection settings
- `utils/` — Shared helpers, constants

## Scope

### Phase 1: Foundation
- Project scaffolding and configuration
- Database connection setup
- Base error handling middleware
- Health check endpoint

### Phase 2: Core API
- Define domain models
- Implement CRUD operations
- Add authentication/authorization
- Input validation

### Phase 3: Hardening
- Comprehensive error handling
- Logging infrastructure
- Rate limiting
- Security headers (helmet)

### Phase 4: Production Readiness
- API documentation (Swagger/OpenAPI)
- Integration tests
- CI/CD pipeline
- Containerization (Docker)

## Conventions

- **Naming:** camelCase for files/variables, PascalCase for models/classes
- **Async:** async/await with try-catch, centralized error handler
- **Responses:** Consistent JSON envelope: `{ success, data, error, meta }`
- **Status Codes:** RESTful (200, 201, 400, 401, 403, 404, 500)
- **Validation:** Validate at controller layer before service calls