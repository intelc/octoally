/**
 * farm-service.ts — server-side IO wiring for the farm adapter.
 *
 * Resolves the dependencies buildPlot() needs (project cwd, live tracker state,
 * git file count) against the real DB / tracker / git, then maps sessions to
 * FarmPlots. Kept separate from the pure adapter so the adapter stays testable.
 */

import { execFileSync } from 'child_process';
import { getDb } from '../db/index.js';
import * as sessionManager from '../services/session-manager.js';
import { getTracker } from '../services/session-state.js';
import {
  buildPlot,
  type FarmPlot,
  type SessionRow,
  type LiveState,
} from './farm-adapter.js';

/** project_id → projects.path, cached per call batch. */
function makeCwdResolver(): (s: SessionRow) => string | null {
  const cache = new Map<string, string | null>();
  return (s) => {
    if (!s.project_id) return null;
    if (cache.has(s.project_id)) return cache.get(s.project_id)!;
    const row = getDb()
      .prepare('SELECT path FROM projects WHERE id = ?')
      .get(s.project_id) as { path?: string } | undefined;
    const cwd = row?.path ?? null;
    cache.set(s.project_id, cwd);
    return cwd;
  };
}

function getLiveState(sessionId: string): LiveState | null {
  const tracker = getTracker(sessionId);
  if (!tracker) return null;
  const st = tracker.state;
  return {
    processState: st.processState,
    lastActivity: st.lastActivity,
    promptType: st.promptType,
  };
}

/** Count changed files via `git status --porcelain`; null if not a repo / error. */
function getFilesChanged(cwd: string): number | null {
  try {
    const out = execFileSync('git', ['-C', cwd, 'status', '--porcelain=v1'], {
      encoding: 'utf8',
      timeout: 3000,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    if (!out.trim()) return 0;
    return out.split('\n').filter((l) => l.trim().length > 0).length;
  } catch {
    return null;
  }
}

/** Build all plots for the current (active + recent) sessions. */
export function listPlots(status?: string): FarmPlot[] {
  const sessions = sessionManager.listSessions(status) as unknown as SessionRow[];
  const deps = {
    now: Date.now(),
    resolveCwd: makeCwdResolver(),
    getLiveState,
    getFilesChanged,
  };
  return sessions.map((s) => buildPlot(s, deps));
}

/** Build a single plot, or null if the session doesn't exist. */
export function getPlot(sessionId: string): FarmPlot | null {
  const session = sessionManager.getSession(sessionId) as unknown as SessionRow | null;
  if (!session) return null;
  return buildPlot(session, {
    now: Date.now(),
    resolveCwd: makeCwdResolver(),
    getLiveState,
    getFilesChanged,
  });
}
