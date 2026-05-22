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

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:3102';

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || '请求失败');
  }
  return data as T;
}

export async function fetchWorks() {
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
  const response = await fetch(`${API_BASE}/api/submissions/${id}`, {
    method: 'DELETE',
  });
  return parseResponse<{ ok: true }>(response);
}
