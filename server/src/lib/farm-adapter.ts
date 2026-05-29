/**
 * farm-adapter.ts — turns an OctoAlly session into a "FarmPlot" for the
 * Agent Farm / 开心农场 UI.
 *
 * Design: the *mapping* (`sessionToPlot`) is a pure function over already-
 * resolved inputs, so it's trivially testable with no server running. The IO
 * wiring (`buildPlot`) gathers those inputs — live tracker state, project cwd,
 * git file count, token usage — and calls the pure core.
 *
 * Honesty rules baked in (see the plan review):
 *  - Test pass/fail is NOT derivable from OctoAlly today, so `testsPassed` /
 *    `testsFailed` are null, never faked. "Pests" 🐛 derive only from a real
 *    failure signal (failed status / nonzero exit code).
 *  - Tokens come from token-reader.ts (the CLIs' own logs); null when unknown.
 *  - Growth % is an explicit heuristic — perceived progress, clearly labelled.
 */

import {
  readSessionTokens,
  type NormalizedTokenUsage,
  type CliType,
} from './token-reader.js';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** Crop growth state — the farm-facing status of a plot. */
export type PlotState =
  | 'seeded'    // 🌱 created, not started        (status: pending)
  | 'growing'   // 🌿 agent actively working      (running + busy)
  | 'thirsty'   // 💧 waiting for human input     (running + waiting_for_input)
  | 'resting'   // 😴 running but idle, not stale  (running + idle, recent)
  | 'withered'  // 💀 crashed or stalled          (failed w/o exit, or idle+stale)
  | 'bugged'    // 🐛 real failure signal         (failed/nonzero exit)
  | 'ripe'      // 🍎 finished cleanly            (completed + exit 0)
  | 'fallow';   // 📦 cancelled / cleared plot    (cancelled)

/** Seed-packet crop identity, derived from the task text. */
export interface Crop {
  name: string;
  emoji: string;
  /** internal key for grouping/filtering */
  kind: 'bugfix' | 'feature' | 'refactor' | 'test' | 'docs' | 'generic';
}

export interface FarmPlot {
  plotId: string;
  projectId: string | null;
  terminalSessionId: string; // = session id, for opening the terminal drawer
  cliType: CliType;

  crop: Crop;
  cropName: string;          // convenience mirror of crop.name
  cropEmoji: string;         // STATE emoji (changes as it grows), not crop emoji
  taskName: string;

  state: PlotState;
  growthPercent: number;     // 0..100 heuristic
  promptType: string | null; // when thirsty: 'choice' | 'confirmation' | 'text'

  elapsedMs: number;         // since started (or created if not started)
  lastActivityMs: number | null;

  filesChanged: number | null;
  testsPassed: number | null; // not derivable yet — always null (see Phase: tests)
  testsFailed: number | null;

  tokensSpent: number | null;
  contextUsedPercent: number | null; // barn-fill gauge (Codex only)
  tokenDetail: NormalizedTokenUsage | null;

  harvestValue: number;      // playful yield score
}

/* ------------------------------------------------------------------ */
/* Inputs to the pure mapper                                           */
/* ------------------------------------------------------------------ */

/** The raw session row (loose — we read fields defensively). */
export interface SessionRow {
  id: string;
  project_id: string | null;
  task: string;
  status: string; // pending | running | completed | failed | cancelled
  exit_code: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  cli_type?: string | null;
  claude_session_id?: string | null;
  codex_rollout_path?: string | null;
}

/** Live state from the SessionStateTracker (may be absent). */
export interface LiveState {
  processState: 'busy' | 'idle' | 'waiting_for_input';
  lastActivity: number; // epoch ms
  promptType: string | null;
}

export interface SessionToPlotInput {
  session: SessionRow;
  /** Epoch ms "now" — injected so the mapper stays pure/testable. */
  now: number;
  live?: LiveState | null;
  filesChanged?: number | null;
  tokens?: NormalizedTokenUsage | null;
}

