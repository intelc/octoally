import { useMemo } from 'react';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '../../../server/src/trpc/router.js';
import { trpc } from '../lib/trpc';
import { computeHud, type HudStats } from './farmAggregates';

export type Plot = inferRouterOutputs<AppRouter>['farm']['plots'][number];

export interface FarmGame {
  plots: Plot[];
  hud: HudStats;
  isLoading: boolean;
}

export function useFarmGame(active: boolean): FarmGame {
  const { data, isLoading } = trpc.farm.plots.useQuery(undefined, {
    refetchInterval: active ? 4000 : false,
    enabled: active,
  });
  const plots = useMemo(() => data ?? [], [data]);
  const hud = useMemo(() => computeHud(plots), [plots]);
  return { plots, hud, isLoading };
}
