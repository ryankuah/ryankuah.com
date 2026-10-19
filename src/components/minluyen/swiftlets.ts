export type Swiftlet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  size: number;
  flock: number;
  facing: 1 | -1;
  course: 1 | -1;
};

export type SceneBounds = {
  width: number;
  height: number;
  apertureRadius?: number;
};
export type ScenePointer = { x: number; y: number } | null;
export const POINTER_RADIUS = 140;
export const MAX_SPEED = 105;
const MAX_ACCELERATION = 145;

export function createFlock({ width, height }: SceneBounds): Swiftlet[] {
  const count = width < 772 ? 28 : 48;
  const groups = width < 772 ? 2 : 3;
  const centers =
    groups === 2
      ? [
          { x: 0.35, y: 0.28 },
          { x: 0.65, y: 0.53 },
        ]
      : [
          { x: 0.23, y: 0.3 },
          { x: 0.54, y: 0.46 },
          { x: 0.79, y: 0.26 },
        ];
  return Array.from({ length: count }, (_, i) => {
    // Loose clusters with shared headings, rather than isolated birds across the sky.
    const flock = i % groups;
    const member = Math.floor(i / groups);
    const seed = (member * 0.61803398875 + 0.3) % 1;
    const spread = Math.sqrt((member + 1) / (count / groups));
    const bearing = member * 2.399 + flock;
    const angle = (flock === 1 ? Math.PI - 0.2 : -0.12) + (seed - 0.5) * 0.3;
    const speed = 26 + flock * 5 + seed * 4;
    return {
      x:
        width * centers[flock].x +
        Math.cos(bearing) * spread * Math.min(100, width * 0.19),
      y:
        height * centers[flock].y +
        Math.sin(bearing) * spread * Math.min(62, height * 0.08),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      phase: i * 2.399,
      size: 0.18 + flock * 0.055 + seed * 0.045,
      flock,
      facing: Math.cos(angle) >= 0 ? 1 : -1,
      course: Math.cos(angle) >= 0 ? 1 : -1,
    };
  });
}

export function pointerForce(bird: Swiftlet, pointer: ScenePointer) {
  if (!pointer) return { x: 0, y: 0 };
  const dx = bird.x - pointer.x;
  const dy = bird.y - pointer.y;
  const distance = Math.hypot(dx, dy);
  if (distance >= POINTER_RADIUS) return { x: 0, y: 0 };
  // An exact overlap must still have a finite escape direction.
  const angle =
    distance > 0.01 ? Math.atan2(dy, dx) : Math.atan2(bird.vy, bird.vx);
  const strength = 260 * (1 - distance / POINTER_RADIUS);
  return { x: Math.cos(angle) * strength, y: Math.sin(angle) * strength };
}

