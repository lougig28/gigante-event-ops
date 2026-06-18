import { create } from "zustand";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { fetchSnapshot, isSnapshotError, op, type SnapshotPayload } from "@/lib/api";
import { getToken } from "@/lib/session";
import type { Role } from "@/lib/types";

type Status = "idle" | "loading" | "live" | "offline" | "error";

interface EventState {
  token: string | null;
  role: Role | null;
  snapshot: SnapshotPayload | null;
  status: Status;
  error: string | null;
  channel: RealtimeChannel | null;
  lastSync: number | null;
  init: () => Promise<void>;
  refetch: () => Promise<void>;
  mutate: (action: string, payload?: Record<string, unknown>) => Promise<any>;
}

let refetchTimer: ReturnType<typeof setTimeout> | null = null;

export const useEventStore = create<EventState>((set, get) => ({
  token: null,
  role: null,
  snapshot: null,
  status: "idle",
  error: null,
  channel: null,
  lastSync: null,

  init: async () => {
    const token = getToken();
    if (!token) {
      set({ status: "offline", token: null });
      return;
    }
    set({ status: "loading", token });
    try {
      const snap = await fetchSnapshot(token);
      if (isSnapshotError(snap)) {
        set({ status: "error", error: snap.error });
        return;
      }
      set({ snapshot: snap, role: snap.role, status: "live", lastSync: Date.now() });

      const eventId = snap.event?.id as string | undefined;
      if (eventId && !get().channel) {
        const ch = supabase.channel(`event:${eventId}`, {
          config: { broadcast: { self: false } },
        });
        ch.on("broadcast", { event: "changed" }, () => {
          if (refetchTimer) clearTimeout(refetchTimer);
          refetchTimer = setTimeout(() => get().refetch(), 250);
        }).subscribe();
        set({ channel: ch });
      }
    } catch (e) {
      set({ status: "error", error: e instanceof Error ? e.message : String(e) });
    }
  },

  refetch: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const snap = await fetchSnapshot(token);
      if (!isSnapshotError(snap)) set({ snapshot: snap, role: snap.role, lastSync: Date.now() });
    } catch {
      /* keep last good snapshot on transient errors */
    }
  },

  mutate: async (action, payload = {}) => {
    const { token, channel, snapshot } = get();
    if (!token) throw new Error("No token — open with a share link to make changes.");
    const res = await op(token, action, payload);
    await get().refetch();
    const eventId = snapshot?.event?.id as string | undefined;
    if (channel && eventId) {
      channel.send({ type: "broadcast", event: "changed", payload: { action } });
    }
    return res;
  },
}));