/* ------------------------------------------------------------------ */
/* Tuning                                                              */
/* ------------------------------------------------------------------ */

/** Idle this long while still "running" ⇒ treat as stalled/withered. */
const STALL_MS = 10 * 60 * 1000; // 10 min — matches the plan's "🦗 no output for 10 min"

/* ------------------------------------------------------------------ */
/* Crop classification (seed packets)                                  */
/* ------------------------------------------------------------------ */

const CROP_RULES: Array<{ kind: Crop['kind']; name: string; emoji: string; re: RegExp }> = [
  { kind: 'bugfix',   name: 'Bugfix Berry',   emoji: '🍓', re: /\b(bug|fix|hotfix|patch|broken|crash|error|regress)/i },
  { kind: 'test',     name: 'Test Grape',     emoji: '🍇', re: /\b(test|spec|coverage|e2e|unit|jest|vitest|pytest)/i },
  { kind: 'docs',     name: 'Docs Carrot',    emoji: '🥕', re: /\b(doc|readme|comment|changelog|guide|tutorial)/i },
  { kind: 'refactor', name: 'Refactor Corn',  emoji: '🌽', re: /\b(refactor|cleanup|rename|reorganiz|restructure|simplif|tidy)/i },
  { kind: 'feature',  name: 'Feature Apple',  emoji: '🍎', re: /\b(add|implement|feature|build|create|support|new)\b/i },
];

export function classifyCrop(task: string): Crop {
  for (const rule of CROP_RULES) {
    if (rule.re.test(task)) return { kind: rule.kind, name: rule.name, emoji: rule.emoji };
  }
  return { kind: 'generic', name: 'Sprout', emoji: '🌱' };
}

/* ------------------------------------------------------------------ */
/* State + emoji                                                       */
/* ------------------------------------------------------------------ */

const STATE_EMOJI: Record<PlotState, string> = {
  seeded: '🌱',
  growing: '🌿',
  thirsty: '💧',
  resting: '😴',
  withered: '💀',
  bugged: '🐛',
  ripe: '🍎',
  fallow: '📦',
};

export function plotStateEmoji(state: PlotState): string {
  return STATE_EMOJI[state];
}

function deriveState(session: SessionRow, live: LiveState | null | undefined, now: number): PlotState {
  const status = session.status;
  const exit = session.exit_code;

  if (status === 'pending') return 'seeded';
  if (status === 'cancelled') return 'fallow';

  if (status === 'completed') {
    return exit == null || exit === 0 ? 'ripe' : 'bugged';
  }

  if (status === 'failed') {
    // Nonzero exit = an agent/test failure (pest). No exit recorded = a crash (wither).
    return exit != null && exit !== 0 ? 'bugged' : 'withered';
  }

  // status === 'running' (or anything else still alive)
  if (live) {
    if (live.processState === 'waiting_for_input') return 'thirsty';
    if (live.processState === 'busy') return 'growing';
    if (live.processState === 'idle') {
      const stale = now - live.lastActivity > STALL_MS;
      return stale ? 'withered' : 'resting';
    }
  }
  return 'growing';
}

/* ------------------------------------------------------------------ */
/* Growth heuristic                                                    */
/* ------------------------------------------------------------------ */

