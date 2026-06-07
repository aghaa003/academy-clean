/**
 * apiFetch — drop-in replacement for raw fetch() calls throughout the app.
 * Automatically:
 *  - sends credentials (session cookie)
 *  - fetches /sanctum/csrf-cookie if the XSRF token is missing
 *  - attaches X-XSRF-TOKEN header on state-changing requests
 *  - sets Accept: application/json so Laravel never redirects to HTML
 */

const CSRF_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getCsrfToken(): string {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="));
  return match ? decodeURIComponent(match.split("=")[1]) : "";
}

async function ensureCsrfToken(): Promise<string> {
  let token = getCsrfToken();
  if (!token) {
    await fetch("/sanctum/csrf-cookie", { credentials: "include" });
    token = getCsrfToken();
  }
  return token;
}

export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = (options.method ?? "GET").toUpperCase();
  const extraHeaders: Record<string, string> = {
    Accept: "application/json",
  };

  // Only set Content-Type for JSON bodies — never for FormData
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !extraHeaders["Content-Type"]
  ) {
    extraHeaders["Content-Type"] = "application/json";
  }

  if (CSRF_METHODS.has(method)) {
    const token = await ensureCsrfToken();
    if (token) extraHeaders["X-XSRF-TOKEN"] = token;
  }

  return fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...extraHeaders,
      ...(options.headers as Record<string, string> | undefined),
    },
  });
}