import { supabase } from "./supabase";
import type { Role } from "./types";

/* Raw snapshot payload returned by the event_snapshot RPC (snake_case rows). */
export interface SnapshotPayload {
  role: Role;
  token: string;
  event: Record<string, any>;
  venue: Record<string, any> | null;
  floor_plan: Record<string, any> | null;
  zones: any[];
  objects: any[];
  positions: any[];
  staff: any[];
  run_of_show: any[];
  checklists: any[];
  tasks: any[];
  bars: any[];
  vip_tables: any[];
  reservations: any[];
  metrics: Record<string, any> | null;
  connectors: any[];
}

export interface SnapshotError {
  error: string;
}

export function isSnapshotError(s: SnapshotPayload | SnapshotError): s is SnapshotError {
  return (s as SnapshotError).error !== undefined;
}

/** Fetch the full event payload for a share token. */
export async function fetchSnapshot(token: string): Promise<SnapshotPayload | SnapshotError> {
  const { data, error } = await (supabase.rpc as any)("event_snapshot", { p_token: token });
  if (error) throw error;
  return data as unknown as SnapshotPayload | SnapshotError;
}

/** Run an audited, role-gated write through the app_op dispatcher. */
export async function op(
  token: string,
  action: string,
  payload: Record<string, unknown> = {},
): Promise<any> {
  const { data, error } = await (supabase.rpc as any)("app_op", {
    p_token: token,
    p_action: action,
    p_payload: payload as any,
  });
  if (error) throw error;
  if (data && (data as any).error) throw new Error((data as any).error);
  return data;
}
