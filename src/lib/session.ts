/* Share-token session. The token (per-role) arrives via ?t=<token> in the URL,
 * is persisted to localStorage, and gates all data access through the RPCs.
 * No token => the app runs in offline/seed mode. */

const TOKEN_KEY = "geo_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const t = url.searchParams.get("t");
    if (t) {
      localStorage.setItem(TOKEN_KEY, t);
      url.searchParams.delete("t");
      window.history.replaceState({}, "", url.toString());
      return t;
    }
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
