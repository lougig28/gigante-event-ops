/* Supabase types for the typed client. Access is RPC-only (event_snapshot reads,
 * app_op writes), so tables are kept permissive; the two RPCs + enums are typed
 * precisely. Regenerate with `generate_typescript_types` if the schema changes. */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type LooseTable = { Row: Record<string, Json>; Insert: Record<string, Json>; Update: Record<string, Json> };

export interface Database {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: { [key: string]: LooseTable };
    Views: { [_ in never]: never };
    Functions: {
      event_snapshot: { Args: { p_token: string }; Returns: Json };
      app_op: { Args: { p_token: string; p_action: string; p_payload?: Json }; Returns: Json };
    };
    Enums: {
      role: "owner" | "manager" | "captain" | "bar_lead" | "staff" | "security" | "readonly";
      event_status: "draft" | "scheduled" | "live" | "closed" | "archived";
      object_category: "seating" | "bar" | "stage" | "structure" | "decor" | "pool" | "boh" | "markup";
      object_status: "ok" | "setup" | "attention" | "down" | "vip";
      check_state: "scheduled" | "checked_in" | "on_break" | "clocked_out" | "no_show";
      ros_phase: "setup" | "doors" | "service" | "peak" | "feature" | "last_call" | "close" | "breakdown";
      checklist_kind: "opening" | "running" | "closing" | "admin";
      task_status: "todo" | "in_progress" | "done" | "blocked";
      vip_status: "open" | "seated" | "spending" | "closed";
      sync_state: "live" | "polling" | "stale" | "stubbed" | "error" | "off";
    };
    CompositeTypes: { [_ in never]: never };
  };
}
