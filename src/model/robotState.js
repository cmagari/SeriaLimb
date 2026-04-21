export const MIN_LINKS = 1;
export const MAX_LINKS = 12;
export const DEFAULT_PAYLOAD_MASS = 1.0;
export const ANGLE_MIN = -180;
export const ANGLE_MAX = 180;

const DEFAULT_LINK = Object.freeze({
  length: 1.0,
  linkMass: 1.0,
  jointMass: 1.0,
  axis: 'z',
  angleDeg: 0,
  minAngleDeg: ANGLE_MIN,
  maxAngleDeg: ANGLE_MAX,
});

export function createRobotState(initial = {}) {
  const links = normalizeLinks(initial.numLinks ?? 3, initial.links ?? []);
  let payloadMass = clampNonNegative(initial.payloadMass, DEFAULT_PAYLOAD_MASS);
  const listeners = { structure: new Set(), angles: new Set() };

  function emit(event) {
    for (const cb of listeners[event]) cb(api);
  }

  const api = {
    get numLinks() {
      return links.length;
    },
    get links() {
      return links;
    },
    get payloadMass() {
      return payloadMass;
    },

    getSnapshot() {
      return {
        numLinks: links.length,
        links: links.map((l) => ({ ...l })),
        payloadMass,
      };
    },

    subscribe(event, cb) {
      if (!listeners[event]) throw new Error(`Unknown event: ${event}`);
      listeners[event].add(cb);
      return () => listeners[event].delete(cb);
    },

    setStructure(spec) {
      const n = clampInt(spec.numLinks, MIN_LINKS, MAX_LINKS);
      const newLinks = [];
      for (let i = 0; i < n; i++) {
        const src = spec.links?.[i] ?? {};
        const { min, max } = normalizeLimits(src.minAngleDeg, src.maxAngleDeg);
        const prevAngle = links[i]?.angleDeg ?? 0;
        const rawAngle = src.angleDeg !== undefined ? src.angleDeg : prevAngle;
        newLinks.push({
          length: clampPositive(src.length, DEFAULT_LINK.length),
          linkMass: clampPositive(src.linkMass, DEFAULT_LINK.linkMass),
          jointMass: clampPositive(src.jointMass, DEFAULT_LINK.jointMass),
          axis: isAxis(src.axis) ? src.axis : DEFAULT_LINK.axis,
          minAngleDeg: min,
          maxAngleDeg: max,
          angleDeg: clampBetween(rawAngle, min, max),
        });
      }
      links.length = 0;
      links.push(...newLinks);
      if (spec.payloadMass !== undefined) {
        payloadMass = clampNonNegative(spec.payloadMass, payloadMass);
      }
      emit('structure');
    },

    setAngle(index, deg) {
      if (index < 0 || index >= links.length) return;
      const link = links[index];
      const clamped = clampBetween(deg, link.minAngleDeg, link.maxAngleDeg);
      if (link.angleDeg === clamped) return;
      link.angleDeg = clamped;
      emit('angles');
    },

    setAngles(degsArray) {
      if (!Array.isArray(degsArray)) return;
      let changed = false;
      const n = Math.min(degsArray.length, links.length);
      for (let i = 0; i < n; i++) {
        const link = links[i];
        const clamped = clampBetween(degsArray[i], link.minAngleDeg, link.maxAngleDeg);
        if (link.angleDeg !== clamped) {
          link.angleDeg = clamped;
          changed = true;
        }
      }
      if (changed) emit('angles');
    },

    resetAngles() {
      let changed = false;
      for (const l of links) {
        const target = clampBetween(0, l.minAngleDeg, l.maxAngleDeg);
        if (l.angleDeg !== target) {
          l.angleDeg = target;
          changed = true;
        }
      }
      if (changed) emit('angles');
    },
  };

  return api;
}

function normalizeLinks(numLinks, sources) {
  const n = clampInt(numLinks, MIN_LINKS, MAX_LINKS);
  const out = [];
  for (let i = 0; i < n; i++) {
    const src = sources[i] ?? {};
    const { min, max } = normalizeLimits(src.minAngleDeg, src.maxAngleDeg);
    out.push({
      length: clampPositive(src.length, DEFAULT_LINK.length),
      linkMass: clampPositive(src.linkMass, DEFAULT_LINK.linkMass),
      jointMass: clampPositive(src.jointMass, DEFAULT_LINK.jointMass),
      axis: isAxis(src.axis) ? src.axis : DEFAULT_LINK.axis,
      minAngleDeg: min,
      maxAngleDeg: max,
      angleDeg: clampBetween(src.angleDeg ?? 0, min, max),
    });
  }
  return out;
}

function normalizeLimits(minRaw, maxRaw) {
  let min = clampLimit(minRaw, ANGLE_MIN);
  let max = clampLimit(maxRaw, ANGLE_MAX);
  if (min > max) [min, max] = [max, min];
  return { min, max };
}

function clampInt(v, min, max) {
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function clampPositive(v, fallback) {
  const n = typeof v === 'number' ? v : Number.parseFloat(v);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function clampNonNegative(v, fallback) {
  const n = typeof v === 'number' ? v : Number.parseFloat(v);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(1000, n);
}

function clampLimit(v, fallback) {
  const n = typeof v === 'number' ? v : Number.parseFloat(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(ANGLE_MIN, Math.min(ANGLE_MAX, n));
}

function clampBetween(v, min, max) {
  const n = typeof v === 'number' ? v : Number.parseFloat(v);
  if (!Number.isFinite(n)) return Math.max(min, Math.min(max, 0));
  return Math.max(min, Math.min(max, n));
}

function isAxis(a) {
  return a === 'x' || a === 'y' || a === 'z';
}
