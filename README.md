# MomsCare – Pregnancy Health Companion

Full-stack web app for pregnant mothers with AI guidance (Groq), doctor Q&A, reminders, and Cloudflare R2 uploads. Frontend is static (HTML/CSS/JS) ready for Netlify; backend is Node.js + Express + MongoDB for Render/Railway.

## Quick Start (local)
1. Install deps: `npm install`
2. Copy `.env.example` to `.env` and fill values.
3. Run backend: `npm run dev` (serves API + static frontend).
4. Open `http://localhost:5000` to use the site.

## Environment
See `.env.example` for required variables:
- `PORT` – server port
- `MONGO_URI` – MongoDB connection string
- `JWT_SECRET` – JWT signing key
- `GROQ_API_KEY` – Groq model key
- Cloudflare R2: `CF_ENDPOINT`, `CF_BUCKET`, `CF_ACCESS_KEY`, `CF_SECRET_KEY`

## Deploy
- **Frontend (Netlify)**: deploy `frontend/` as static site. Set `window.BACKEND_URL_OVERRIDE` in a small `<script>` or Netlify env injection to point to your backend URL.
- **Backend (Render/Railway)**: deploy `npm start` with env vars and build `npm install`. Ensure `PORT` matches service config and CORS allows frontend origin.
- **GitHub**: connect repository `https://github.com/dev-fuadhasan/buildathon` then hook Render/Railway/Netlify to it.

## API Overview
- Auth: `POST /auth/register/mother`, `POST /auth/register/doctor`, `POST /auth/login`
- Mother: `GET/PUT /mother/profile`, `POST /mother/questions`, `GET /mother/questions`, `POST /mother/reminders`, `GET /mother/reminders`, `GET /mother/uploads`
- Doctor: `GET /doctor/status`, `GET /doctor/questions`, `POST /doctor/answers`, `PUT /doctor/availability`, `GET /doctor/mother/:id`
- Admin: `GET /admin/doctors`, `POST /admin/doctors/:id/approve|reject`, `GET /admin/mothers`, `GET /admin/questions`, `DELETE /admin/questions/:id`
- Chatbot: `POST /chatbot/ask`
- Upload: `POST /upload/prescription` (multer + R2)

## Data Models
- `User` (mother/doctor/admin with profile fields + hashed password)
- `Doctor` (linked to User, approval status, availability)
- `Question` + `Answer` (doctor responses)
- `Reminder` (doctor_visit/supplement/growth_update)
- `Upload` (R2 files: prescriptions/reports/avatar)

## Security Notes
- Passwords hashed with bcrypt.
- JWT guard + role check middleware.
- Never commit secrets; store all keys in environment.

## Cloudflare R2 Keys
Follow Cloudflare Dashboard → R2 → Manage API Tokens → Create token with required permissions (`r2:objects:read/write/delete`, `r2:bucket:read`). Save keys to env variables; do not hardcode.

## Frontend Usage
- Home page includes signup/login forms; tokens stored in `localStorage`.
- Mother dashboard: ask doctors, reminders, upload prescriptions, profile viewer.
- Doctor dashboard: view questions, reply, set availability (needs admin approval).
- Admin dashboard: approve/reject doctors, view/delete questions, view mothers.

## Testing Checklist
- `npm run dev` then hit `/health`
- Create mother + login; submit question; add reminder; upload file (requires configured R2)
- Doctor signup; ensure pending; admin approves; doctor answers question
- Chatbot page returns Groq reply with valid key

