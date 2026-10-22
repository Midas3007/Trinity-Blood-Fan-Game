import raw from '../../data/flyers.json';

/** A swarm marker: one map marker that becomes `count` flyers of `type`, spread round it (src/data/flyers.json). */
export interface SwarmConfig {
  type: string;
  count: number;
  /** Distance between neighbours (px). */
  spread: number;
}

export const swarmConfigs = (raw as unknown as { swarms?: Record<string, SwarmConfig> }).swarms ?? {};

/** Replaces each swarm marker with its members, in a loose arc round the marker; other markers are unchanged. Pure. */
export function expandSwarms<T extends { type: string; x: number; y: number }>(spawns: T[], swarms: Record<string, SwarmConfig> = swarmConfigs): T[] {
  return spawns.flatMap((sp) => {
    const s = swarms[sp.type];
    if (!s) return [sp];
    return Array.from({ length: s.count }, (_, i) => {
      const k = i - (s.count - 1) / 2;
      return { ...sp, type: s.type, x: sp.x + k * s.spread, y: sp.y - Math.abs(k) * s.spread * 0.5 };
    });
  });
}
