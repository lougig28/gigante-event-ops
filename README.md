# Gigante Event Ops

Mobile-first staff operations platform for Gigante Hospitality. Event-agnostic and
multi-venue — the first event is **White Party 2026** (Lake Isle pool).

**Live:** https://lougig28.github.io/gigante-event-ops/ · open with a role link, e.g.
`/?t=wp26-owner-3f9a2c` (see [SETUP.md](SETUP.md)).

## What it does

- **Interactive to-scale floor map** (react-konva) — locked dimensioned base plan,
  calibrated (0.028040 ft/unit, ±0.56% from CubiCasa dimension lines), pan/pinch/
  zoom, a full to-scale object library (95 kinds), drag/resize/rotate with a live
  ft/in readout, and tap-through role-aware detail sheets (the map is the floor's
  information hub).
- **Live dashboard** — run-of-show now/next, sales/drinks/guests/VIP, staff
  check-in, side-work progress, connector status.
- **Staffing** — roster by zone, call times, live check-in (tap-to-toggle), tap-to-call.
- **Side work** — opening/running/closing checklists with live completion.
- **Roles + share links** — 7 roles, scoped, revocable, every edit audited.
- **Realtime** — every change syncs across all clients within seconds.

## Stack

React 19 · Vite · TypeScript · Tailwind v4 · react-konva · Zustand · TanStack Query
· Supabase (Postgres + RLS + SECURITY DEFINER RPCs + Realtime broadcast). Deployed
on GitHub Pages (Vercel/Netlify configs included).

## Architecture (short)

- All data access is **token-gated via RPCs** — `event_snapshot` (read) and
  `app_op` (audited write dispatcher). RLS denies direct table access, so the
  public anon key can't read PII; a per-role share token gates everything.
- **Realtime** rides a per-event Supabase **broadcast** channel (no table data on
  the wire) so no-login floor staff stay in sync.
- The frontend runs **live** with a token and falls back to an offline **seed**
  (handy when poolside connectivity drops).

See [SETUP.md](SETUP.md) for status, connectors, costs, and deploy; `docs/PLAN.md`
for the phased plan.

## Develop

```bash
npm install
npm run dev     # open /?t=wp26-owner-3f9a2c
npm run build
```
