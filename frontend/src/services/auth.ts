import { getData, patchData, postData, type Session } from './api';
import type { Language, Me, Region, School } from './types';

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  role: 'STUDENT' | 'TEACHER';
  grade?: number;
  regionId: string;
  schoolId?: string;
  customSchoolName?: string;
  language: Language;
}

export interface UpdateMePayload {
  fullName?: string;
  language?: Language;
  grade?: number | null;
  regionId?: string;
  schoolId?: string | null;
  customSchoolName?: string | null;
  isProfilePublic?: boolean;
}

export const authApi = {
  register: (payload: RegisterPayload) => postData<Session>('/auth/register', payload),
  login: (email: string, password: string) => postData<Session>('/auth/login', { email, password }),
  logout: () => postData<{ ok: true }>('/auth/logout'),
  forgotPassword: (email: string) => postData<{ ok: true }>('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    postData<{ ok: true }>('/auth/reset-password', { token, password }),
  changePassword: (currentPassword: string, newPassword: string) =>
    postData<{ ok: true }>('/auth/change-password', { currentPassword, newPassword }),
  me: () => getData<Me>('/me'),
  updateMe: (payload: UpdateMePayload) => patchData<Me>('/me', payload),
};

export const geoApi = {
  regions: () => getData<Region[]>('/regions'),
  schools: (regionId: string, q: string) =>
    getData<School[]>('/schools', { regionId, q: q || undefined, limit: 20 }),
};
