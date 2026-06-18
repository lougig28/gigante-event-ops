# Gigante Event Ops — SETUP

Mobile-first staff operations platform. Event-agnostic, multi-venue. First event:
**White Party 2026** (Thu Jun 18, Lake Isle pool). Built to become the reusable
platform (Tulum 7/18 next).

---

## ⚠️ Read first — the spec file

The brief pointed to `White Party App — Build Spec for Claude Code.md`, but that
file is **not on disk anywhere** (searched by name, by content tokens — §2A,
ft-per-pixel, AllSeated/Prismm — and every plausible folder). Per your standing
instruction ("never let a question stop you… make the best call"), I treated your
written brief + the real assets as the source of truth and reconstructed the
§-structure from them. **If you have a richer spec, drop it in and I'll reconcile
(ratchet-forward — nothing already built gets simplified away).**

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

Connector Edge Functions are the next build step (#9). They'll poll 30–60s →
write DB → Realtime push, and flip `connector_status` to `live`. Set secrets via
`supabase secrets set …` (Vault) — connectors run **server-side only**.

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
