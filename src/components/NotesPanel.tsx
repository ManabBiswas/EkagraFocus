import React, { useEffect, useMemo, useState } from 'react';
import type { IPCNote, IPCTask } from '../shared/ipc';

interface NoteAttachment {
  name: string;
  type: string;
  size: number;
  path: string;
}

interface NoteEditorState {
  title: string;
  content: string;
  tagsInput: string;
  linkedTaskId: string;
  canvasData: string;
  attachments: NoteAttachment[];
  isPinned: boolean;
}

const EMPTY_EDITOR: NoteEditorState = {
  title: '',
  content: '',
  tagsInput: '',
  linkedTaskId: '',
  canvasData: '',
  attachments: [],
  isPinned: false,
};

function parseStringList(source: string | null | undefined): string[] {
  if (!source) return [];

  const trimmed = source.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter((item) => item.length > 0);
    }
  } catch {
    // Fallback to comma-separated content.
  }

  return trimmed
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseAttachmentList(source: string | null | undefined): NoteAttachment[] {
  if (!source) return [];

  try {
    const parsed = JSON.parse(source);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        name: String((item as { name?: string }).name || 'attachment'),
        type: String((item as { type?: string }).type || 'file'),
        size: Number((item as { size?: number }).size || 0),
        path: String((item as { path?: string }).path || ''),
      }))
      .filter((item) => item.name.length > 0);
  } catch {
    return [];
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function noteToEditorState(note: IPCNote): NoteEditorState {
  return {
    title: note.title,
    content: note.content || '',
    tagsInput: parseStringList(note.tags).join(', '),
    linkedTaskId: note.linked_task_id || '',
    canvasData: note.canvas_data || '',
    attachments: parseAttachmentList(note.attachments),
    isPinned: note.is_pinned === 1,
  };
}

function parseMarkdownInline(text: string): React.ReactNode {
  const boldSplit = text.split(/(\*\*[^*]+\*\*)/g);

  return boldSplit.map((chunk, index) => {
    const boldMatch = chunk.match(/^\*\*([^*]+)\*\*$/);
    if (boldMatch) {
      return (
        <strong key={`bold_${index}`} className="font-semibold text-white">
          {boldMatch[1]}
        </strong>
      );
    }

    const codeSplit = chunk.split(/(`[^`]+`)/g);
    return (
      <React.Fragment key={`plain_${index}`}>
        {codeSplit.map((part, partIdx) => {
          const codeMatch = part.match(/^`([^`]+)`$/);
          if (codeMatch) {
            return (
              <code
                key={`code_${index}_${partIdx}`}
                className="rounded bg-black/40 px-1.5 py-0.5 text-xs text-cyan-200"
              >
                {codeMatch[1]}
              </code>
            );
          }

          return <React.Fragment key={`txt_${index}_${partIdx}`}>{part}</React.Fragment>;
        })}
      </React.Fragment>
    );
  });
}

