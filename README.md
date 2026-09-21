# Snowball — Compound Interest Calculator

Watch small deposits compound into wealth. A Next.js + React + TypeScript app with
compound / daily / simple interest modes, 6 currencies, an interactive growth chart,
a time scrubber, and a year-by-year breakdown with CSV export.

## Prerequisites

- **Node.js 20+** (LTS recommended — [nodejs.org](https://nodejs.org))
- npm comes bundled with Node

Check yours:

```bash
node -v   # should print v20.x or higher
npm -v
```

## Install & run

```bash
# 1. Get the project files onto your machine
#    (download the `snowball` folder from your workspace)

# 2. Move into it
cd snowball

# 3. Install dependencies (one time only)
npm install

# 4. Start the development server
npm run dev
```

Then open **http://localhost:3000** in your browser. That's it.

## Other commands

| Command         | What it does                              |
| --------------- | ----------------------------------------- |
| `npm run dev`   | Start dev server with hot reload (`:3000`) |
| `npm run build` | Create an optimised production build      |
| `npm start`     | Run the production build (after `build`)   |
| `npx tsc --noEmit` | Type-check the project                  |

## Deploy it (optional)

The easiest way to get a public link is Vercel (free, built for Next.js):

1. Put the `snowball` folder in a GitHub repo
2. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import the repo
3. Click **Deploy** — no settings to change

## Project layout

```
app/            # Pages + global styles (Next.js App Router)
components/     # Chart, table, inputs, currency + segmented controls
hooks/          # Animated number tweening
lib/            # Interest maths (compound.ts) + currencies (currency.ts)
```
