import { createHttpClient } from '../cli/httpClient.js';

describe('CLI HTTP client configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses the explicit baseUrl argument when provided', () => {
    const client = createHttpClient({ baseUrl: 'https://api.example.com' });

    expect(client.baseUrl).toBe('https://api.example.com');
  });

  it('reads API base URL from environment when no argument is given', () => {
    process.env.API_BASE_URL = 'http://localhost:4000';

    const client = createHttpClient();

    expect(client.baseUrl).toBe('http://localhost:4000');
  });

  it('throws a clear error when API base URL is not configured', () => {
    delete process.env.API_BASE_URL;

    expect(() => createHttpClient()).toThrow('API base URL is not configured');
  });
});
