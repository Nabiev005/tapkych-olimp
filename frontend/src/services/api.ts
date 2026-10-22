import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import i18n from '../i18n';
import type { Me } from './types';

// Unified backend response shapes
export interface ApiSuccess<T> {
  data: T;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface FieldError {
  path: string;
  message: string;
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

  /** Field-level validation errors keyed by path ("email", "grade", ...) */
  get fieldErrors(): Record<string, string> {
    const fields = (this.details as { fields?: FieldError[] } | undefined)?.fields ?? [];
    return Object.fromEntries(fields.map((f) => [f.path, f.message]));
  }
}

export interface Session {
  accessToken: string;
  user: Me;
}

// ---------- Access token (memory only; the refresh token is an httpOnly cookie) ----------

let accessToken: string | null = null;
type SessionListener = (session: Session | null) => void;
let sessionListener: SessionListener = () => {};

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** AuthProvider subscribes to refreshes / forced logouts that happen inside the client */
export function onSessionChange(listener: SessionListener): void {
  sessionListener = listener;
}

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 20_000,
});

api.interceptors.request.use((config) => {
  config.headers.set('Accept-Language', i18n.resolvedLanguage ?? 'ky');
  if (accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`);
  return config;
});

// Single-flight refresh shared by all requests that hit 401 at the same time
let refreshing: Promise<Session | null> | null = null;

export function refreshSession(): Promise<Session | null> {
  refreshing ??= axios
    .post<ApiSuccess<Session>>('/api/auth/refresh', null, {
      withCredentials: true,
      headers: { 'Accept-Language': i18n.resolvedLanguage ?? 'ky' },
    })
    .then((res) => {
      setAccessToken(res.data.data.accessToken);
      return res.data.data;
    })
    .catch(() => {
      setAccessToken(null);
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: ApiErrorPayload }>) => {
    const config = error.config as RetriableConfig | undefined;
    const payload = error.response?.data?.error;

    // Expired access token: refresh once and replay the request
    const isAuthCall = config?.url?.startsWith('/auth/');
    if (
      config &&
      !config._retried &&
      !isAuthCall &&
      error.response?.status === 401 &&
      accessToken &&
      (payload?.code === 'TOKEN_EXPIRED' || payload?.code === 'UNAUTHORIZED')
    ) {
      config._retried = true;
      const session = await refreshSession();
      sessionListener(session);
      if (session) return api(config);
    }

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

export async function postData<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.post<ApiSuccess<T>>(url, body);
  return res.data.data;
}

export async function patchData<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.patch<ApiSuccess<T>>(url, body);
  return res.data.data;
}

/** User-facing message for any thrown value */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : i18n.t('errors.generic');
}
