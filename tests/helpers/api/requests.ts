import { strict as assert } from 'node:assert';

export type SupportedHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type JsonRequestOptions = Omit<RequestInit, 'body' | 'method'> & {
  method?: SupportedHttpMethod;
  body?: unknown;
};

function createHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init);
  if (!headers.has('accept')) headers.set('accept', 'application/json');
  return headers;
}

export function createJsonRequest(
  input: string | URL,
  options: JsonRequestOptions = {},
): Request {
  const method = options.method ?? 'GET';
  const headers = createHeaders(options.headers);
  const hasBody = options.body !== undefined && method !== 'GET';

  if (hasBody) headers.set('content-type', 'application/json');

  return new Request(input, {
    ...options,
    method,
    headers,
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });
}

export function createAuthenticatedRequest(
  input: string | URL,
  token = 'test-session-token',
  options: JsonRequestOptions = {},
): Request {
  const headers = createHeaders(options.headers);
  headers.set('authorization', `Bearer ${token}`);

  return createJsonRequest(input, { ...options, headers });
}

export async function expectJsonResponse<T>(
  response: Response,
  expectedStatus: number,
): Promise<T> {
  assert.equal(response.status, expectedStatus);
  assert.match(
    response.headers.get('content-type') ?? '',
    /application\/json/i,
  );
  return (await response.json()) as T;
}
