# Gigante Event Ops — Implementation Plan & Status

**Goal:** A hosted, mobile-first, realtime staff-ops platform — interactive to-scale
floor map + dashboard + staffing + side-work + role share-links + live connectors —
event-agnostic, starting with White Party 2026.

**Architecture:** React/Vite/TS/Tailwind + react-konva front end on Supabase
(Postgres + RLS + SECURITY DEFINER RPCs + Realtime broadcast). Token-gated RPC
access (no PII via the public anon key). Connectors run server-side (Edge
Functions) and poll → DB → Realtime. Reuses proven Toast/SevenRooms/Tripleseat
patterns from `md-dashboard-deploy`.

---

## Status by phase

- [x] **1. Foundation** — scaffold, brand "night" theme, mobile shell (live clock,
  5-tab nav), shared domain model, seeded views.
- [x] **2. Data model** — 16 tables, enums, audit, `updated_at` triggers; RLS locks
  every table; `event_snapshot` + `app_op` RPCs; generated types.
- [x] **3. Seed** — venue, calibrated floor plan, 6 zones (real pool geometry),
  31-person roster + call times, 14 run-of-show cues, 21 side-work tasks, bars, 4
  VIP, 16-object to-scale layout, metrics, connector status, 7 role tokens.
- [x] **4. Live data + Realtime** — token session, snapshot/op API, Zustand store
  with broadcast channel, `useEventData` hook (live ↔ seed). Dashboard/Staff/Side
  Work render live; staff check-in + task completion write through `app_op`.
- [x] **5. Map** — react-konva canvas, locked base (SVG→PNG at true aspect), white
  paper, pan/pinch/zoom/fit, live zones + to-scale objects, drag-to-persist, scale
  bar, flash-free auto-fit.
- [x] **6. Object library + transforms** — 95-kind catalog by category; tap to drop
  at real-world size; Transformer resize/rotate with live ft/in readout; persists.
- [x] **7. Detail sheets** — tap-through, role-aware: status (editor-settable),
  zone, dimensions, category rules (bar/pool/VIP/stage), staff-in-zone + tap-to-call.
- [x] **8. Roles + share-links + audit** — `share_list`/`share_revoke` RPCs; Share
  sheet (copy/create/revoke per role); every mutation audited.
- [x] **10a. Deploy** — GitHub Pages (Actions); Vercel/Netlify configs included;
  SETUP/PLAN/README.
- [ ] **9. Connectors** — Toast (clock-in + sales), SevenRooms (reservations/guest
  list), Sling stub (roster), Tripleseat — Edge Functions + 30–60s poll → DB →
  Realtime, flip `connector_status` to live. **Blocked on creds; stubbed cleanly.**
- [ ] **10b. Polish backlog** — code-split the map route (bundle size), object
  multi-select, zone editing UI, VIP-table screen, capacity (§7), Sling roster
  merge, reservation guest-list view, push notifications.

## Verified end-to-end (from the real anon browser)

- `event_snapshot` returns correct role per token; rejects bad tokens.
- Add object → `layout_objects` +1 → `audit_log` `obj.create` with actor role.
- Map renders to scale; objects align to the real pool; fit/zoom/pan work.
- Share sheet lists all 7 role links with copyable hosted URLs.

## Notable decisions (made autonomously)

- **RPC-gated + broadcast realtime** instead of public RLS reads — required because
  the anon key ships in the browser and guest PII must not be world-readable.
- **SevenRooms via direct `2_4` REST**, not the slower MCP-via-Anthropic hack.
- **Sling stubbed** — no integration exists anywhere in the Gigante codebase.
- **Floor plan from the dimensioned SVG**, rasterized to an aspect-correct PNG, so
  objects in SVG-unit coords align with the base.
