/**
 * token-reader.ts — unified token accounting for Claude Code and Codex sessions.
 *
 * OctoAlly does NOT extract token usage out of the box (its jsonl-reader only
 * captures session output/UUIDs). This util reads the CLIs' own on-disk session
 * logs and normalizes them into one shape so the farm UI can render
 * `tokensSpent` / `harvestValue` / a context-fill gauge per plot.
 *
 * Two CLIs, two formats — both verified against real files:
 *
 *   Claude:  ~/.claude/projects/<sanitized-cwd>/<uuid>.jsonl
 *            per-message `message.usage` (input/output/cache_*) — must be SUMMED.
 *
 *   Codex:   ~/.codex/sessions/YYYY/MM/DD/rollout-<ISO>-<uuid>.jsonl
 *            line 1 `session_meta` { payload.id, payload.cwd };
 *            cumulative tokens in the LAST `token_count` event — just take last.
 *
 * Sync IO on purpose: matches OctoAlly's better-sqlite3 sync style and keeps the
 * call sites trivial. Files can be large; we read once and scan, which is fine
 * for a demo. Swap to a reverse byte-scan later if it ever matters.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export type CliType = 'claude' | 'codex';

/** One normalized usage record, whichever CLI produced it. */
export interface NormalizedTokenUsage {
  cliType: CliType;
  /** Headline number for the plot card: total tokens attributable to the session. */
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  /** Cached/reused input tokens (cheap rereads). Big, and inflates totalTokens — surface separately if you want an "honest work" number. */
  cachedInputTokens: number;
  /** Codex reasoning tokens; always 0 for Claude. */
  reasoningTokens: number;
  /** Model context window if the log reports it (Codex does; Claude doesn't). */
  contextWindow: number | null;
  /** 0..100 "how full is the barn" gauge, or null if window unknown. */
  contextUsedPercent: number | null;
  /** Absolute path of the file this was read from (useful for caching/debug). */
  source: string;
}

const CODEX_SESSIONS_DIR = join(homedir(), '.codex', 'sessions');
const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects');

/* ------------------------------------------------------------------ */
/* Codex                                                               */
/* ------------------------------------------------------------------ */

/** Recursively list every rollout-*.jsonl under ~/.codex/sessions. */
function listCodexRollouts(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return; // dir missing / unreadable
    }
    for (const name of entries) {
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(full);
      else if (name.startsWith('rollout-') && name.endsWith('.jsonl')) out.push(full);
    }
  };
  walk(CODEX_SESSIONS_DIR);
  return out;
}

/**
 * Snapshot current rollout paths. Call this RIGHT BEFORE spawning a Codex
 * session, then pass the result to `discoverNewCodexRollout` after spawn —
 * exactly mirroring how OctoAlly diffs the Claude project dir for new UUIDs.
 */
export function snapshotCodexRollouts(): Set<string> {
  return new Set(listCodexRollouts());
}

/**
 * Find the rollout file created since `before`. If `cwd` is given, prefer a
 * rollout whose session_meta.cwd matches (robust when several spawn at once);
 * otherwise fall back to the newest new file.
 */
export function discoverNewCodexRollout(before: Set<string>, cwd?: string): string | null {
  const fresh = listCodexRollouts().filter((p) => !before.has(p));
  if (fresh.length === 0) return null;
  if (cwd) {
    const match = fresh.find((p) => readCodexMetaCwd(p) === cwd);
    if (match) return match;
  }
  // newest by mtime
  return fresh
    .map((p) => ({ p, m: safeMtime(p) }))
    .sort((a, b) => b.m - a.m)[0].p;
}

/** Fallback when you didn't snapshot: newest rollout whose meta.cwd matches. */
export function findCodexRolloutByCwd(cwd: string): string | null {
  const matches = listCodexRollouts()
    .filter((p) => readCodexMetaCwd(p) === cwd)
    .map((p) => ({ p, m: safeMtime(p) }))
    .sort((a, b) => b.m - a.m);
  return matches.length ? matches[0].p : null;
}

/** Read only line 1 (session_meta) to get the recorded cwd. */
function readCodexMetaCwd(rolloutPath: string): string | null {
  try {
    const firstLine = readFileSync(rolloutPath, 'utf8').split('\n', 1)[0];
    const rec = JSON.parse(firstLine);
    if (rec?.type === 'session_meta') return rec.payload?.cwd ?? null;
  } catch {
    /* ignore */
  }
  return null;
}

