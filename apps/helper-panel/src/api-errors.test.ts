import { describe, expect, it } from 'vitest';
import { ApiError, apiErrorFrom, parseResponseBody, saveFailureKind } from './api-errors';

describe('Helper API errors', () => {
  it('prefers the error code over the message', () => {
    const same = apiErrorFrom(409, { code: 'feature_revision_conflict', message: 'feature_revision_conflict' });
    expect(same.code).toBe('feature_revision_conflict');
    expect(same.message).toBe('feature_revision_conflict');
    expect(same.status).toBe(409);
    const readable = apiErrorFrom(409, { code: 'feature_revision_conflict', message: 'Someone else saved first' });
    expect(readable.code).toBe('feature_revision_conflict');
    expect(readable.message).toBe('feature_revision_conflict');
  });
  it('builds an error from an empty body', () => {
    const error = apiErrorFrom(503, {});
    expect(error.message).toBe('API 503');
    expect(error.code).toBe('');
  });
  it('treats an empty response body as no data', () => {
    expect(parseResponseBody('')).toBeUndefined();
    expect(parseResponseBody('{"ok":true}')).toEqual({ ok: true });
  });
  it('classifies save failures', () => {
    expect(saveFailureKind(new ApiError('x', 409))).toBe('conflict');
    expect(saveFailureKind(new ApiError('quick_setup_revision_conflict', 409, 'quick_setup_revision_conflict'))).toBe('conflict');
    expect(saveFailureKind(new ApiError('unauthenticated', 401, 'unauthenticated'))).toBe('auth');
    expect(saveFailureKind(new ApiError('API 503', 503))).toBe('transient');
    expect(saveFailureKind(new ApiError('API 429', 429))).toBe('transient');
    expect(saveFailureKind(new TypeError('Failed to fetch'))).toBe('transient');
    expect(saveFailureKind(new Error('Select a valid channel'))).toBe('other');
    expect(saveFailureKind(new ApiError('invalid_config', 400, 'invalid_config'))).toBe('other');
  });
});
