# CandidateFrontend

**Login + test flow only.** No dashboard, no practice, no jobs – only auth and candidate test APIs/routes.

- **Port:** 4003 (dev)
- **Routes:** `/`, `/login`, `/forgot-password`, `/test/email`, `/instructions`, `/permissions`, `/round-1` … `/round-4`, `/completion`
- **API usage:**
  - **Auth API** (`authAxiosInstance`) – login, OTP, register, refresh, forgot-password
  - **Candidate backend** (`axiosInstance`) – test status, submit, assessment summary, coding
  - **Admin backend** (`adminAxiosInstance`) – instructions, positions, question sets/sections, verify, set-test-started

## Run

```bash
npm run dev
```

## Env

See `.env`:

- `VITE_AUTH_API_URL` – SuperadminBackend (auth)
- `VITE_ADMIN_API_URL` – Admin (instructions, positions)
- `VITE_API_BASE_URL` – Candidate backend
- `VITE_AI_BACKEND_URL` – Streaming AI / WebSocket

## Split from CandidateTest

- **CandidateFrontend (this app):** Login + test-related API calls and routes only.
- **CandidateTest:** Dashboard, home, practice, jobs, resume, profile, etc. (portal only).
# CandidateFrontend
