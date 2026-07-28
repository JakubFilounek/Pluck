/**
 * Behaviour for the two cats.
 *
 * Kept out of the component and free of DOM access so the decision rules can be
 * tested: an idle loop that visibly misbehaves (a cat sleeping forever, or the pair
 * walking in permanent lockstep) is otherwise only findable by watching it.
 */

export type CatPose = 'sit' | 'walk' | 'run' | 'lie' | 'sleep' | 'groom';

export type CatState = {
  /** Position along the floor, in scene units. */
  x: number;
  /** 1 faces right, -1 faces left. */
  facing: 1 | -1;
  pose: CatPose;
  /** How long the current action lasts, in ms. */
  duration: number;
};

export type SceneBounds = {
  min: number;
  max: number;
};

/** Travel speed in scene units per second. */
const SPEED: Record<'walk' | 'run', number> = { walk: 26, run: 88 };

/** How long a stationary pose is held, in ms. */
const REST_MS: Record<'sit' | 'lie' | 'sleep' | 'groom', [number, number]> = {
  sit: [1800, 5000],
  lie: [4000, 9000],
  sleep: [7000, 15000],
  groom: [2000, 4000],
};

type Random = () => number;

function between(random: Random, min: number, max: number): number {
  return min + random() * (max - min);
}

function pick<T>(random: Random, options: T[]): T {
  return options[Math.floor(random() * options.length)] ?? options[0]!;
}

/**
 * Chooses what a cat does next.
 *
 * Weighted so a cat that has been moving tends to settle, and one that has been
 * still tends to get up — without that, random choice produces long stretches of a
 * cat twitching between two stationary poses.
 */
export function nextPose(random: Random, current: CatPose): CatPose {
  if (current === 'walk' || current === 'run') {
    return pick(random, ['sit', 'sit', 'lie', 'groom', 'walk']);
  }

  if (current === 'sleep') {
    // Waking straight into a run looks like a startle, which is a nice accident.
    return pick(random, ['sit', 'sit', 'lie', 'walk', 'run']);
  }

  if (current === 'lie') {
    return pick(random, ['sleep', 'sleep', 'sit', 'walk']);
  }

  return pick(random, ['walk', 'walk', 'walk', 'run', 'lie', 'groom', 'sit']);
}

/** Picks a destination and the time needed to reach it at the pose's speed. */
export function planMove(
  random: Random,
  from: number,
  bounds: SceneBounds,
  pose: 'walk' | 'run',
): { x: number; facing: 1 | -1; duration: number } {
  const span = bounds.max - bounds.min;
  const reach = pose === 'run' ? span : span * 0.45;

  // Aim somewhere within reach, then clamp — the clamp is what keeps cats near the
  // edges turning back inward instead of pinning to the wall.
  const target = Math.min(
    bounds.max,
    Math.max(bounds.min, from + between(random, -reach, reach)),
  );

  const distance = Math.abs(target - from);

  return {
    x: target,
    facing: target >= from ? 1 : -1,
    // Floor the duration so a tiny step doesn't animate in a single frame.
    duration: Math.max(420, (distance / SPEED[pose]) * 1000),
  };
}

export function planRest(random: Random, pose: 'sit' | 'lie' | 'sleep' | 'groom'): number {
  const [min, max] = REST_MS[pose];
  return between(random, min, max);
}

/**
 * A chase: the pursuer runs to just behind the target, who bolts the other way.
 * Returns null when the two are already too close for it to read as a chase.
 */
export function planChase(
  pursuer: CatState,
  target: CatState,
  bounds: SceneBounds,
): { pursuer: Partial<CatState>; target: Partial<CatState> } | null {
  const gap = target.x - pursuer.x;
  if (Math.abs(gap) < 30) return null;

  const direction: 1 | -1 = gap > 0 ? 1 : -1;
  const fleeTo = Math.min(bounds.max, Math.max(bounds.min, target.x + direction * 90));
  const chaseTo = Math.min(bounds.max, Math.max(bounds.min, fleeTo - direction * 34));

  const duration = Math.max(700, (Math.abs(fleeTo - target.x) / SPEED.run) * 1000);

  return {
    pursuer: { x: chaseTo, facing: direction, pose: 'run', duration },
    target: { x: fleeTo, facing: direction, pose: 'run', duration },
  };
}
