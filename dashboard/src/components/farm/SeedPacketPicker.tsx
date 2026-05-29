import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Sprout, X, Plus, Loader2, CornerDownLeft } from 'lucide-react';

/**
 * Plant a new crop = start a new agent session.
 * Composer-style (à la Claude Code / Codex): the task prompt is the hero, with
 * project / CLI / agent as compact controls beneath it — dressed as a QQ农场 seed packet.
 */
export function SeedPacketPicker({ onClose, onPlanted, promptHint = '' }: { onClose: () => void; onPlanted: () => void; promptHint?: string }) {
  const projectsQ = useQuery({ queryKey: ['projects'], queryFn: () => api.projects.list() });
  const projects = projectsQ.data?.projects ?? [];

  const [projectId, setProjectId] = useState<string | null>(null);
  const [newProject, setNewProject] = useState(false);
  const [newPath, setNewPath] = useState('');
  const [creating, setCreating] = useState(false);
  const [cliType, setCliType] = useState<'claude' | 'codex'>('claude');
  const [agentType, setAgentType] = useState<string>('');
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
      setNewProject(false);
      setNewPath('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add project');
    } finally {
      setCreating(false);
    }
  };

  const canPlant = !!selected && !!prompt.trim() && !busy;
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

  // ── theme tokens (parchment/wood, matching the shop) ──
  const chip: React.CSSProperties = {
    background: '#fff8e6', color: '#7a531a', border: '2px solid #d6a64a',
    borderRadius: 9, padding: '4px 8px', fontSize: 12, fontWeight: 700,
  };
  const seg = (on: boolean): React.CSSProperties => ({
    padding: '4px 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer',
    background: on ? '#ff8a3d' : 'transparent', color: on ? '#fff' : '#a07636',
  });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#f3e0b8', border: '3px solid #b07b3a', boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ribbon header */}
        <div className="relative flex items-center justify-center py-2.5" style={{ background: '#ff8a3d', borderBottom: '3px solid #d96a20' }}>
          <span className="text-lg font-black flex items-center gap-2" style={{ color: '#fff', textShadow: '0 2px 0 #d96a20' }}>
            <Sprout className="w-5 h-5" /> 种地 · Plant a Crop
          </span>
          <button onClick={onClose} className="absolute right-3 p-1 rounded-full" style={{ background: '#fff', color: '#d96a20' }}><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          {/* Composer card — prompt is the hero */}
          <div className="rounded-xl flex flex-col" style={{ background: '#fffaf0', border: '2px solid #c79a52' }}>
            <textarea
              autoFocus
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') plant(); }}
              rows={4}
              placeholder="Describe the crop to plant…  (e.g. Fix the login crash on Safari and add a regression test)"
              className="w-full bg-transparent resize-none outline-none p-3 text-sm"
              style={{ color: '#5a3d12' }}
            />
            {/* Control row: project · CLI · agent · Plant (composer-style) */}
            <div className="flex items-center gap-2 flex-wrap px-2.5 py-2" style={{ borderTop: '1px solid #e6cd96' }}>
              {/* Project */}
              <select
                value={projectId ?? ''}
                onChange={(e) => { if (e.target.value === '__new__') { setNewProject(true); } else { setProjectId(e.target.value || null); setNewProject(false); } }}
                style={{ ...chip, maxWidth: 180 }}
                title="Soil — project"
              >
                <option value="" disabled>📁 Pick project…</option>
                {projects.map((p) => <option key={p.id} value={p.id}>📁 {p.name}</option>)}
                <option value="__new__">＋ New project…</option>
              </select>

              {/* CLI segmented */}
              <div className="flex rounded-lg overflow-hidden" style={{ border: '2px solid #d6a64a' }}>
                {(['claude', 'codex'] as const).map((c) => (
                  <button key={c} onClick={() => setCliType(c)} style={seg(cliType === c)} className="capitalize">{c}</button>
                ))}
              </div>

              {/* Agent */}
              <select
                value={agentType}
                onChange={(e) => setAgentType(e.target.value)}
                disabled={!projectId}
                style={{ ...chip, maxWidth: 170, opacity: projectId ? 1 : 0.5 }}
                title="Seed type — specialist agent"
              >
                <option value="">🌱 Quick session</option>
                {agents.map((a) => <option key={a.name} value={a.name}>🤖 {a.name}</option>)}
              </select>

              {/* Plant (send) */}
              <button
                onClick={plant}
                disabled={!canPlant}
                className="ml-auto flex items-center gap-1.5 rounded-lg transition-transform hover:scale-[1.03]"
                style={{ background: canPlant ? '#6cc24a' : '#bcae8e', color: '#fff', border: '2px solid', borderColor: canPlant ? '#4a9a2e' : '#a39468', padding: '5px 14px', fontSize: 13, fontWeight: 900, cursor: canPlant ? 'pointer' : 'default' }}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sprout className="w-4 h-4" />}
                Plant
                <CornerDownLeft className="w-3.5 h-3.5 opacity-80" />
              </button>
            </div>
          </div>

          {/* New-project inline row */}
          {newProject && (
            <div className="flex gap-1.5 items-center">
              <Plus className="w-4 h-4" style={{ color: '#8a5a2a' }} />
              <input
                autoFocus
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') createProject(); }}
                placeholder="/abs/path/to/new/project"
                className="flex-1 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                style={{ background: '#fffaf0', color: '#5a3d12', border: '2px solid #c79a52' }}
              />
              <button onClick={createProject} disabled={creating || !newPath.trim()} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold disabled:opacity-50" style={{ background: '#fff8e6', color: '#7a531a', border: '2px solid #d6a64a' }}>
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add'}
              </button>
            </div>
          )}

          {/* Hint + error */}
          <div className="flex items-center justify-between text-[11px]" style={{ color: '#a07636' }}>
            <span>{selected ? `Planting in ${selected.name} · ${agentType || 'quick session'}` : 'Pick soil to plant in'}</span>
            <span style={{ opacity: 0.8 }}>⌘↵ to plant</span>
          </div>
          {error && <span className="text-xs font-semibold" style={{ color: '#c2410c' }}>{error}</span>}
        </div>
      </div>
    </div>
  );
}
