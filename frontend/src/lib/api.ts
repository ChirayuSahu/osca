export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

// Reads the backend's `{ success, message }` envelope from a failed response.
export const readApiError = async (res: Response, fallback: string): Promise<ApiError> => {
  let message = fallback;
  try {
    const body = await res.json();
    if (typeof body?.message === "string" && body.message) message = body.message;
  } catch {
    // non-JSON body: keep the fallback
  }
  return new ApiError(message, res.status);
};

// The backend answers 403 with this message when the user's stored GitHub
// token is invalid or lacks access; signing in again refreshes it.
export const isGithubTokenError = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 403 && /github token/i.test(error.message);

// Called when our backend answers 401 to a request made with `token` (the
// session JWT expired or was revoked). GitHub-token problems come back as 403,
// so they never land here. The auth context registers the handler.
let onUnauthorized: ((token: string) => void) | null = null;

export const setUnauthorizedHandler = (handler: ((token: string) => void) | null) => {
  onUnauthorized = handler;
};

// `fetch` for our own API: reports a 401 on an authenticated request to the
// handler above, then returns the response unchanged for the caller to handle.
export const apiFetch = async (input: string, init?: RequestInit): Promise<Response> => {
  const res = await fetch(input, init);
  if (res.status === 401 && onUnauthorized) {
    const auth = new Headers(init?.headers).get("Authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (token) onUnauthorized(token);
  }
  return res;
};
