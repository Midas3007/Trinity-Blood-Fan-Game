import world from '../data/world.json';

/** Fast travel between altars (src/data/world.json → fastTravel). Pure; tested. */
export interface TravelAltar {
  room: string;
  id: string;
  area: string;
  name: string;
}

const data = (world as unknown as { fastTravel: { areas: Record<string, string>; altars: TravelAltar[] } }).fastTravel;
export const travelAltars = data.altars;
export const travelAreas = data.areas;

export function travelAltar(room: string, id: string): TravelAltar | null {
  return travelAltars.find((a) => a.room === room && a.id === id) ?? null;
}

/** An altar's area is open for travel once the boss beyond it is beaten. */
export function areaOpen(area: string, has: (flag: string) => boolean): boolean {
  const flag = travelAreas[area];
  return flag !== undefined && has(flag);
}

/** Where you can travel from this altar: other altars you have prayed at, in open areas (none if this one is closed). */
export function destinations(room: string, id: string, has: (flag: string) => boolean): TravelAltar[] {
  const here = travelAltar(room, id);
  if (!here || !areaOpen(here.area, has)) return [];
  return travelAltars.filter((a) => !(a.room === room && a.id === id) && areaOpen(a.area, has) && has(`altar:${a.room}:${a.id}`));
}
