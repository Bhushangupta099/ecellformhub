# FormWebEcell

A modern, **React‑Start** based web application for managing event registrations, data collection and dashboards for eCell (entrepreneurship cell) activities.

---

## 🚀 Overview

- **Tech stack**: React‑Start (TanStack Router & Query), TypeScript, TailwindCSS, Supabase authentication,
- **UI**: Tailwind + Radix UI components, Lucide icons, responsive design.
- **Features**
  - Public landing page with a video background.
  - Authenticated dashboard with navigation (Home, Dashboard, Settings, Log out).
  - Settings page – password reset, OTP flow, and profile management.
  - Data export to Excel (`xlsx`).
  - Charts with Recharts and date pickers via `react-day-picker`.

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js** (≥ 20) and **npm** (or **pnpm** – see note below).
- A **Supabase** project (for auth & database). Create a `.env` file based on `.env.example` with your Supabase keys.

### Install dependencies

```bash
# Using npm (default)
npm install
# Or using pnpm (recommended for speed)
pnpm install   # <-- runs *outside* the sandbox automatically
```

### Run the development server

```bash
npm run dev   # starts Vite on http://localhost:8081 (or port 5173 by default)
```

The app will auto‑reload on code changes.

---

## 📦 Scripts (from `package.json`)

| Script | Description |
|--------|-------------|
| `dev` | Start Vite dev server |
| `build` | Production build |
| `build:dev` | Build in development mode |
| `preview` | Preview the production build locally |
| `lint` | Run ESLint over the codebase |
| `format` | Run Prettier to format all files |

---

## ⚙️ Environment Variables

Create a `.env` file at the project root (copy from `.env.example`). Typical variables:

```properties
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Add any additional variables required by your Supabase functions.

---

## 📂 Project Structure (high‑level)

```
src/
│   ├─ components/          # Re‑usable UI components (Button, Logo, etc.)
│   ├─ routes/              # TanStack Router routes – public & _authenticated
│   │    ├─ _authenticated/  # Protected layout & pages (dashboard, settings)
│   │    └─ __root.tsx       # Layout with video background
│   ├─ integrations/        # Supabase client wrapper
│   └─ lib/                 # Helper utilities (validation, API wrappers)
public/
    └─ rocket-bg.mp4        # Background video used on the landing page
```

---

## 🔧 Adding a Home Link (already implemented)

The navigation header now includes a **Home** button that points to the public landing page (`/`).
The relevant change lives in `src/routes/_authenticated/route.tsx` and places the Home button before the Dashboard button using the same Tailwind styling.

---

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/awesome‑thing`).
3. Install dependencies and run tests/lint.
4. Submit a pull request with a clear description of your changes.

All contributions are welcome – especially improvements to UI/UX, accessibility, and new integrations.

---

## 📄 License

This project is licensed under the **MIT License** – see the `LICENSE` file for details.

---


