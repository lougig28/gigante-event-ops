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
    const [staffSched, checkedIn, tasksTotal, tasksDone] = await Promise.all([
      cnt("staff"),
      cnt("staff", "check_in", "checked_in"),
      cnt("tasks"),
      cnt("tasks", "status", "done"),
    ]);
    const toast = await syncToast(ev.date);
    const sr = await syncSevenRooms(id, sb, ev.date);
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
      { connector: "sling", state: "stubbed", message: "No Sling API yet — roster seeded from briefing" },
      { connector: "tripleseat", state: "off", message: "Optional for this event" },
    ])
      await sb.from("connector_status").upsert({ event_id: id, last_sync_at: stamp, ...c }, { onConflict: "event_id,connector" });
    out[id] = { toast: toast.state, toast_msg: toast.message, sevenrooms: sr.state, sr_msg: sr.message };
  }
  return new Response(JSON.stringify({ ok: true, synced_at: new Date().toISOString(), events: out }), {
    headers: { "Content-Type": "application/json" },
  });
});
