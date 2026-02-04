# Authentication Service – Product Requirements Document (PRD)


## 1. Purpose & Scope

This Project is WAY Auth, WAY stands for Who You Are and a **standalone authentication microservice** that provides:

- Secure user authentication using **email + password**
- Stateless **JWT-based access tokens**
- Secure **session management** using refresh tokens
- A **public JWKS endpoint** for token verification
- A clean HTTP API usable by **any frontend or backend**, regardless of language or framework

The service is intentionally:
- **Framework-agnostic**
- **Backend-agnostic**
- **Low-traffic friendly**
- Designed for **personal projects** and learning, but architected correctly

This service is **not** responsible for:
- Application-specific authorization logic
- Realtime features
- Domain data (messages, documents, etc.)

Those belong to downstream services (e.g., Convex, REST APIs).

---

## 2. Non-Goals (Explicitly Out of Scope)

To keep v1 small and correct, this service will **not** implement:

- OAuth/OIDC redirect flows
- Social login (Google, GitHub, etc.)
- SSO / enterprise features
- Magic links
- MFA
- UI pages (login forms live in client apps)

The API is **purely programmatic**.

---

## 3. High-Level Architecture

```
Client (Web / Mobile / Server)
        |
        | HTTP + JSON
        v
Auth API (Vercel, Node runtime)
        |
        | Prisma ORM
        v
Neon Postgres
        |
        | Session / Rate-limit state
        v
Upstash Redis
```

---

## 4. Technology Stack

- **Hosting / Compute**: Vercel (Node.js runtime)
- **Database**: Neon Postgres
- **ORM**: Prisma
- **JWT / Crypto**: jose (RS256)
- **Cache / Rate limiting**: Upstash Redis

---

## 5. Setup & Getting Started

### 5.1 Local Project Initialization

```bash
npx create-next-app@latest auth-service
cd auth-service
```

Ensure **Node.js ≥ 18**.

---

### 5.2 Neon Postgres Setup

1. Create a Neon project and database.
2. Copy **two connection strings**:
   - **Pooled connection** (for runtime)
   - **Direct connection** (for migrations)

Add to `.env.local`:

```bash
DATABASE_URL="postgresql://<pooled-connection>"
DIRECT_URL="postgresql://<direct-connection>"
```

---

### 5.3 Prisma Setup

```bash
npm install -D prisma
npm install @prisma/client
npx prisma init
```

After defining your schema:

```bash
npx prisma migrate dev
npx prisma generate
```

---

### 5.4 Upstash Redis Setup

1. Create an Upstash Redis database (or via Vercel Marketplace).
2. Copy REST credentials.

Add to `.env.local`:

```bash
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
```

Install dependencies:

```bash
npm install @upstash/redis @upstash/ratelimit
```

---

### 5.5 JWT Key Setup

Generate RSA keys (example):

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

Store:
- `private.pem` securely (env / secrets manager)
- Expose public key via `/v1/jwks`

---

## 6. Public API Overview

- `POST /v1/signup`
- `POST /v1/login`
- `POST /v1/refresh`
- `POST /v1/logout`
- `GET  /v1/jwks`

---

## 7. Security Requirements

- Passwords hashed with bcrypt or argon2id
- Refresh tokens stored hashed
- Refresh token rotation enabled
- HttpOnly, Secure cookies
- CORS enforced per client app
- Rate limiting via Upstash

---

## 8. Integration Notes

### Convex
- Configure Convex with `customJwt`
- Point JWKS to `/v1/jwks`
- Use `sub` as userId

### Frontend Apps
- Access token stored in memory
- Refresh via cookie on 401
- Retry request with new token

---

## 9. Deployment (Vercel)

Set environment variables in Vercel:
- `DATABASE_URL`
- `DIRECT_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- JWT keys / issuer values

Redeploy after env changes.

---

## 10. Future Extensions

- Email verification
- Password reset
- OIDC compatibility
- Social login

---

## 11. Guiding Principles

1. JWTs authenticate, apps authorize
2. Stateless where possible, revocable where required
3. Correctness before convenience
4. Easy to integrate, hard to misuse
