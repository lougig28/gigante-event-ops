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

/** Validate a manager passcode server-side; returns an editor token on success. */
export async function unlockEdit(passcode: string): Promise<{ ok?: boolean; token?: string; error?: string }> {
  const { data, error } = await (supabase.rpc as any)("edit_unlock", { p_passcode: passcode });
  if (error) throw error;
  return (data ?? {}) as { ok?: boolean; token?: string; error?: string };
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

/** List all share links for the event (owner/manager only). */
export async function shareList(token: string): Promise<any[]> {
  const { data, error } = await (supabase.rpc as any)("share_list", { p_token: token });
  if (error) throw error;
  if (data && data.error) throw new Error(data.error);
  return Array.isArray(data) ? data : [];
}

/** Toggle a share link's revoked state (owner/manager only). */
export async function shareToggle(token: string, id: string): Promise<any> {
  const { data, error } = await (supabase.rpc as any)("share_revoke", { p_token: token, p_id: id });
  if (error) throw error;
  if (data && data.error) throw new Error(data.error);
  return data;
}

/** 86 board (out-of-stock / cut-off list — any role). */
export async function list86(token: string): Promise<any[]> {
  const { data, error } = await (supabase.rpc as any)("list_86", { p_token: token });
  if (error) throw error;
  if (data && data.error) throw new Error(data.error);
  return Array.isArray(data) ? data : [];
}
export async function add86(token: string, item: string, station?: string, reason?: string): Promise<any> {
  const { data, error } = await (supabase.rpc as any)("add_86", {
    p_token: token,
    p_item: item,
    p_station: station ?? null,
    p_reason: reason ?? null,
  });
  if (error) throw error;
  return data;
}
export async function toggle86(token: string, id: string): Promise<any> {
  const { data, error } = await (supabase.rpc as any)("toggle_86", { p_token: token, p_id: id });
  if (error) throw error;
  return data;
}