/** Parse cumulative token usage from a Codex rollout (uses the LAST token_count event). */
export function readCodexTokens(rolloutPath: string): NormalizedTokenUsage | null {
  let lines: string[];
  try {
    lines = readFileSync(rolloutPath, 'utf8').split('\n');
  } catch {
    return null;
  }

  let info: any = null;
  // Scan from the end — the last token_count holds the running totals.
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line || line.indexOf('token_count') === -1) continue;
    try {
      const rec = JSON.parse(line);
      if (rec?.type === 'event_msg' && rec.payload?.type === 'token_count') {
        info = rec.payload.info;
        break;
      }
    } catch {
      /* partial/truncated line — keep scanning */
    }
  }
  if (!info) return null;

  const u = info.total_token_usage ?? {};
  const window = typeof info.model_context_window === 'number' ? info.model_context_window : null;
  // "Live" context size ≈ this turn's input (incl. cache) — the better signal for a fill gauge.
  const live = info.last_token_usage?.total_tokens ?? u.total_tokens ?? 0;

  return {
    cliType: 'codex',
    totalTokens: u.total_tokens ?? 0,
    inputTokens: u.input_tokens ?? 0,
    outputTokens: u.output_tokens ?? 0,
    cachedInputTokens: u.cached_input_tokens ?? 0,
    reasoningTokens: u.reasoning_output_tokens ?? 0,
    contextWindow: window,
    contextUsedPercent: window ? Math.min(100, Math.round((live / window) * 100)) : null,
    source: rolloutPath,
  };
}

/* ------------------------------------------------------------------ */
/* Claude                                                              */
/* ------------------------------------------------------------------ */

/** Mirror Claude Code's project-dir naming: cwd with non-alphanumerics → '-'. */
export function sanitizeClaudeProjectDir(cwd: string): string {
  return cwd.replace(/[^a-zA-Z0-9]/g, '-');
}

/**
 * Resolve a Claude session's jsonl path. If you already captured the uuid
 * (OctoAlly does this on spawn), pass it; otherwise we take the newest jsonl
 * in the project dir.
 */
export function findClaudeJsonl(cwd: string, uuid?: string): string | null {
  const dir = join(CLAUDE_PROJECTS_DIR, sanitizeClaudeProjectDir(cwd));
  if (uuid) {
    const p = join(dir, `${uuid}.jsonl`);
    return existsSync(p) ? p : null;
  }
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.jsonl') && !f.includes('-topic-'));
  } catch {
    return null;
  }
  if (!files.length) return null;
  return files
    .map((f) => ({ p: join(dir, f), m: safeMtime(join(dir, f)) }))
    .sort((a, b) => b.m - a.m)[0].p;
}

/** Sum per-message usage across a Claude session jsonl. */
export function readClaudeTokens(jsonlPath: string): NormalizedTokenUsage | null {
  let lines: string[];
  try {
    lines = readFileSync(jsonlPath, 'utf8').split('\n');
  } catch {
    return null;
  }

  let input = 0;
  let output = 0;
  let cached = 0;
  let cacheCreate = 0;
  let seen = false;

  for (const line of lines) {
    if (!line || line.indexOf('"usage"') === -1) continue;
    try {
      const rec = JSON.parse(line);
      const usage = rec?.message?.usage;
      if (!usage) continue;
      seen = true;
      input += usage.input_tokens ?? 0;
      output += usage.output_tokens ?? 0;
      cached += usage.cache_read_input_tokens ?? 0;
      cacheCreate += usage.cache_creation_input_tokens ?? 0;
    } catch {
      /* skip bad line */
    }
  }
  if (!seen) return null;

  // NOTE: cache_read_input_tokens recounts context every turn, so totalTokens is
  // an *upper bound*. For an "honest work done" number use outputTokens (and
  // input+cacheCreation), not totalTokens. Claude's jsonl doesn't report the
  // context window, so the fill gauge stays null for Claude plots.
  return {
    cliType: 'claude',
    totalTokens: input + output + cached + cacheCreate,
    inputTokens: input + cacheCreate,
    outputTokens: output,
    cachedInputTokens: cached,
    reasoningTokens: 0,
    contextWindow: null,
    contextUsedPercent: null,
    source: jsonlPath,
  };
}

/* ------------------------------------------------------------------ */
/* Unified entry point                                                 */
/* ------------------------------------------------------------------ */

export interface ReadSessionTokensArgs {
  cliType: CliType;
  cwd: string;
  /** Claude: the captured session uuid (preferred). */
  claudeUuid?: string;
  /** Codex: the rollout path stored at spawn time (preferred). */
  codexRolloutPath?: string;
}

/**
 * One call for the farm-state adapter. Returns null if no usage is available
 * yet (e.g. session just started, agent hasn't produced a token event) — the
 * UI should render that as "tokens: —", never a fake number.
 */
export function readSessionTokens(args: ReadSessionTokensArgs): NormalizedTokenUsage | null {
  if (args.cliType === 'codex') {
    const path = args.codexRolloutPath ?? findCodexRolloutByCwd(args.cwd);
    return path ? readCodexTokens(path) : null;
  }
  const path = findClaudeJsonl(args.cwd, args.claudeUuid);
  return path ? readClaudeTokens(path) : null;
}

/* ------------------------------------------------------------------ */

function safeMtime(p: string): number {
  try {
    return statSync(p).mtimeMs;
  } catch {
    return 0;
  }
}
