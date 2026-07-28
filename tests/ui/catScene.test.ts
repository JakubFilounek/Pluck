import { describe, expect, it } from 'vitest';
import {
  nextPose,
  planChase,
  planMove,
  planRest,
  type CatPose,
  type CatState,
} from '@/src/ui/catScene';

const BOUNDS = { min: 26, max: 294 };

/** Deterministic stand-in for Math.random, cycling through fixed values. */
function seeded(values: number[]) {
  let index = 0;
  return () => values[index++ % values.length]!;
}

describe('nextPose', () => {
  it('never returns a pose outside the known set, whatever the roll', () => {
    const valid: CatPose[] = ['sit', 'walk', 'run', 'lie', 'sleep', 'groom'];
    const starts: CatPose[] = ['sit', 'walk', 'run', 'lie', 'sleep', 'groom'];

    for (const start of starts) {
      for (let roll = 0; roll < 20; roll += 1) {
        const random = seeded([roll / 20]);
        expect(valid).toContain(nextPose(random, start));
      }
    }
  });

  it('settles a moving cat rather than letting it move forever', () => {
    // Every outcome from 'run' must be a resting pose or a walk — never another run,
    // which would let a cat sprint back and forth indefinitely.
    for (let roll = 0; roll < 20; roll += 1) {
      const pose = nextPose(seeded([roll / 20]), 'run');
      expect(pose).not.toBe('run');
    }
  });

  it('lets a sleeping cat wake', () => {
    const outcomes = new Set<CatPose>();
    for (let roll = 0; roll < 20; roll += 1) {
      outcomes.add(nextPose(seeded([roll / 20]), 'sleep'));
    }

    // A cat that can only ever pick 'sleep' again would look broken.
    expect([...outcomes].some((pose) => pose !== 'sleep')).toBe(true);
  });
});

describe('planMove', () => {
  it('keeps the cat inside the scene', () => {
    for (const from of [BOUNDS.min, 100, BOUNDS.max]) {
      for (const roll of [0, 0.25, 0.5, 0.75, 0.999]) {
        const move = planMove(seeded([roll]), from, BOUNDS, 'run');

        expect(move.x).toBeGreaterThanOrEqual(BOUNDS.min);
        expect(move.x).toBeLessThanOrEqual(BOUNDS.max);
      }
    }
  });

  it('faces the direction of travel', () => {
    expect(planMove(seeded([1]), 100, BOUNDS, 'walk').facing).toBe(1);
    expect(planMove(seeded([0]), 100, BOUNDS, 'walk').facing).toBe(-1);
  });

  it('takes longer to cross the same distance walking than running', () => {
    const walk = planMove(seeded([1]), BOUNDS.min, BOUNDS, 'walk');
    const run = planMove(seeded([1]), BOUNDS.min, BOUNDS, 'run');

    expect(walk.duration / Math.abs(walk.x - BOUNDS.min)).toBeGreaterThan(
      run.duration / Math.abs(run.x - BOUNDS.min),
    );
  });

  it('never returns an instant move', () => {
    // A zero-length step would finish in one frame and restart the loop immediately.
    const move = planMove(seeded([0.5]), 100, BOUNDS, 'walk');
    expect(move.duration).toBeGreaterThanOrEqual(420);
  });
});

describe('planRest', () => {
  it('stays within the pose’s range', () => {
    expect(planRest(seeded([0]), 'sit')).toBe(1800);
    expect(planRest(seeded([0.999]), 'sit')).toBeLessThanOrEqual(5000);
    expect(planRest(seeded([0]), 'sleep')).toBe(7000);
  });
});

describe('planChase', () => {
  const cat = (x: number): CatState => ({ x, facing: 1, pose: 'sit', duration: 0 });

  it('sends both cats running the same way, pursuer behind', () => {
    const plan = planChase(cat(60), cat(200), BOUNDS);

    expect(plan).not.toBeNull();
    expect(plan!.pursuer.pose).toBe('run');
    expect(plan!.target.pose).toBe('run');
    expect(plan!.pursuer.facing).toBe(1);
    expect(plan!.target.facing).toBe(1);
    // The chaser must end up behind, not on top of, the one fleeing.
    expect(plan!.pursuer.x!).toBeLessThan(plan!.target.x!);
  });

  it('works in the other direction too', () => {
    const plan = planChase(cat(240), cat(80), BOUNDS);

    expect(plan!.pursuer.facing).toBe(-1);
    expect(plan!.pursuer.x!).toBeGreaterThan(plan!.target.x!);
  });

  it('keeps both inside the scene', () => {
    const plan = planChase(cat(40), cat(285), BOUNDS);

    for (const x of [plan!.pursuer.x!, plan!.target.x!]) {
      expect(x).toBeGreaterThanOrEqual(BOUNDS.min);
      expect(x).toBeLessThanOrEqual(BOUNDS.max);
    }
  });

  it('declines when the cats are already touching', () => {
    expect(planChase(cat(100), cat(120), BOUNDS)).toBeNull();
  });

  it('gives both cats the same duration so they move together', () => {
    const plan = planChase(cat(60), cat(200), BOUNDS);
    expect(plan!.pursuer.duration).toBe(plan!.target.duration);
  });
});