/** Advance with a fixed 1/120 s step from the animation loop. Units are CSS px/s. */
export function stepFlock(
  birds: Swiftlet[],
  bounds: SceneBounds,
  pointer: ScenePointer,
  time: number,
  dt: number,
) {
  const marginX = Math.min(120, bounds.width * 0.22);
  const marginY = Math.min(130, bounds.height * 0.2);
  const groups = new Map<
    number,
    { x: number; count: number; course: 1 | -1 }
  >();
  for (const bird of birds) {
    const group = groups.get(bird.flock) ?? {
      x: 0,
      count: 0,
      course: bird.course,
    };
    group.x += bird.x;
    group.count++;
    groups.set(bird.flock, group);
  }
  for (const group of groups.values()) {
    const center = group.x / group.count;
    if (center < marginX) group.course = 1;
    else if (center > bounds.width - marginX) group.course = -1;
  }
  const forces = birds.map((bird, index) => {
    // Anchor cruising to the horizon: integrating wander into the current
    // heading eventually sent whole flocks straight up or down.
    // Turn the flock together and hold its return course through the turn.
    // Opposing individual courses otherwise leave birds hovering at the edge.
    bird.course = groups.get(bird.flock)!.course;
    const heading = bird.course;
    const wander =
      Math.sin(time * 0.35 + bird.flock * 2) * 0.14 +
      Math.sin(time * 0.7 + bird.phase) * 0.05;
    const cruiseSpeed = 28 + bird.flock * 5;
    let ax = (heading * Math.cos(wander) * cruiseSpeed - bird.vx) * 1.4;
    let ay = (Math.sin(wander) * cruiseSpeed - bird.vy) * 2.2;
    let neighbors = 0;
    let centerX = 0;
    let centerY = 0;
    let alignX = 0;
    let alignY = 0;
    let nearest: Swiftlet | undefined;
    let nearestDistance = Infinity;
    for (let j = 0; j < birds.length; j++) {
      if (index === j) continue;
      const other = birds[j];
      const dx = bird.x - other.x;
      const dy = bird.y - other.y;
      const distance = Math.hypot(dx, dy);
      if (other.flock === bird.flock && distance < nearestDistance) {
        nearest = other;
        nearestDistance = distance;
      }
      if (other.flock === bird.flock && distance < 220) {
        neighbors++;
        centerX += other.x;
        centerY += other.y;
        alignX += other.vx;
        alignY += other.vy;
      }
      if (distance < 23 && distance > 0.01) {
        const push = (1 - distance / 23) * 100;
        ax += (dx / distance) * push;
        ay += (dy / distance) * push;
      }
    }
    if (neighbors) {
      ax +=
        (centerX / neighbors - bird.x) * 0.24 +
        (alignX / neighbors - bird.vx) * 1.35;
      ay +=
        (centerY / neighbors - bird.y) * 0.24 +
        (alignY / neighbors - bird.vy) * 1.35;
    } else if (nearest) {
      // A bird scattered by the cursor can find its flock again.
      ax += (nearest.x - bird.x) * 0.12;
      ay += (nearest.y - bird.y) * 0.12;
    }

    // Start steering before the edge; the hard containment below is only a guard.
    ax += Math.max(0, 1 - bird.x / marginX) * 180;
    ax -= Math.max(0, 1 - (bounds.width - bird.x) / marginX) * 180;
    ay += Math.max(0, 1 - bird.y / marginY) * 180;
    ay -= Math.max(0, 1 - (bounds.height - bird.y) / marginY) * 180;
    if (bounds.apertureRadius) {
      const dx = bird.x - bounds.width / 2;
      const dy = bird.y - bounds.height / 2;
      const distance = Math.hypot(dx, dy);
      // A soft return toward the opening still allows flight behind its rim.
      const returnForce =
        Math.max(0, distance / bounds.apertureRadius - 0.72) * 180;
      ax -= (dx / (distance || 1)) * returnForce;
      ay -= (dy / (distance || 1)) * returnForce;
    }
    const flee = pointerForce(bird, pointer);
    ax += flee.x;
    ay += flee.y;
    // Steer back toward shallow climbs after evasive motion, including while
    // slowing for a horizontal turn. This is damping, not a velocity snap.
    const climbLimit = Math.max(4, Math.abs(bird.vx) * 0.4);
    const shallowVy = Math.max(-climbLimit, Math.min(climbLimit, bird.vy));
    ay += (shallowVy - bird.vy) * 6;
    const factor = Math.min(1, MAX_ACCELERATION / (Math.hypot(ax, ay) || 1));
    return { x: ax * factor, y: ay * factor };
  });

  birds.forEach((bird, i) => {
    bird.vx += forces[i].x * dt;
    bird.vy += forces[i].y * dt;
    const speed = Math.hypot(bird.vx, bird.vy);
    const limit = Math.min(1, MAX_SPEED / (speed || 1));
    bird.vx *= limit;
    bird.vy *= limit;
    bird.x += bird.vx * dt;
    bird.y += bird.vy * dt;
    const insetX = Math.min(18, bounds.width / 4);
    const insetY = Math.min(18, bounds.height / 4);
    if (bird.x < insetX) {
      bird.x = insetX;
      bird.vx = Math.abs(bird.vx);
    }
    if (bird.x > bounds.width - insetX) {
      bird.x = bounds.width - insetX;
      bird.vx = -Math.abs(bird.vx);
    }
    if (bird.y < insetY) {
      bird.y = insetY;
      bird.vy = Math.abs(bird.vy);
    }
    if (bird.y > bounds.height - insetY) {
      bird.y = bounds.height - insetY;
      bird.vy = -Math.abs(bird.vy);
    }
    // Hold the profile through nearly vertical turns instead of flickering left/right.
    if (bird.vx > 5) bird.facing = 1;
    else if (bird.vx < -5) bird.facing = -1;
  });
}
