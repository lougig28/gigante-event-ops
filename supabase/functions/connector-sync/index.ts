// Gigante Event Ops — connector sync (Toast sales/drinks + SevenRooms reservations).
// Deployed to Supabase Edge Functions; invoked every 60s by pg_cron (see migrations).
// Secrets (Supabase → Edge Functions → Secrets): TOAST_CLIENT_ID, TOAST_CLIENT_SECRET,
// optional TOAST_RESTAURANT_GUID; SEVENROOMS_CLIENT_ID/SECRET/VENUE_ID; optional SYNC_KEY.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const DEFAULT_GUID = "54df1082-cbd6-4fc2-9cc2-9b64d9d6c5a6"; // Gigante R&B

// Business date in the restaurant's timezone (ET) — NOT UTC — so the 8pm–1am
// party window (which crosses midnight UTC) maps to the right Toast day.
function etToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// ── Name matching (Toast employee names → our Sling roster) ──────────────────
// SR/Toast spell names many ways; canonicalize first names + match on
// first + last-initial, tolerating single-initial first names ("G Mayorga").
const NICK: Record<string, string> = {
  danny: "daniel", dan: "daniel", fab: "fabrisio", fabricio: "fabrisio",
  gabby: "gabriella", gabi: "gabriella", chris: "christopher", topher: "christopher",
  mike: "michael", liz: "elizabeth", tony: "anthony", alex: "alexandra",
  nick: "nicholas", will: "william", tianna: "tianna",
};
function parseName(n: string) {
  const p = String(n || "").toLowerCase().replace(/[.,]/g, "").trim().split(/\s+/).filter(Boolean);
  const first = p[0] ?? "";
  const last = p.length > 1 ? p[p.length - 1] : "";
  return { first, last, fi: first[0] ?? "", li: last[0] ?? "" };
}
function nameMatch(rosterName: string, toastName: string): boolean {
  const s = parseName(rosterName);
  const t = parseName(toastName);
  const sf = NICK[s.first] ?? s.first;
  const tf = NICK[t.first] ?? t.first;
  const firstOk =
    sf === tf ||
    (s.first.length === 1 && s.fi === t.fi) ||
    (t.first.length === 1 && t.fi === s.fi);
  if (!firstOk) return false;
  if (!s.last || !t.last) return true; // single-name roster entry → first-name match is enough
  return s.last === t.last || s.li === t.li;
}

