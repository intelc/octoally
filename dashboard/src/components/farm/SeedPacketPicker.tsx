import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Sprout, X, Plus, Loader2, FolderOpen } from 'lucide-react';

/**
 * Plant a new crop = start a new agent session.
 * Steps: pick project (or create one) → CLI + optional specialist agent → prompt → Plant.
 */
export function SeedPacketPicker({ onClose, onPlanted, promptHint = '' }: { onClose: () => void; onPlanted: () => void; promptHint?: string }) {
  const projectsQ = useQuery({ queryKey: ['projects'], queryFn: () => api.projects.list() });
  const projects = projectsQ.data?.projects ?? [];

  const [projectId, setProjectId] = useState<string | null>(null);
  const [newPath, setNewPath] = useState('');
  const [creating, setCreating] = useState(false);
  const [cliType, setCliType] = useState<'claude' | 'codex'>('claude');
  const [agentType, setAgentType] = useState<string>(''); // '' = plain session
  const [prompt, setPrompt] = useState(promptHint);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = projects.find((p) => p.id === projectId) ?? null;
  const agentsQ = useQuery({
    queryKey: ['ruflo-agents', projectId],
    queryFn: () => api.projects.rufloAgents(projectId as string),
    enabled: !!projectId,
  });
  const agents = agentsQ.data?.agents ?? [];

  const createProject = async () => {
    const path = newPath.trim();
    if (!path) return;
    setCreating(true);
    setError(null);
    try {
      const name = path.replace(/\/+$/, '').split('/').pop() || path;
      const res = await api.projects.create({ name, path });
      await projectsQ.refetch();
      setProjectId(res.project.id);
      setNewPath('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add project');
    } finally {
      setCreating(false);
    }
  };

  const plant = async () => {
    if (!selected || !prompt.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.sessions.create({
        project_path: selected.path,
        task: prompt.trim(),
        mode: agentType ? 'agent' : 'session',
        agent_type: agentType || undefined,
        project_id: selected.id,
        cli_type: cliType,
      });
      onPlanted();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to plant');
    } finally {
      setBusy(false);
    }
  };

  const pill = (activeSel: boolean) => ({
    background: activeSel ? 'var(--accent)' : 'var(--bg-tertiary)',
    color: activeSel ? 'white' : 'var(--text-secondary)',
    border: '1px solid var(--border)',
  });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl p-5 flex flex-col gap-4 max-h-[85vh] overflow-auto"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Sprout className="w-5 h-5" style={{ color: '#4ade80' }} />
          <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Plant a new crop 🌱</span>
          <button onClick={onClose} className="ml-auto p-1 rounded hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step 1: project */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>1 · Soil (project)</span>
          {projectsQ.isLoading ? (
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}><Loader2 className="w-3 h-3 animate-spin" /> loading…</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProjectId(p.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
                  style={pill(projectId === p.id)}
                  title={p.path}
                >
                  <FolderOpen className="w-3 h-3" /> {p.name}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-1.5">
            <input
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="/abs/path/to/new/project"
              className="flex-1 rounded-md px-2 py-1 text-xs outline-none"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
            <button
              onClick={createProject}
              disabled={creating || !newPath.trim()}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium disabled:opacity-50"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add
            </button>
          </div>
        </div>

        {/* Step 2: CLI + agent */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>2 · Seed type (agent)</span>
          <div className="flex gap-1.5">
            {(['claude', 'codex'] as const).map((c) => (
              <button key={c} onClick={() => setCliType(c)} className="px-2 py-1 rounded-md text-xs font-medium capitalize" style={pill(cliType === c)}>{c}</button>
            ))}
          </div>
          <select
            value={agentType}
            onChange={(e) => setAgentType(e.target.value)}
            disabled={!projectId}
            className="rounded-md px-2 py-1 text-xs outline-none disabled:opacity-50"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            <option value="">Quick session (no specialist)</option>
            {agents.map((a) => (
              <option key={a.name} value={a.name}>{a.name}</option>
            ))}
          </select>
        </div>

        {/* Step 3: prompt */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>3 · Task (prompt)</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="e.g. Fix the login crash on Safari and add a regression test."
            className="w-full rounded-md p-2 text-sm resize-none outline-none"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          />
        </div>

        {error && <span className="text-xs" style={{ color: 'var(--error)' }}>{error}</span>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md text-xs" style={{ color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}>Cancel</button>
          <button
            onClick={plant}
            disabled={busy || !selected || !prompt.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold disabled:opacity-50"
            style={{ background: '#4ade80', color: '#0a2a12' }}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sprout className="w-3.5 h-3.5" />} Plant
          </button>
        </div>
      </div>
    </div>
  );
}
