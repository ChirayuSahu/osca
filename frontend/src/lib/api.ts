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
