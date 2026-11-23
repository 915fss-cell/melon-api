import type { Context } from "hono";

export class ApiError extends Error {
  constructor(
    public readonly status: 400 | 404 | 500 | 502,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiError(c: Context, status: 400 | 404 | 500 | 502, code: string, message: string) {
  return c.json({ error: { code, message } }, status);
}
