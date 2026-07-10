# IronLog — Workout Tracker

A workout tracking web app built with React, TypeScript, Vite, and Tailwind CSS. All data is stored locally in the browser (no backend required).

## Features

- **Dashboard** — total workouts, current streak, workouts this week, and weekly training volume, plus a list of recent sessions.
- **Log Workout** — start a session, add exercises from the library, and record sets (reps, weight, unit) per exercise.
- **History** — browse past workout sessions, expand to see set-by-set detail, delete sessions.
- **Progress** — per-exercise charts of max weight and total volume over time.
- **Exercises** — a library of default exercises across muscle groups, with the ability to add custom exercises and filter by muscle group.

## Getting Started

```bash
npm install
npm run dev
```

Then open the printed local URL in your browser.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build
- `npm run lint` — run oxlint

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- React Router
- Recharts (progress charts)
- Browser `localStorage` for persistence