async function syncToast(
  eventDate?: string,
): Promise<{ state: string; message: string; netSales?: number; drinks?: number }> {
  const id = Deno.env.get("TOAST_CLIENT_ID");
  const secret = Deno.env.get("TOAST_CLIENT_SECRET");
  const guid = (Deno.env.get("TOAST_RESTAURANT_GUID") || DEFAULT_GUID).trim();
  if (!id || !secret) return { state: "stubbed", message: "Awaiting creds" };
  const biz = (eventDate || etToday()).replaceAll("-", "");
  try {
    const res = await fetch("https://ws-api.toasttab.com/authentication/v1/authentication/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: id.trim(), clientSecret: secret.trim(), userAccessType: "TOAST_MACHINE_CLIENT" }),
    });
    const auth = await res.json().catch(() => ({}));
    const token = auth?.token?.accessToken ?? auth?.accessToken;
    if (!res.ok || !token) return { state: "error", message: `Toast auth failed (HTTP ${res.status})` };
    const h = { Authorization: `Bearer ${token}`, "Toast-Restaurant-External-ID": guid };
    const cfgRes = await fetch(`https://ws-api.toasttab.com/restaurants/v1/restaurants/${guid}`, { headers: h });
    const cfg = await cfgRes.json().catch(() => ({}));
    const rname = cfg?.general?.name ?? cfg?.name ?? null;
    if (!cfgRes.ok)
      return { state: "error", message: `Creds can't access restaurant ${guid.slice(0, 8)}… (HTTP ${cfgRes.status}) — set TOAST_RESTAURANT_GUID` };
    const orders = await fetch(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk?businessDate=${biz}&pageSize=100`,
      { headers: h },
    )
      .then((r) => r.json())
      .catch(() => []);
    let net = 0,
      n = 0,
      items = 0;
    for (const o of Array.isArray(orders) ? orders : []) {
      n++;
      for (const c of o.checks ?? []) {
        net += c.totalAmount ?? 0;
        items += c.selections?.length ?? 0;
      }
    }
    return { state: "live", message: `${rname ?? "restaurant"} · ${n} orders (${biz})`, netSales: Math.round(net), drinks: items };
  } catch (e) {
    return { state: "error", message: String(e).slice(0, 140) };
  }
}

async function syncSevenRooms(
  eventId: string,
  sb: any,
  eventDate?: string,
): Promise<{ state: string; message: string; guestsIn?: number; booked?: number; debug?: string }> {
  const id = Deno.env.get("SEVENROOMS_CLIENT_ID");
  const secret = Deno.env.get("SEVENROOMS_CLIENT_SECRET");
  const venue = Deno.env.get("SEVENROOMS_VENUE_ID");
  if (!id || !secret || !venue) return { state: "stubbed", message: "Awaiting creds" };
  try {
    const auth = await fetch("https://api.sevenrooms.com/2_4/auth", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `client_id=${encodeURIComponent(id.trim())}&client_secret=${encodeURIComponent(secret.trim())}`,
    }).then((r) => r.json());
    const token = auth?.data?.token;
    if (!token) return { state: "error", message: "SR auth failed" };
    const day = eventDate || etToday();
    const res = await fetch(
      `https://api.sevenrooms.com/2_4/reservations?venue_id=${venue.trim()}&from_date=${day}&to_date=${day}&limit=400`,
      { headers: { Authorization: token } },
    ).then((r) => r.json());
    const rows =
      res?.data?.results ?? res?.data?.reservations ?? res?.results ?? (Array.isArray(res?.data) ? res.data : []);
    let arrived = 0,
      inserted = 0,
      firstErr = "";
    for (const r of rows) {
      const status = String(r.status ?? "").toLowerCase();
      const pax = Number(r.max_guests ?? r.party_size ?? r.guests ?? 0) || 0;
      if (status.includes("arriv") || status.includes("seat")) arrived += pax;
      const fallback = `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim();
      const atRaw = r.arrival_time ?? r.estimated_arrival_time ?? null;
      let arrival: string | null = null;
      if (typeof atRaw === "string" && atRaw) {
        const d = /\d{4}-\d{2}-\d{2}/.test(atRaw) ? new Date(atRaw) : new Date(`${day} ${atRaw}`);
        if (!isNaN(d.getTime())) arrival = d.toISOString();
      }
      const rec = {
        event_id: eventId,
        external_id: String(r.id ?? r.reference_code ?? r.reservation_id ?? `sr-${inserted}-${Date.now()}`),
        source: "sevenrooms",
        guest_name: (r.full_name ?? fallback) || "Guest",
        party_size: pax,
        arrival_time: arrival,
        status: r.status ?? null,
        table_assignment: Array.isArray(r.table_numbers) ? r.table_numbers.join(", ") : null,
        vip: !!r.is_vip,
        updated_at: new Date().toISOString(),
      };
      const { error } = await sb.from("reservations").upsert(rec, { onConflict: "external_id" });
      if (error) {
        if (!firstErr) firstErr = error.message;
      } else inserted++;
    }
    return { state: "live", message: `${rows.length} booked · ${inserted} saved`, guestsIn: arrived, booked: rows.length, debug: firstErr };
  } catch (e) {
    return { state: "error", message: String(e).slice(0, 140) };
  }
}

// Live clock-in from Toast Labor: who is on the clock right now → set our roster's
// check_in. Matches Toast employees to our seeded staff by name.
async function syncToastCrew(
  sb: any,
  eventId: string,
  eventDate?: string,
): Promise<{ state: string; message: string; onClock?: number; matched?: number }> {
  const id = Deno.env.get("TOAST_CLIENT_ID");
  const secret = Deno.env.get("TOAST_CLIENT_SECRET");
  const guid = (Deno.env.get("TOAST_RESTAURANT_GUID") || DEFAULT_GUID).trim();
  if (!id || !secret) return { state: "stubbed", message: "Awaiting Toast creds" };
  const day = eventDate || etToday();
  try {
    const res = await fetch("https://ws-api.toasttab.com/authentication/v1/authentication/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: id.trim(), clientSecret: secret.trim(), userAccessType: "TOAST_MACHINE_CLIENT" }),
    });
    const auth = await res.json().catch(() => ({}));
    const token = auth?.token?.accessToken ?? auth?.accessToken;
    if (!res.ok || !token) return { state: "error", message: `Toast auth failed (HTTP ${res.status})` };
    const h = { Authorization: `Bearer ${token}`, "Toast-Restaurant-External-ID": guid };

    const startISO = `${day}T00:00:00.000-04:00`;
    const endISO = `${day}T23:59:59.999-04:00`;
    const teRes = await fetch(
      `https://ws-api.toasttab.com/labor/v1/timeEntries?startDate=${encodeURIComponent(startISO)}&endDate=${encodeURIComponent(endISO)}`,
      { headers: h },
    );
    const entries = await teRes.json().catch(() => null);
    if (!teRes.ok) return { state: "error", message: `Toast labor unavailable (HTTP ${teRes.status}) — enable Labor scope` };
    if (!Array.isArray(entries)) return { state: "error", message: "Toast labor: unexpected response" };

    // Resolve employee GUIDs → names (paginated).
    const empById: Record<string, string> = {};
    for (let page = 1; page <= 6; page++) {
      const emps = await fetch(`https://ws-api.toasttab.com/labor/v1/employees?pageSize=100&page=${page}`, { headers: h })
        .then((r) => r.json())
        .catch(() => []);
      if (!Array.isArray(emps) || emps.length === 0) break;
      for (const e of emps) empById[e.guid] = `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim();
      if (emps.length < 100) break;
    }

    // On-shift = has an inDate today and no outDate.
    const onClock: { name: string; inAt: string }[] = [];
    for (const te of entries) {
      const g = te?.employeeReference?.guid;
      const name = g ? empById[g] : "";
      if (name && te.inDate && !te.outDate) onClock.push({ name, inAt: te.inDate });
    }

    const { data: staff } = await sb.from("staff").select("id, name, check_in").eq("event_id", eventId);
    let matched = 0;
    for (const s of staff ?? []) {
      const hit = onClock.find((c) => nameMatch(s.name, c.name));
      if (hit) {
        matched++;
        if (s.check_in !== "checked_in")
          await sb.from("staff").update({ check_in: "checked_in", check_in_at: hit.inAt }).eq("id", s.id);
      } else if (s.check_in === "checked_in") {
        // clocked out since last sync → revert to scheduled
        await sb.from("staff").update({ check_in: "scheduled", check_in_at: null }).eq("id", s.id);
      }
    }
    return { state: "live", message: `${onClock.length} on the clock · ${matched} matched (Toast)`, onClock: onClock.length, matched };
  } catch (e) {
    return { state: "error", message: String(e).slice(0, 140) };
  }
}

Deno.serve(async (req) => {
  const syncKey = Deno.env.get("SYNC_KEY");
  if (syncKey && req.headers.get("x-sync-key") !== syncKey)
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const out: Record<string, unknown> = {};
  const { data: events } = await sb.from("events").select("id, date").in("status", ["scheduled", "live"]);
  for (const ev of events ?? []) {
    const id = ev.id;
    const cnt = async (table: string, col?: string, val?: string) => {
      let q = sb.from(table).select("*", { count: "exact", head: true }).eq("event_id", id);
      if (col && val) q = q.eq(col, val);
      const { count } = await q;
      return count ?? 0;
    };
    const toast = await syncToast(ev.date);
    const sr = await syncSevenRooms(id, sb, ev.date);
    const crew = await syncToastCrew(sb, id, ev.date); // updates staff.check_in from Toast clock-ins
    const [staffSched, checkedIn, tasksTotal, tasksDone] = await Promise.all([
      cnt("staff"),
      cnt("staff", "check_in", "checked_in"),
      cnt("tasks"),
      cnt("tasks", "status", "done"),
    ]);
    const patch: Record<string, unknown> = {
      staff_scheduled: staffSched,
      staff_checked_in: checkedIn,
      tasks_total: tasksTotal,
      tasks_done: tasksDone,
      as_of: new Date().toISOString(),
    };
    if (toast.netSales != null) patch.net_sales = toast.netSales;
    if (toast.drinks != null) patch.drink_count = toast.drinks;
    if (sr.guestsIn != null) patch.guests_in = sr.guestsIn;
    await sb.from("event_metrics").update(patch).eq("event_id", id);
    const stamp = new Date().toISOString();
    for (const c of [
      { connector: "toast", state: toast.state, message: toast.message },
      { connector: "sevenrooms", state: sr.state, message: sr.message },
      { connector: "sling", state: crew.state, message: crew.message },
      { connector: "tripleseat", state: "off", message: "Optional for this event" },
    ])
      await sb.from("connector_status").upsert({ event_id: id, last_sync_at: stamp, ...c }, { onConflict: "event_id,connector" });
    out[id] = { toast: toast.state, toast_msg: toast.message, sevenrooms: sr.state, sr_msg: sr.message, crew: crew.state, crew_msg: crew.message };
  }
  return new Response(JSON.stringify({ ok: true, synced_at: new Date().toISOString(), events: out }), {
    headers: { "Content-Type": "application/json" },
  });
});
