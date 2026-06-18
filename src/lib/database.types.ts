/* Placeholder Supabase types — regenerated from the live schema via
 * `generate_typescript_types` after migrations land. Keeps the typed client
 * compiling in the meantime. DO NOT hand-edit once generation is wired. */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: Record<
      string,
      { Row: Record<string, Json>; Insert: Record<string, Json>; Update: Record<string, Json> }
    >;
    Views: Record<string, { Row: Record<string, Json> }>;
    Functions: Record<string, unknown>;
    Enums: Record<string, string>;
    CompositeTypes: Record<string, unknown>;
  };
}
