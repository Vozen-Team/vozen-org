export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code = '') { super(message); this.name = 'ApiError'; }
}
// The Helper API sends message === code; prefer the code so callers comparing codes stay correct.
export function apiErrorFrom(status: number, payload: { code?: unknown; message?: unknown }): ApiError {
  const code = typeof payload.code === 'string' ? payload.code : '';
  const message = code || (typeof payload.message === 'string' ? payload.message : '') || `API ${status}`;
  return new ApiError(message, status, code);
}
// 204 and other empty bodies are a success without data.
export function parseResponseBody<T>(text: string): T { return (text ? JSON.parse(text) : undefined) as T; }
export type SaveFailure = 'conflict' | 'auth' | 'transient' | 'other';
export function saveFailureKind(error: unknown): SaveFailure {
  if (error instanceof ApiError) {
    if (error.status === 409 || error.code.endsWith('revision_conflict')) return 'conflict';
    if (error.status === 401) return 'auth';
    if (error.status === 429 || error.status >= 500) return 'transient';
    return 'other';
  }
  return error instanceof TypeError ? 'transient' : 'other';
}