function deriveGrowth(state: PlotState, filesChanged: number | null): number {
  switch (state) {
    case 'seeded':
      return 0;
    case 'ripe':
      return 100;
    case 'bugged':
    case 'withered':
    case 'fallow':
      // Stalled crops keep whatever progress they made; show files-touched signal.
      return filesChanged && filesChanged > 0 ? 40 : 15;
    case 'thirsty':
      // Blocked on a human — held at a "needs you" level regardless of files.
      return filesChanged && filesChanged > 0 ? 55 : 35;
    case 'resting':
      return filesChanged && filesChanged > 0 ? 80 : 50;
    case 'growing':
    default: {
      // process started = 10; files touched bumps toward 60.
      if (!filesChanged || filesChanged <= 0) return 20;
      return Math.min(60, 30 + filesChanged * 5);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Harvest value (playful yield)                                       */
/* ------------------------------------------------------------------ */

function deriveHarvestValue(
  state: PlotState,
  filesChanged: number | null,
  tokens: NormalizedTokenUsage | null,
): number {
  let v = 0;
  if (filesChanged && filesChanged > 0) v += filesChanged * 10;
  // Reward real output work (output tokens) lightly, in "coins".
  if (tokens) v += Math.round(tokens.outputTokens / 1000);
  if (state === 'ripe') v += 50; // ripe-harvest bonus
  if (state === 'bugged' || state === 'withered') v = Math.round(v * 0.3); // damaged yield
  return v;
}

/* ------------------------------------------------------------------ */
/* Pure mapper                                                         */
/* ------------------------------------------------------------------ */

export function sessionToPlot(input: SessionToPlotInput): FarmPlot {
  const { session, now, live, filesChanged = null, tokens = null } = input;

  const crop = classifyCrop(session.task);
  const state = deriveState(session, live, now);

  const startMs = session.started_at ? Date.parse(session.started_at) : Date.parse(session.created_at);
  const endMs = session.completed_at ? Date.parse(session.completed_at) : now;
  const elapsedMs = Math.max(0, endMs - (Number.isNaN(startMs) ? endMs : startMs));

  return {
    plotId: session.id,
    projectId: session.project_id,
    terminalSessionId: session.id,
    cliType: session.cli_type === 'codex' ? 'codex' : 'claude',

    crop,
    cropName: crop.name,
    cropEmoji: plotStateEmoji(state),
    taskName: session.task,

    state,
    growthPercent: deriveGrowth(state, filesChanged),
    promptType: state === 'thirsty' ? (live?.promptType ?? null) : null,

    elapsedMs,
    lastActivityMs: live?.lastActivity ?? null,

    filesChanged,
    testsPassed: null, // not derivable yet — see "real test detection" phase
    testsFailed: null,

    tokensSpent: tokens?.totalTokens ?? null,
    contextUsedPercent: tokens?.contextUsedPercent ?? null,
    tokenDetail: tokens,

    harvestValue: deriveHarvestValue(state, filesChanged, tokens),
  };
}

/* ------------------------------------------------------------------ */
/* IO wiring                                                           */
/* ------------------------------------------------------------------ */

export interface BuildPlotDeps {
  /** epoch ms; injectable for tests. Defaults to Date.now() at call site. */
  now: number;
  /** resolve the project cwd for a session (project_id → projects.path). */
  resolveCwd: (session: SessionRow) => string | null;
  /** live tracker state, or null if none. */
  getLiveState: (sessionId: string) => LiveState | null;
  /** number of changed files in the repo, or null if not a repo / error. */
  getFilesChanged: (cwd: string) => number | null;
}

/**
 * Enrich one session into a FarmPlot, doing the filesystem/token IO.
 * Token reading is wired to token-reader.ts using the session's cwd + ids.
 */
export function buildPlot(session: SessionRow, deps: BuildPlotDeps): FarmPlot {
  const cwd = deps.resolveCwd(session);
  const cliType: CliType = session.cli_type === 'codex' ? 'codex' : 'claude';

  let tokens: NormalizedTokenUsage | null = null;
  if (cwd) {
    tokens = readSessionTokens({
      cliType,
      cwd,
      claudeUuid: session.claude_session_id ?? undefined,
      // Prefer the rollout captured at spawn; readSessionTokens falls back to
      // cwd-matching when this is absent (e.g. sessions started before this).
      codexRolloutPath: session.codex_rollout_path ?? undefined,
    });
  }

  return sessionToPlot({
    session,
    now: deps.now,
    live: deps.getLiveState(session.id),
    filesChanged: cwd ? deps.getFilesChanged(cwd) : null,
    tokens,
  });
}
