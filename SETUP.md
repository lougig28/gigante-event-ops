# Gigante Event Ops — SETUP

Mobile-first staff operations platform. Event-agnostic, multi-venue. First event:
**White Party 2026** (Thu Jun 18, Lake Isle pool). Built to become the reusable
platform (Tulum 7/18 next).

---

## Spec reconciled ✓

The real spec (`White Party App — Build Spec for Claude Code.md`) + the two
artifacts (`interactive_floorplan_editor.html`, `white-party-spatial-twin.html`)
landed and were reconciled — **built forward, nothing regressed.** Added since:
- **Realistic 2.5D objects** — tables with chairs, wood bars w/ bottle-step,
  parquet dance floor, water pool, cabanas/daybeds (replaces flat boxes; almost-3D).
- **Rich layout** per §6: Main Bar 24ft/12-section + Secondary 16ft, 6 VIP rounds,
  hi-tops, stage, cabanas/daybeds/umbrellas, full door/entry plan — to scale.
- **Run-of-show** reseeded to the real show (ballerina/stilts/sax/CO₂/dinner 5:30);
  **run-of-show ribbon** on the dashboard.
- **86 board** (out-of-stock/cut-off, audited, live) — from the spatial twin.
- **Editor depth**: PNG export, base-opacity ghosting, duplicate, snap-to-6", fit.
- **Staffing** reseeded to §6 call times + named team (Ardit/Ivana/Ismael/John G).
- Playfair serif headers, subtler zones — "quiet luxury."

Backlog (still building forward): toggleable **layers** + role-scoped layer views,
**staff pins** on the map, align-guides + clearance/egress warnings, layout
versioning/clone, phase-aware sheet content. The locked base is the dimensioned
**SVG** rasterized to an aspect-correct high-res PNG (crisp; pure-vector inline-SVG
base is on the backlog).

---

## What's LIVE right now

| Area | Status |
|---|---|
| Hosted app (GitHub Pages) | ✅ https://lougig28.github.io/gigante-event-ops/ |
| Repo (source of truth) | ✅ https://github.com/lougig28/gigante-event-ops |
| Supabase backend (Postgres + RLS + RPC + Realtime) | ✅ project `qrjfykhoekdbhlwxayph` |
| Interactive to-scale floor map (drag/resize/rotate, object library, detail sheets) | ✅ |
| Live dashboard, staffing, side-work, run-of-show | ✅ (DB-backed, realtime) |
| Role share-links (7 roles, scoped, revocable, audited) | ✅ |
| Realtime cross-client sync (broadcast channel) | ✅ |
| Seed: White Party (roster, ROS, tasks, bars, VIP, layout) | ✅ |

## What's STUBBED (needs creds — flagged, non-blocking)

| Connector | State | What it needs | Notes |
|---|---|---|---|
| **Toast** | stubbed | `TOAST_CLIENT_ID`, `TOAST_CLIENT_SECRET` | Clock-in + sales. GUIDs known (Gigante `54df1082-…`, Mulino's `2fb746da-…`). Pattern reused from `md-dashboard-deploy`. |
| **SevenRooms** | stubbed | `SEVENROOMS_CLIENT_ID/SECRET/VENUE_ID` | Reservations / guest list. Direct `2_4` REST (form-urlencoded auth), reused from `sr-daily.js`. |
| **Sling** | stubbed | `SLING_API_TOKEN`, `SLING_ORG_ID` | **No Sling integration exists anywhere** in the Gigante codebase — confirmed. Roster + call times are seeded from the Bar & VIP Briefing. Schedule is the source of truth in Sling; merge pattern (`mergeCrew`) is ready. |
| **Tripleseat** | off | `TRIPLESEAT_CLIENT_ID/SECRET/LOCATION_ID` | Optional for this event. |

**Connector sync is deployed + scheduled.** The `connector-sync` Edge Function
runs every 60s (pg_cron + pg_net), recomputes live rollups, and stamps
`connector_status`. It already contains the real **Toast** (sales) + **SevenRooms**
(reservations/guests) sync code, gated on secrets. **To go live:** set
`TOAST_CLIENT_ID/SECRET` and `SEVENROOMS_CLIENT_ID/SECRET/VENUE_ID` as Edge
Function secrets (Supabase dashboard → Edge Functions → Secrets, or
`supabase secrets set`) — the next cron tick flips them to `live`. Optionally set
`SYNC_KEY` to require an `x-sync-key` header. Sling stays stubbed (no API); live
staff clock-in matching also needs `toast_employee_id` populated (the Sling↔Toast
employee mapping). Connectors run **server-side only** (service role).

## Other open items you can fill in

- **Pool capacity (§7)** — not provided. Currently `null` (shows "—"). Set it in
  Event Settings (or `update events set capacity = N`). I did **not** fabricate a
  safety number.
- **Staff names/phones** — roster is seeded by position + call time (e.g. "Station
  Lead 1"). Real names + phones land when Sling connects (tap-to-call is wired).

---

## Access — share links (White Party 2026)

Open the app with `?t=<token>`. Each role gets its own scoped, revocable link.
Manage/rotate them in-app: **More → Role share links** (owner/manager only).

| Role | Link |
|---|---|
| Owner (Lou) | `…/gigante-event-ops/?t=wp26-owner-3f9a2c` |
| Manager | `…/?t=wp26-mgr-7b1e44` |
| Captain | `…/?t=wp26-capt-9d2a18` |
| Bar Lead | `…/?t=wp26-bar-5c8f31` |
| Staff | `…/?t=wp26-staff-2a7e90` |
| Security | `…/?t=wp26-sec-6f3b21` |
| Read-only | `…/?t=wp26-view-8e4c55` |

Base: `https://lougig28.github.io/gigante-event-ops/`. **Rotate these before going
public** (they're seeded/known) — More → Role share links → revoke + create new.

---

## Costs

- Supabase project `gigante-event-ops`: **$10/month** (Pro compute). Approved as
  part of this build; flag if you want it paused/downgraded.
- GitHub Pages + repo: free.

## Deploy options

- **Live now:** GitHub Pages (auto-deploys on every push to `main` via Actions).
- **Recommended upgrade:** import the repo to **Vercel** (one click) for a clean
  `*.vercel.app` URL + custom domain + private repo support. `vercel.json` (SPA
  rewrites) is already in the repo; it serves at root (no base-path needed).
  Netlify works too (`_redirects` included).

## Run locally

```bash
cd gigante-event-ops
cp .env.example .env.local   # already populated with the live (public) Supabase URL + anon key
npm install
npm run dev                  # http://localhost:5173  (open /?t=wp26-owner-3f9a2c)
```

## Environment

Frontend (public, committed-safe): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
Server-side only (Supabase secrets / Vault — never `VITE_`): the connector creds
above. See `.env.example`.
