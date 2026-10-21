import axios, { AxiosError } from 'axios';
import i18n from '../i18n';

// Unified backend response shapes
export interface ApiSuccess<T> {
  data: T;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

/** Error thrown by API calls; `message` is already translated (by backend or locally). */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number | null,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // refresh token lives in an httpOnly cookie
  timeout: 20_000,
});

// Backend answers in the UI language
api.interceptors.request.use((config) => {
  config.headers.set('Accept-Language', i18n.resolvedLanguage ?? 'ky');
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: ApiErrorPayload }>) => {
    const payload = error.response?.data?.error;
    if (payload) {
      return Promise.reject(
        new ApiError(
          payload.code,
          payload.message,
          error.response?.status ?? null,
          payload.details,
        ),
      );
    }
    const isNetwork = !error.response;
    return Promise.reject(
      new ApiError(
        isNetwork ? 'NETWORK' : 'UNKNOWN',
        i18n.t(isNetwork ? 'errors.network' : 'errors.generic'),
        error.response?.status ?? null,
      ),
    );
  },
);

/** Unwraps { data } */
export async function getData<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await api.get<ApiSuccess<T>>(url, { params });
  return res.data.data;
}
