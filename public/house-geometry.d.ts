export { HOUSE_WORLD_VERSION } from './house-version.js';
export interface Point { x: number; z: number; }
export interface Obstacle extends Point { id?: string; w: number; d: number; }
export interface Seat extends Point { id: string; heading: number; target: Point; purpose: 'study' | 'rest' | 'game' | 'bedroom'; fixtureId?: string; }
export interface Door extends Point { id: string; slot: number; wall: 'rear' | 'side'; target: Point; }
export interface Layout { width: number; depth: number; obstacles: Obstacle[]; seats: Seat[]; doors: Door[]; spawn: Point; boardTarget: Point; exitTarget: Point; arrivals?: Point[]; gameTarget?: Point; }
export interface Placement extends Point { id: string; kind: string; rotation: number; }
export const AVATAR_RADIUS: number;
export const ROOM_DIMENSIONS: Readonly<{ lounge: Readonly<{ width: number; depth: number }>; bedroom: Readonly<{ width: number; depth: number }> }>;
export const BEDROOM_ARRIVAL: Readonly<Point>;
export const BEDROOM_EXIT: Readonly<Point>;
export const CAMERA_ORIENTATION: Readonly<{ x: number; y: number; z: number; lookY: number }>;
export const AVATAR_HEIGHT: number;
export const SEATED_LIFT: number;
export const FURNITURE_HEIGHTS: Readonly<{ chairSeat: number; deskTop: number; tableTop: number }>;
export const COLOURS: readonly string[];
export const FURNITURE: Readonly<Record<string, Readonly<{ w: number; d: number }>>>;
export const LOUNGE_VARIANTS: Readonly<Record<'compact' | 'expanded', Readonly<{ width: number; depth: number; doorSpacing: number; spawnZ: number; table: readonly number[]; game: readonly number[]; restOffset: readonly number[]; tea: readonly number[]; books: readonly number[]; pot: readonly number[]; lamp: readonly number[]; board: readonly number[]; boardApproach: readonly number[]; exitZ: number }>>>;
export function createLayout(capacity?: number, variant?: 'compact' | 'expanded'): Layout;
export function footprint(placement: Placement): Obstacle;
export function validatePlacements(value: unknown): boolean;
export function bedroomLayout(placements?: Placement[]): Layout;
export function validPosition(layout: Layout, point: Point): boolean;
export function slide(layout: Layout, pos: Point, dx: number, dz: number): Point;
export function findRoute(layout: Layout, start: Point, destination: Point): Point[] | null;
