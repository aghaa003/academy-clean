# أكاديمية البرمجة — Academy

A full-stack Arabic coding academy platform with courses, challenges, community, and AI code review.

## Prerequisites

- **Node.js** 20+ — https://nodejs.org
- **pnpm** — `npm install -g pnpm`
- **MongoDB** — https://www.mongodb.com/try/download/community
  - Install MongoDB Community Edition and ensure `mongod` is available in your PATH

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Backend config — open `artifacts/api-server/.env` and fill in:

```env
PORT=3000
MONGODB_URL=mongodb://127.0.0.1:27017/academy
SESSION_SECRET=change-this-to-a-random-secret-string
OPENAI_API_KEY=your_openai_api_key_here   # Optional: only needed for AI code review
NODE_ENV=development
```

Frontend config — `artifacts/academy/.env` is pre-configured for local dev:

```env
PORT=5173
BASE_PATH=/
VITE_API_URL=http://127.0.0.1:8000/api
```

### 3. Start MongoDB

Make sure MongoDB is running on port 27017 (default). On Windows:

```powershell
# Run as Administrator if needed
mongod --dbpath C:\data\db
```

Or use the MongoDB Compass GUI / Windows Service.

### 4. Run the app

**Option A — Both frontend + backend at once:**

```bash
pnpm run dev
```

**Option B — Separately:**

```bash
# Terminal 1 — Backend (port 3000)
pnpm run dev:backend

# Terminal 2 — Frontend (port 5173)
pnpm run dev:frontend
```

Then open http://localhost:5173 in your browser.

## Default Admin Account

After first run, a default admin account is created automatically:

- **Email:** admin123@gmail.com
- **Password:** admin12345@@

Change the password after first login!

## Project Structure

```
academy/
├── artifacts/
│   ├── academy/          # React + Vite frontend
│   └── api-server/       # Express 5 + MongoDB backend
├── lib/
│   ├── api-client-react/ # Generated React Query hooks
│   ├── api-spec/         # OpenAPI spec + codegen config
│   ├── api-zod/          # Generated Zod schemas
│   └── db/               # Mongoose models + DB connection
└── scripts/              # Utility scripts
```

## Tech Stack

- **Frontend:** React 19, Vite, TailwindCSS, Radix UI, Framer Motion, TanStack Query
- **Backend:** Node.js, Express 5, MongoDB, Mongoose, bcryptjs
- **Language:** TypeScript throughout
- **Package manager:** pnpm workspaces

## Features

- User authentication (register / login / session cookies)
- Courses + video lessons with progress tracking
- Coding challenges with auto-grading
- Community posts with likes and comments
- Repositories / project showcase
- Leaderboard and user profiles
- Admin dashboard with login logs
- AI code review (requires OpenAI API key)
- File uploads (images, videos, PDFs)
