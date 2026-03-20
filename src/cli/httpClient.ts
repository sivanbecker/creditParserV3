export type CreateHttpClientOptions = {
  baseUrl?: string;
};

export type HttpClient = {
  baseUrl: string;
};

export const createHttpClient = (
  options: CreateHttpClientOptions = {},
): HttpClient => {
  const baseUrl = options.baseUrl ?? process.env.API_BASE_URL;

  if (!baseUrl) {
    throw new Error('API base URL is not configured');
  }

  return {
    baseUrl,
  };
};

