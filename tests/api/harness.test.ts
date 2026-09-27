import { describe, expect, it } from 'vitest';
import {
  createAuthenticatedRequest,
  createJsonRequest,
  expectJsonResponse,
} from '@/tests/helpers/api/requests';

describe('API test harness', () => {
  // TEST-INFRA-API-001
  it.each(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const)(
    'creates a JSON %s request',
    async (method) => {
      const request = createJsonRequest('http://test.invalid/resource', {
        method,
        body: method === 'GET' ? undefined : { synthetic: true },
      });

      expect(request.method).toBe(method);
      expect(request.headers.get('accept')).toBe('application/json');
      if (method !== 'GET') {
        expect(request.headers.get('content-type')).toBe('application/json');
      }
    },
  );

  // TEST-INFRA-API-002
  it('adds a bearer token without coupling to production Auth.js behavior', () => {
    const request = createAuthenticatedRequest(
      'http://test.invalid/resource',
      'synthetic-token',
    );

    expect(request.headers.get('authorization')).toBe(
      'Bearer synthetic-token',
    );
  });

  // TEST-INFRA-API-003
  it('asserts JSON response status and parses the payload', async () => {
    const response = Response.json({ ok: true }, { status: 200 });
    await expect(expectJsonResponse<{ ok: boolean }>(response, 200)).resolves.toEqual({
      ok: true,
    });
  });
});
