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
  sourceUrls: string[];
  isPinned: boolean;
}

const EMPTY_EDITOR: NoteEditorState = {
  title: '',
  content: '',
  tagsInput: '',
  linkedTaskId: '',
  canvasData: '',
  attachments: [],
  sourceUrls: [],
  isPinned: false,
};

interface UrlSection {
  heading: string;
  text: string;
}

interface UrlImportState {
  urlInput: string;
  sections: UrlSection[];
  isOpen: boolean;
  isAnalyzing: boolean;
  error: string;
  activeSectionIndex: number | null;
  analyzerEnabled: boolean;
}

const EMPTY_URL_IMPORT: UrlImportState = {
  urlInput: '',
  sections: [],
  isOpen: false,
  isAnalyzing: false,
  error: '',
  activeSectionIndex: null,
  analyzerEnabled: false,
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
    sourceUrls: parseStringList(note.source_urls),
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
//notes empty state fix for quick start
const QUICK_START_STEPS = [
  { num: '01', action: 'New',         detail: 'Opens a blank note draft in the editor.' },
  { num: '02', action: 'Write',       detail: 'Markdown supported — headings, lists, code blocks.' },
  { num: '03', action: 'Save Note',   detail: 'Stored instantly in your local database.' },
  { num: '04', action: 'AI Insights', detail: 'Auto-generates a summary and keyword tags.' },
] as const;

function NotesEmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-xl border border-white/15 bg-black/30 px-4 py-9 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-7 w-7 text-cyan-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.4}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
          />
        </svg>
      </div>

      <div>
        <p className="text-sm font-semibold text-white">Your notepad is empty</p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
          Capture ideas, session notes, or anything worth keeping.
          <br />
          Markdown and AI summaries are built right in.
        </p>
      </div>

      <ul className="w-full space-y-2 text-left">
        {QUICK_START_STEPS.map(({ num, action, detail }) => (
          <li
            key={num}
            className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
          >
            <span className="mt-px shrink-0 font-mono text-[10px] font-bold text-cyan-400/60">
              {num}
            </span>
            <p className="text-xs leading-relaxed text-slate-300">
              <span className="font-semibold text-cyan-200">{action}</span>
              {' — '}
              {detail}
            </p>
          </li>
        ))}
      </ul>

      <button
        onClick={onCreateNew}
        className="btn-glow w-full cursor-pointer rounded-xl py-2.5 text-sm font-semibold"
      >
        + Create your first note
      </button>
    </div>
  );
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
  const [urlImport, setUrlImport] = useState<UrlImportState>(EMPTY_URL_IMPORT);
  const urlInputRef = React.useRef<HTMLInputElement>(null);

  const handleAddUrl = () => {
    const url = urlImport.urlInput.trim();
    if (!url) return;
    try {
      new URL(url); // validate
    } catch {
      setUrlImport(prev => ({ ...prev, error: 'Invalid URL format' }));
      return;
    }
    if (editor.sourceUrls.includes(url)) {
      setUrlImport(prev => ({ ...prev, error: 'URL already added', urlInput: '' }));
      return;
    }
    setEditor(prev => ({ ...prev, sourceUrls: [...prev.sourceUrls, url] }));
    setUrlImport(prev => ({ ...prev, urlInput: '', error: '' }));
  };

  const handleAnalyzeUrls = async () => {
    if (editor.sourceUrls.length === 0) return;
    setUrlImport(prev => ({ ...prev, isAnalyzing: true, error: '', sections: [] }));
    try {
      const result = await window.api.notes.analyzeUrls(editor.sourceUrls);
      setUrlImport(prev => ({
        ...prev,
        isAnalyzing: false,
        isOpen: true,
        sections: result.sections,
        activeSectionIndex: 0,
      }));
    } catch (err) {
      setUrlImport(prev => ({
        ...prev,
        isAnalyzing: false,
        error: err instanceof Error ? err.message : 'Analysis failed',
      }));
    }
  };

  const handleImportSelection = () => {
    const selection = window.getSelection()?.toString().trim();
    if (!selection) return;
    const separator = editor.content.trim() ? '\n\n---\n\n' : '';
    setEditor(prev => ({ ...prev, content: prev.content + separator + selection }));
    setStatusMessage('Imported selected text from AI analysis');
    setUrlImport(prev => ({ ...prev, isOpen: false }));
  };

  const handleImportFullSection = () => {
    if (urlImport.activeSectionIndex === null) return;
    const section = urlImport.sections[urlImport.activeSectionIndex];
    if (!section) return;
    const separator = editor.content.trim() ? '\n\n---\n\n' : '';
    setEditor(prev => ({
      ...prev,
      content: prev.content + separator + `### ${section.heading}\n\n${section.text}`,
    }));
    setStatusMessage('Imported full section from AI analysis');
    setUrlImport(prev => ({ ...prev, isOpen: false }));
  };

  const handleAppendAll = () => {
    if (urlImport.sections.length === 0) return;
    const markdown = urlImport.sections
      .map(s => `### ${s.heading}\n\n${s.text}`)
      .join('\n\n---\n\n');
    const separator = editor.content.trim() ? '\n\n---\n\n' : '';
    setEditor(prev => ({ ...prev, content: prev.content + separator + markdown }));
    setStatusMessage('Appended all AI-analyzed sections to note');
    setUrlImport(prev => ({ ...prev, isOpen: false }));
  };

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
      setUrlImport(EMPTY_URL_IMPORT);
      return;
    }

    setEditor(EMPTY_EDITOR);
    setUrlImport(EMPTY_URL_IMPORT);
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
      source_urls: editor.sourceUrls.length > 0 ? JSON.stringify(editor.sourceUrls) : null,
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
          {/* split into two cases so search returning nothing doesn't show the wrong empty state */}
          {!isLoading && notes.length === 0 && (
            <NotesEmptyState onCreateNew={handleCreateNew} />
          )}

          {!isLoading && notes.length > 0 && searchText.trim() !== '' && filteredNotes.length === 0 && (
            <p className="rounded-xl border border-white/15 bg-black/30 p-3 text-sm text-slate-400">
              No notes match your search.
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
            {/*text area expanded for more space to write*/}
            <textarea
              value={editor.content}
              onChange={(event) => setEditor((prev) => ({ ...prev, content: event.target.value }))}
              placeholder="Write markdown notes here..."
              rows={16}
              className="metal-input min-h-60 w-full resize-y rounded-xl px-3 py-2 text-sm"
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

            {/* Source URLs */}
            <div className="rounded-xl border border-white/15 bg-black/20 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">
                  Source URLs
                </p>
                {/* AI Analyzer Toggle */}
                <label className="flex cursor-pointer items-center gap-2">
                  <span className="text-[10px] text-slate-400">AI Analyzer</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={urlImport.analyzerEnabled}
                      onChange={e => setUrlImport(prev => ({ ...prev, analyzerEnabled: e.target.checked, error: '' }))}
                    />
                    <div className={`h-4 w-8 rounded-full transition-colors ${urlImport.analyzerEnabled ? 'bg-cyan-500' : 'bg-slate-600'}`} />
                    <div className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${urlImport.analyzerEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </label>
              </div>

              {/* URL input */}
              <div className="flex gap-2">
                <input
                  ref={urlInputRef}
                  type="url"
                  value={urlImport.urlInput}
                  onChange={e => setUrlImport(prev => ({ ...prev, urlInput: e.target.value, error: '' }))}
                  onKeyDown={e => e.key === 'Enter' && handleAddUrl()}
                  placeholder="https://geeksforgeeks.org/..."
                  className="metal-input flex-1 rounded-xl px-3 py-2 text-xs"
                />
                <button
                  onClick={handleAddUrl}
                  disabled={!urlImport.urlInput.trim()}
                  className="btn-accent px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>

              {urlImport.error && (
                <p className="mt-1.5 text-xs text-red-300">{urlImport.error}</p>
              )}

              {/* Saved URLs list */}
              {editor.sourceUrls.length === 0 && (
                <p className="mt-2 text-xs text-slate-500">No source URLs added yet.</p>
              )}

              {editor.sourceUrls.length > 0 && (
                <div className="mt-2 space-y-1">
                  {editor.sourceUrls.map((url, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/35 px-2 py-1">
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-[10px] text-cyan-300 hover:underline"
                      >
                        {url}
                      </a>
                      <button
                        onClick={() => setEditor(prev => ({
                          ...prev,
                          sourceUrls: prev.sourceUrls.filter((_, idx) => idx !== i),
                        }))}
                        className="shrink-0 rounded border border-red-400/50 bg-red-400/20 px-1.5 py-0.5 text-[10px] font-bold text-red-200 hover:bg-red-400/30"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Analyze button — only when toggle is on and URLs exist */}
              {urlImport.analyzerEnabled && editor.sourceUrls.length > 0 && (
                <button
                  onClick={handleAnalyzeUrls}
                  disabled={urlImport.isAnalyzing}
                  className="mt-3 w-full rounded-xl border border-cyan-400/30 bg-cyan-400/10 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {urlImport.isAnalyzing
                    ? `Analyzing ${editor.sourceUrls.length} URL(s)...`
                    : `🤖 Analyze with AI (${editor.sourceUrls.length} URL${editor.sourceUrls.length > 1 ? 's' : ''})`
                  }
                </button>
              )}

              {urlImport.analyzerEnabled && editor.sourceUrls.length === 0 && (
                <p className="mt-2 text-[10px] text-slate-500 italic">Add at least one URL to enable analysis.</p>
              )}
            </div>

            {/* AI Analysis Result Modal */}
            {urlImport.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-2xl border border-white/20 bg-slate-900 shadow-2xl">

                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-white/15 p-4">
                  <div>
                    <p className="text-sm font-bold text-white">AI Study Notes</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      Analyzed {editor.sourceUrls.length} source{editor.sourceUrls.length > 1 ? 's' : ''} · {urlImport.sections.length} sections generated
                    </p>
                    <p className="mt-1 text-xs text-slate-300">
                      Click a section · select text · import what you need
                    </p>
                  </div>
                  <button
                    onClick={() => setUrlImport(prev => ({ ...prev, isOpen: false }))}
                    className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
                  >
                    ✕ Close
                  </button>
                </div>

                {/* Two-panel layout */}
                <div className="flex min-h-0 flex-1 overflow-hidden">
                  {/* Left: section headings */}
                  <div className="w-52 shrink-0 space-y-1 overflow-y-auto border-r border-white/10 p-3">
                    <p className="mb-2 text-[10px] uppercase tracking-widest text-slate-500">Sections</p>
                    {urlImport.sections.map((section, i) => (
                      <button
                        key={i}
                        onClick={() => setUrlImport(prev => ({ ...prev, activeSectionIndex: i }))}
                        className={`w-full rounded-lg border px-2 py-2 text-left text-[11px] transition-colors ${
                          urlImport.activeSectionIndex === i
                            ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200'
                            : 'border-white/10 bg-black/30 text-slate-300 hover:bg-black/45'
                        }`}
                      >
                        {section.heading}
                      </button>
                    ))}
                  </div>

                  {/* Right: section content */}
                  <div className="flex-1 cursor-text select-text overflow-y-auto p-4 text-xs leading-7 text-slate-200 whitespace-pre-wrap">
                    {urlImport.activeSectionIndex !== null ? (
                      <>
                        <p className="mb-3 text-sm font-bold text-white">
                          {urlImport.sections[urlImport.activeSectionIndex]?.heading}
                        </p>
                        <p className="text-slate-300">
                          {urlImport.sections[urlImport.activeSectionIndex]?.text}
                        </p>
                        <p className="mt-4 text-[10px] text-slate-500 italic">
                          Highlight text you want, then click "Import Selected Text" below.
                        </p>
                      </>
                    ) : (
                      <p className="text-slate-500">← Click a section to preview</p>
                    )}
                  </div>
                </div>

                {/* Import buttons */}
                <div className="flex gap-2 border-t border-white/15 p-4">
                  <button
                    onClick={handleImportSelection}
                    className="btn-success flex-1 py-2.5 text-sm font-semibold"
                  >
                    Import Selected Text
                  </button>
                  <button
                    onClick={handleImportFullSection}
                    disabled={urlImport.activeSectionIndex === null}
                    className="btn-accent px-4 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Import Full Section
                  </button>
                  <button
                    onClick={handleAppendAll}
                    className="rounded-xl border border-slate-400/30 bg-slate-400/10 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-400/20"
                  >
                    Append All
                  </button>
                </div>
              </div>
            </div>
          )}
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
