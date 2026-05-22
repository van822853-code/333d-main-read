import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, ImagePlus, Loader2, Plus, Trash2, UploadCloud } from 'lucide-react';
import { createSubmission, deleteSubmission, DesignerSubmission, fetchSubmissions } from '../lib/api';

interface WorkDraft {
  url: string;
  cover: File | null;
  preview: string;
}

const emptyWork = (): WorkDraft => ({ url: '', cover: null, preview: '' });

export function AdminPage() {
  const [name, setName] = useState('');
  const [works, setWorks] = useState<WorkDraft[]>([emptyWork()]);
  const [submissions, setSubmissions] = useState<DesignerSubmission[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  async function loadSubmissions() {
    setIsLoading(true);
    try {
      setSubmissions(await fetchSubmissions());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '读取提交记录失败');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSubmissions();
  }, []);

  function updateWork(index: number, patch: Partial<WorkDraft>) {
    setWorks((current) => current.map((work, i) => (i === index ? { ...work, ...patch } : work)));
  }

  function removeWork(index: number) {
    setWorks((current) => (current.length === 1 ? current : current.filter((_, i) => i !== index)));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');

    const completeWorks = works.filter((work) => work.url.trim() && work.cover);
    if (!name.trim()) {
      setError('请填写姓名');
      return;
    }
    if (completeWorks.length === 0) {
      setError('至少提交一个包含链接和封面的作品');
      return;
    }

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('workCount', String(completeWorks.length));
    completeWorks.forEach((work, index) => {
      formData.append(`workUrl-${index}`, work.url.trim());
      formData.append(`cover-${index}`, work.cover as File);
    });

    setIsSubmitting(true);
    try {
      await createSubmission(formData);
      setName('');
      setWorks([emptyWork()]);
      setMessage('提交成功，作品会自动出现在 3D 路径中');
      await loadSubmissions();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '提交失败');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setError('');
    setMessage('');
    try {
      await deleteSubmission(id);
      setMessage('已删除提交记录');
      await loadSubmissions();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除失败');
    }
  }

  return (
    <main className="h-screen overflow-y-auto bg-[#f6f7fb] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-5 py-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-700">Designer Console</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">作品提交后台</h1>
          </div>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:border-slate-400"
          >
            <ArrowLeft className="h-4 w-4" />
            返回展览
          </a>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">提交设计师作品</h2>
                <p className="mt-1 text-sm text-slate-500">封面建议使用 16:9 图片，每个设计师可以提交多个作品。</p>
              </div>
              <button
                type="button"
                onClick={() => setWorks((current) => [...current, emptyWork()])}
                className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                添加作品
              </button>
            </div>

            <label className="mt-5 block text-sm font-semibold">
              姓名
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                placeholder="请输入设计师姓名"
              />
            </label>

            <div className="mt-5 flex flex-col gap-4">
              {works.map((work, index) => (
                <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold">作品 {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeWork(index)}
                      disabled={works.length === 1}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-white hover:text-red-600 disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <label className="block text-sm font-semibold">
                    访问链接
                    <input
                      value={work.url}
                      onChange={(event) => updateWork(index, { url: event.target.value })}
                      className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                      placeholder="https://example.com/work"
                      type="url"
                    />
                  </label>

                  <label className="mt-3 block text-sm font-semibold">
                    封面图片
                    <div className="mt-2 grid gap-3 sm:grid-cols-[180px_1fr]">
                      <div className="aspect-video overflow-hidden rounded-md border border-dashed border-slate-300 bg-white">
                        {work.preview ? (
                          <img src={work.preview} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            <ImagePlus className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <input
                        className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null;
                          updateWork(index, {
                            cover: file,
                            preview: file ? URL.createObjectURL(file) : '',
                          });
                        }}
                      />
                    </div>
                  </label>
                </div>
              ))}
            </div>

            {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
            {message && <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-cyan-500 disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              提交作品
            </button>
          </form>

          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">提交记录</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {submissions.reduce((total, item) => total + item.works.length, 0)} 个作品
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在读取
                </div>
              ) : submissions.length === 0 ? (
                <p className="rounded-md bg-slate-50 px-3 py-4 text-sm text-slate-500">暂无提交记录。</p>
              ) : (
                submissions.map((submission) => (
                  <div key={submission.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold">{submission.name}</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(submission.createdAt).toLocaleString()} · {submission.works.length} 个作品
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(submission.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {submission.works.map((work) => (
                        <a key={work.id} href={work.url} target="_blank" rel="noreferrer" className="group block">
                          <img
                            src={work.coverUrl}
                            alt=""
                            className="aspect-video w-full rounded-md border border-slate-200 object-cover transition group-hover:opacity-80"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
