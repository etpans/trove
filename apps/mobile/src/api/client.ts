import { API_BASE_URL } from '../config/env';
import type {
  AuthTokens,
  ClassRecord,
  NoteRecord,
  StudentRecord,
} from '../types/models';

type SessionHandlers = {
  getTokens: () => AuthTokens | null;
  onSessionExpired: () => void;
  onTokens: (tokens: AuthTokens) => void;
};

export class ApiClient {
  constructor(private readonly session: SessionHandlers) {}

  async login(email: string, password: string) {
    return this.request<AuthTokens>('/auth/login', {
      auth: false,
      body: JSON.stringify({ email, password }),
      method: 'POST',
    });
  }

  async register(displayName: string, email: string, password: string) {
    return this.request('/auth/register', {
      auth: false,
      body: JSON.stringify({ displayName, email, password }),
      method: 'POST',
    });
  }

  async listClasses() {
    return this.request<ClassRecord[]>('/classes');
  }

  async listStudents() {
    return this.request<StudentRecord[]>('/students');
  }

  async listNotes() {
    return this.request<NoteRecord[]>('/notes');
  }

  async createClass(input: Pick<ClassRecord, 'color' | 'name' | 'session'>) {
    return this.request<ClassRecord>('/classes', {
      body: JSON.stringify(input),
      method: 'POST',
    });
  }

  async createStudent(input: {
    classId: number;
    name: string;
    rollNumber?: string;
  }) {
    return this.request<StudentRecord>('/students', {
      body: JSON.stringify(input),
      method: 'POST',
    });
  }

  async createNote(input: {
    content: string;
    studentId: number;
    title: string;
  }) {
    return this.request<NoteRecord>('/notes', {
      body: JSON.stringify(input),
      method: 'POST',
    });
  }

  async uploadAttachment(noteId: number, formData: FormData) {
    return this.request(`/notes/${noteId}/attachments`, {
      body: formData,
      headers: {},
      method: 'POST',
      multipart: true,
    });
  }

  private async refreshTokens() {
    const tokens = this.session.getTokens();
    if (!tokens?.refresh_token) {
      throw new Error('Session expired. Please log in again.');
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      body: JSON.stringify({ refresh_token: tokens.refresh_token }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const nextTokens = await assertJson<AuthTokens>(response);
    this.session.onTokens(nextTokens);
    return nextTokens;
  }

  private async request<T>(
    path: string,
    init: RequestInit & { auth?: boolean; multipart?: boolean } = {},
    hasRetried = false,
  ): Promise<T> {
    const tokens = this.session.getTokens();
    const headers: Record<string, string> = {
      ...(init.multipart ? {} : { 'Content-Type': 'application/json' }),
      ...(init.auth === false || !tokens?.access_token
        ? {}
        : { Authorization: `Bearer ${tokens.access_token}` }),
      ...(init.headers as Record<string, string> | undefined),
    };

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });

    if (response.status === 401 && init.auth !== false && !hasRetried) {
      try {
        await this.refreshTokens();
        return this.request<T>(path, init, true);
      } catch (error) {
        this.session.onSessionExpired();
        throw error;
      }
    }

    return assertJson<T>(response);
  }
}

export async function assertJson<T = unknown>(response: Response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data.message === 'string' ? data.message : 'Request failed.';
    throw new Error(message);
  }

  return data as T;
}
