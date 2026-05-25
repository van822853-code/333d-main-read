export interface SubmittedWork {
  id: string;
  url: string;
  coverUrl: string;
  createdAt: string;
}

export interface DesignerSubmission {
  id: string;
  name: string;
  createdAt: string;
  works: SubmittedWork[];
}

export interface ExhibitionWork extends SubmittedWork {
  designerName: string;
  submissionId: string;
}

export const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://127.0.0.1:3102' : '');
const DEFAULT_EVENT_API_BASE = 'https://show-plan-event-backend.liucheng-show-plan.workers.dev';
const WORKS_SOURCE = import.meta.env.VITE_WORKS_SOURCE || 'firebase';
const EVENT_API_BASE = import.meta.env.VITE_EVENT_API_BASE || DEFAULT_EVENT_API_BASE;

interface EventWork {
  id?: string;
  studentId?: string;
  studentName?: string;
  workIndex?: number;
  workUrl?: string;
  coverUrl?: string;
  createdAt?: string;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || '请求失败');
  }
  return data as T;
}

function normalizeEventWorks(payload: unknown): ExhibitionWork[] {
  const rawWorks = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { works?: unknown })?.works)
      ? (payload as { works: unknown[] }).works
      : [];

  return rawWorks.flatMap((item, index) => {
    const work = item as EventWork;
    const url = typeof work.workUrl === 'string' ? work.workUrl.trim() : '';
    const coverUrl = typeof work.coverUrl === 'string' ? work.coverUrl.trim() : '';

    if (!url || !coverUrl) return [];

    const studentId = typeof work.studentId === 'string' && work.studentId.trim()
      ? work.studentId.trim()
      : 'event';
    const workIndex = typeof work.workIndex === 'number' ? work.workIndex : index + 1;

    return [{
      id: typeof work.id === 'string' && work.id.trim() ? work.id.trim() : `${studentId}-${workIndex}`,
      url,
      coverUrl,
      createdAt: typeof work.createdAt === 'string' && work.createdAt.trim()
        ? work.createdAt.trim()
        : new Date(0).toISOString(),
      designerName: typeof work.studentName === 'string' && work.studentName.trim()
        ? work.studentName.trim()
        : '匿名作者',
      submissionId: studentId,
    }];
  });
}

export async function fetchWorks() {
  if (WORKS_SOURCE === 'event') {
    const response = await fetch(`${EVENT_API_BASE}/api/works`);
    return normalizeEventWorks(await parseResponse<{ works?: EventWork[] } | EventWork[]>(response));
  }

  const response = await fetch(`${API_BASE}/api/works`);
  return parseResponse<ExhibitionWork[]>(response);
}

export async function fetchSubmissions() {
  const response = await fetch(`${API_BASE}/api/submissions`);
  return parseResponse<DesignerSubmission[]>(response);
}

export async function createSubmission(formData: FormData) {
  const response = await fetch(`${API_BASE}/api/submissions`, {
    method: 'POST',
    body: formData,
  });
  return parseResponse<DesignerSubmission>(response);
}

export async function deleteSubmission(id: string) {
  const response = await fetch(`${API_BASE}/api/submissions?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return parseResponse<{ ok: true }>(response);
}
