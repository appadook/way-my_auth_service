# WAY Auth Service Deployment (Vercel)

This is a step-by-step checklist to deploy the auth service on Vercel and ensure the deployed domain is used consistently across the service and consumer apps.

---

## 1. Create the Vercel Project

- Push the repo to GitHub (or connect it directly in Vercel).
- Import the project in Vercel.
- Framework preset: **Next.js**
- Build command: `bun run build` (runs `prisma generate` first)
- Install command: `bun install`

---

## 2. Choose the Final Public Domain

After the first deploy, Vercel gives a default domain like:

```
https://way-my-auth-service.vercel.app
```

If you want a custom domain, add it in Vercel → Settings → Domains.

This final domain must be used consistently for:
- `JWT_ISSUER`
- `WAY_AUTH_BASE_URL` in consumer apps
- `WAY_AUTH_JWKS_URL` in consumer apps

---

## 3. Set Environment Variables in Vercel

In Vercel → Project → Settings → Environment Variables:

```
DATABASE_URL
DIRECT_URL
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
JWT_PRIVATE_KEY
JWT_PUBLIC_KEY
JWT_ISSUER          (must match deployed auth domain)
JWT_AUDIENCE
REFRESH_COOKIE_NAME
ADMIN_EMAILS
SIGNUP_SECRET       (optional; if set, required for signup)
```

**Important:**

`JWT_ISSUER` must match the deployed URL exactly (scheme + domain). Example:

```
JWT_ISSUER=https://way-my-auth-service.vercel.app
```

---

## 4. Deploy

Trigger a deploy after setting envs.

---

## 5. Initialize CORS (Admin UI)

CORS allowlist is stored in the database and managed in the admin UI.

1. Open:
   ```
   https://way-my-auth-service.vercel.app/admin/cors
   ```
2. Sign in with an email listed in `ADMIN_EMAILS`
3. Add your frontend origins (examples):
   - `https://your-frontend.vercel.app`
   - `http://localhost:5174`

---

## 6. Configure Consumer Apps

Use the SDK CLI in each consumer app:

```bash
bunx way-auth-setup --base-url https://way-my-auth-service.vercel.app
```

This generates:
- `.env.local`
- `way-auth-setup-guide.md`

Expected env values in the consumer app:

```
WAY_AUTH_BASE_URL=https://way-my-auth-service.vercel.app
WAY_AUTH_ISSUER=https://way-my-auth-service.vercel.app
WAY_AUTH_JWKS_URL=https://way-my-auth-service.vercel.app/api/v1/jwks
```

---

## 7. Verify After Deploy

- Visit `/login`
- Log in with an admin email
- Visit `/admin/cors` and confirm origins
- Visit `/playground` and run a full auth scenario

---

## Common Deployment Pitfalls

- `JWT_ISSUER` mismatch with the deployed domain → tokens won’t validate
- Missing origin in `/admin/cors` → browser calls fail
- Consumer apps using stale base URL → refresh/me fails