function renderMarkdownPreview(content: string): React.ReactNode {
  if (!content.trim()) {
    return <p className="text-sm text-slate-400">Add content to see markdown preview.</p>;
  }

  const blocks: React.ReactNode[] = [];
  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={`list_${blocks.length}`} className="ml-5 list-disc space-y-1 text-sm text-slate-200">
        {listBuffer.map((item, idx) => (
          <li key={`li_${idx}`}>{parseMarkdownInline(item)}</li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  const flushCode = () => {
    if (codeBuffer.length === 0) return;
    blocks.push(
      <pre
        key={`code_${blocks.length}`}
        className="overflow-x-auto rounded-xl border border-white/10 bg-black/45 p-3 text-xs text-emerald-200"
      >
        <code>{codeBuffer.join('\n')}</code>
      </pre>
    );
    codeBuffer = [];
  };

  lines.forEach((line) => {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        flushCode();
      } else {
        flushList();
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      listBuffer.push(bullet[1]);
      return;
    }

    flushList();

    if (!line.trim()) {
      blocks.push(<div key={`spacer_${blocks.length}`} className="h-2" />);
      return;
    }

    if (line.startsWith('### ')) {
      blocks.push(
        <h4 key={`h3_${blocks.length}`} className="text-base font-semibold text-white">
          {parseMarkdownInline(line.slice(4))}
        </h4>
      );
      return;
    }

    if (line.startsWith('## ')) {
      blocks.push(
        <h3 key={`h2_${blocks.length}`} className="text-lg font-semibold text-white">
          {parseMarkdownInline(line.slice(3))}
        </h3>
      );
      return;
    }

    if (line.startsWith('# ')) {
      blocks.push(
        <h2 key={`h1_${blocks.length}`} className="text-xl font-bold text-white">
          {parseMarkdownInline(line.slice(2))}
        </h2>
      );
      return;
    }

    blocks.push(
      <p key={`p_${blocks.length}`} className="text-sm leading-relaxed text-slate-200">
        {parseMarkdownInline(line)}
      </p>
    );
  });

  if (inCodeBlock) {
    flushCode();
  }
  flushList();

  return <div className="space-y-2">{blocks}</div>;
}

export function NotesPanel() {
  const [notes, setNotes] = useState<IPCNote[]>([]);
  const [tasks, setTasks] = useState<IPCTask[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editor, setEditor] = useState<NoteEditorState>(EMPTY_EDITOR);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) || null,
    [notes, selectedNoteId]
  );

  const filteredNotes = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return notes;

    return notes.filter((note) => {
      const haystack = `${note.title} ${note.content || ''} ${note.tags || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [notes, searchText]);

  const refreshData = async (preferredNoteId?: string | null) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const today = new Date().toISOString().split('T')[0];
      const [nextNotes, todayTasks] = await Promise.all([
        window.api.notes.list({ limit: 300 }),
        window.api.db.getTodayTasks(today),
      ]);

      setNotes(nextNotes);
      setTasks(todayTasks);

      if (preferredNoteId && nextNotes.some((note) => note.id === preferredNoteId)) {
        setSelectedNoteId(preferredNoteId);
      } else if (selectedNoteId && nextNotes.some((note) => note.id === selectedNoteId)) {
        setSelectedNoteId(selectedNoteId);
      } else {
        setSelectedNoteId(nextNotes[0]?.id || null);
      }
    } catch (error) {
      console.error('[NotesPanel] Failed to load notes:', error);
      setErrorMessage('Failed to load notes from local database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (selectedNote) {
      setEditor(noteToEditorState(selectedNote));
      setStatusMessage('');
      return;
    }

    setEditor(EMPTY_EDITOR);
  }, [selectedNote]);

  const handleCreateNew = () => {
    setSelectedNoteId(null);
    setEditor(EMPTY_EDITOR);
    setStatusMessage('Creating a new note draft.');
  };

  const handleAttachmentSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const nextAttachments = Array.from(files).map((file) => {
      const fileWithPath = file as File & { path?: string };
      return {
        name: file.name,
        type: file.type || 'file',
        size: file.size,
        path: fileWithPath.path || file.name,
      };
    });

    setEditor((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...nextAttachments],
    }));

    event.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setEditor((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, idx) => idx !== index),
    }));
  };

  const buildPayload = () => {
    const parsedTags = editor.tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    return {
      title: editor.title.trim() || 'Untitled Note',
      content: editor.content.trim() || null,
      canvas_data: editor.canvasData.trim() || null,
      tags: parsedTags.length > 0 ? JSON.stringify(parsedTags) : null,
      linked_task_id: editor.linkedTaskId || null,
      attachments: editor.attachments.length > 0 ? JSON.stringify(editor.attachments) : null,
      is_pinned: editor.isPinned ? 1 : 0,
    };
  };

  const upsertNote = async (): Promise<IPCNote | null> => {
    const payload = buildPayload();

    if (selectedNoteId) {
      return window.api.notes.update(selectedNoteId, payload);
    }

    return window.api.notes.create(payload);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      const updated = await upsertNote();
      if (!updated) {
        setErrorMessage('Could not save note.');
        return;
      }

      await refreshData(updated.id);
      setStatusMessage('Note saved locally.');
    } catch (error) {
      console.error('[NotesPanel] Save failed:', error);
      setErrorMessage('Failed to save note.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedNoteId) {
      setEditor(EMPTY_EDITOR);
      return;
    }

    const confirmed = window.confirm('Delete this note permanently?');
    if (!confirmed) return;

    try {
      await window.api.notes.delete(selectedNoteId);
      await refreshData(null);
      setEditor(EMPTY_EDITOR);
      setStatusMessage('Note deleted.');
    } catch (error) {
      console.error('[NotesPanel] Delete failed:', error);
      setErrorMessage('Failed to delete note.');
    }
  };

  const handleGenerateInsights = async () => {
    setIsGenerating(true);
    setErrorMessage('');

    try {
      const saved = await upsertNote();
      if (!saved) {
        setErrorMessage('Save note before generating insights.');
        return;
      }

      const enriched = await window.api.notes.generateInsights(saved.id);
      if (!enriched) {
        setErrorMessage('AI insight generation failed.');
        return;
      }

      await refreshData(enriched.id);
      setStatusMessage('AI summary and tags generated.');
    } catch (error) {
      console.error('[NotesPanel] Insight generation failed:', error);
      setErrorMessage('Failed to generate AI insights.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid h-full min-h-0 gap-4 p-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="panel-shell flex min-h-0 flex-col overflow-hidden p-3">
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-white/20 pb-3">
          <div>
            <h3 className="section-label text-cyan-300">Smart notepad</h3>
            <p className="mt-1 text-xs text-slate-400">Local-first notes with AI summaries</p>
          </div>
          <button
            onClick={handleCreateNew}
            className="btn-glow px-3 py-1"
          >
            New
          </button>
        </div>

        <input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Search title/content/tags"
          className="metal-input mb-3 w-full rounded-xl px-3 py-2 text-sm"
        />

        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {isLoading && <p className="text-sm text-slate-400">Loading notes...</p>}
          {!isLoading && filteredNotes.length === 0 && (
            <p className="rounded-xl border border-white/15 bg-black/30 p-3 text-sm text-slate-400">
              No notes yet. Create your first note.
            </p>
          )}

          {filteredNotes.map((note) => {
            const tags = parseStringList(note.tags);
            const active = selectedNoteId === note.id;

            return (
              <button
                key={note.id}
                onClick={() => setSelectedNoteId(note.id)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  active
                    ? 'border-cyan-400/40 bg-cyan-400/10'
                    : 'border-white/15 bg-black/30 hover:bg-black/45'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="line-clamp-1 text-sm font-semibold text-white">{note.title}</p>
                  {note.is_pinned === 1 && (
                    <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200">
                      Pinned
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{note.content || 'No content yet'}</p>
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tags.slice(0, 3).map((tag) => (
                      <span
                        key={`${note.id}_${tag}`}
                        className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      <section className="panel-shell flex min-h-0 flex-col gap-3 overflow-hidden p-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/20 pb-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-success px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save note'}
          </button>
          <button
            onClick={handleGenerateInsights}
            disabled={isGenerating || isSaving}
            className="btn-accent px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Analyzing...' : 'AI Insights'}
          </button>
          <button
            onClick={handleDelete}
            className="btn-danger px-3 py-1.5"
          >
            Delete
          </button>

          {statusMessage && <p className="text-xs text-emerald-300">{statusMessage}</p>}
          {errorMessage && <p className="text-xs text-red-300">{errorMessage}</p>}
        </div>

        <div className="grid min-h-0 flex-1 gap-3 overflow-hidden xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3 overflow-y-auto pr-1">
            <input
              value={editor.title}
              onChange={(event) => setEditor((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Note title"
              className="metal-input w-full rounded-xl px-3 py-2 text-sm"
            />

            <div className="grid gap-2 md:grid-cols-2">
              <input
                value={editor.tagsInput}
                onChange={(event) => setEditor((prev) => ({ ...prev, tagsInput: event.target.value }))}
                placeholder="Tags (comma separated)"
                className="metal-input w-full rounded-xl px-3 py-2 text-sm"
              />
              <select
                value={editor.linkedTaskId}
                onChange={(event) => setEditor((prev) => ({ ...prev, linkedTaskId: event.target.value }))}
                className="metal-input w-full rounded-xl px-3 py-2 text-sm"
              >
                <option value="">Link to task (optional)</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={editor.isPinned}
                onChange={(event) => setEditor((prev) => ({ ...prev, isPinned: event.target.checked }))}
              />
              Pin this note
            </label>

            <textarea
              value={editor.content}
              onChange={(event) => setEditor((prev) => ({ ...prev, content: event.target.value }))}
              placeholder="Write markdown notes here..."
              rows={10}
              className="metal-input w-full resize-y rounded-xl px-3 py-2 text-sm"
            />

            <textarea
              value={editor.canvasData}
              onChange={(event) => setEditor((prev) => ({ ...prev, canvasData: event.target.value }))}
              placeholder="Optional drawing JSON (Excalidraw or custom canvas payload)"
              rows={4}
              className="metal-input w-full resize-y rounded-xl px-3 py-2 text-xs"
            />

            <div className="rounded-xl border border-white/15 bg-black/20 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">Attachments</p>
                <label className="cursor-pointer rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-slate-300 hover:bg-white/10">
                  Add files
                  <input type="file" multiple className="hidden" onChange={handleAttachmentSelect} />
                </label>
              </div>

              {editor.attachments.length === 0 && (
                <p className="text-xs text-slate-400">No attachments selected.</p>
              )}

              {editor.attachments.length > 0 && (
                <div className="space-y-1">
                  {editor.attachments.map((file, index) => (
                    <div
                      key={`${file.path}_${index}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/35 px-2 py-1"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs text-slate-200">{file.name}</p>
                        <p className="truncate text-[10px] text-slate-400">{file.path}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">{formatBytes(file.size)}</span>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="rounded border border-red-400/50 bg-red-400/20 px-2 py-1 text-[10px] font-bold text-red-200 hover:bg-red-400/30 transition-all"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0 space-y-3 overflow-y-auto rounded-xl border border-white/15 bg-black/25 p-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Markdown preview</p>
              <div className="mt-2">{renderMarkdownPreview(editor.content)}</div>
            </div>

            <div className="border-t border-white/10 pt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">AI summary</p>
              <p className="mt-2 text-sm text-slate-200">
                {selectedNote?.ai_summary || 'Generate insights to auto-create a concise summary.'}
              </p>
            </div>

            <div className="border-t border-white/10 pt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">AI keywords</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {parseStringList(selectedNote?.ai_keywords).map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-0.5 text-[10px] text-cyan-100"
                  >
                    {keyword}
                  </span>
                ))}
                {parseStringList(selectedNote?.ai_keywords).length === 0 && (
                  <p className="text-xs text-slate-400">No keywords yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
