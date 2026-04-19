export const MIN_LINKS = 1;
export const MAX_LINKS = 12;
export const DEFAULT_PAYLOAD_MASS = 1.0;

const DEFAULT_LINK = Object.freeze({
  length: 1.0,
  linkMass: 1.0,
  jointMass: 1.0,
  axis: 'z',
  angleDeg: 0,
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
        const prevAngle = links[i]?.angleDeg ?? 0;
        newLinks.push({
          length: clampPositive(src.length, DEFAULT_LINK.length),
          linkMass: clampPositive(src.linkMass, DEFAULT_LINK.linkMass),
          jointMass: clampPositive(src.jointMass, DEFAULT_LINK.jointMass),
          axis: isAxis(src.axis) ? src.axis : DEFAULT_LINK.axis,
          angleDeg: prevAngle,
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
      const clamped = clampAngle(deg);
      if (links[index].angleDeg === clamped) return;
      links[index].angleDeg = clamped;
      emit('angles');
    },

    setAngles(degsArray) {
      if (!Array.isArray(degsArray)) return;
      let changed = false;
      const n = Math.min(degsArray.length, links.length);
      for (let i = 0; i < n; i++) {
        const clamped = clampAngle(degsArray[i]);
        if (links[i].angleDeg !== clamped) {
          links[i].angleDeg = clamped;
          changed = true;
        }
      }
      if (changed) emit('angles');
    },

    resetAngles() {
      let changed = false;
      for (const l of links) {
        if (l.angleDeg !== 0) {
          l.angleDeg = 0;
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
    out.push({
      length: clampPositive(src.length, DEFAULT_LINK.length),
      linkMass: clampPositive(src.linkMass, DEFAULT_LINK.linkMass),
      jointMass: clampPositive(src.jointMass, DEFAULT_LINK.jointMass),
      axis: isAxis(src.axis) ? src.axis : DEFAULT_LINK.axis,
      angleDeg: clampAngle(src.angleDeg ?? 0),
    });
  }
  return out;
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

function clampAngle(v) {
  const n = typeof v === 'number' ? v : Number.parseFloat(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-180, Math.min(180, n));
}

function isAxis(a) {
  return a === 'x' || a === 'y' || a === 'z';
}
