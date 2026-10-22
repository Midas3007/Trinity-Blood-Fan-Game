import world from '../data/world.json';

/** A map region: its rooms' colours (as on the poster, tools/social/map.py). */
export interface MapRegion {
  id: string;
  name: string;
  fill: number;
  rock: number;
  line: number;
  rooms: string[];
}

interface RawRegion {
  name: string;
  fill: string;
  rock: string;
  line: string;
  rooms: string[];
}

const raw = (world as unknown as {
  map: { regions: Record<string, RawRegion>; areas: { id: string; title: string; regions: string[] }[]; offset: Record<string, { dx: number; dy: number }> };
}).map;
const hex = (h: string): number => Number(h.replace('#', '0x'));

export const mapRegions: MapRegion[] = Object.entries(raw.regions).map(([id, r]) => ({ id, name: r.name, fill: hex(r.fill), rock: hex(r.rock), line: hex(r.line), rooms: r.rooms }));
export const mapAreas = raw.areas;

/** The region a room is drawn in (null = not on any map). Pure. */
export function regionOf(roomId: string): MapRegion | null {
  return mapRegions.find((r) => r.rooms.includes(roomId)) ?? null;
}

/** The area (one city's map) a room belongs to. Pure. */
export function areaOf(roomId: string): { id: string; title: string; regions: string[] } | null {
  const reg = regionOf(roomId);
  return reg ? (mapAreas.find((a) => a.regions.includes(reg.id)) ?? null) : null;
}

/** Where a room is drawn on the map, in screen cells (its world grid position, moved for the map only). Pure. */
export function mapCell(roomId: string, gridX: number, gridY: number): { x: number; y: number } {
  const o = raw.offset[roomId];
  return { x: gridX + (o?.dx ?? 0), y: gridY + (o?.dy ?? 0) };
}
