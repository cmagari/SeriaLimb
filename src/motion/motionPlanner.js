const EASINGS = {
  linear: (t) => t,
  smooth: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

export const EASING_OPTIONS = [
  { value: 'smooth', label: 'Smooth (ease-in-out)' },
  { value: 'linear', label: 'Linear' },
];

const MIN_DURATION = 0;
const MAX_DURATION = 120;
const DEFAULT_DURATION = 2.0;

export function createMotionPlanner(state) {
  let targets = zeros(state.numLinks);
  let durationSeconds = DEFAULT_DURATION;
  let easing = 'smooth';
  let running = false;
  let progress = 0;
  let startTime = 0;
  let startAngles = [];
  let rafId = 0;
  const listeners = new Set();

  function emit() {
    for (const cb of listeners) cb(api);
  }

  function resizeTargets() {
    const n = state.numLinks;
    const next = new Array(n);
    for (let i = 0; i < n; i++) {
      const raw = i < targets.length ? targets[i] : 0;
      next[i] = clampTargetForJoint(i, raw);
    }
    targets = next;
  }

  function clampTargetForJoint(i, v) {
    const link = state.links[i];
    const minA = link?.minAngleDeg ?? -180;
    const maxA = link?.maxAngleDeg ?? 180;
    const n = typeof v === 'number' ? v : Number.parseFloat(v);
    if (!Number.isFinite(n)) return Math.max(minA, Math.min(maxA, 0));
    return Math.max(minA, Math.min(maxA, n));
  }

  state.subscribe('structure', () => {
    if (running) cancel();
    resizeTargets();
    progress = 0;
    emit();
  });

  function cancel() {
    if (!running) return;
    cancelAnimationFrame(rafId);
    running = false;
    emit();
  }

  function start() {
    if (running) return;
    if (state.numLinks === 0) return;

    running = true;
    progress = 0;
    startAngles = state.links.map((l) => l.angleDeg);
    startTime = performance.now();
    emit();

    if (durationSeconds === 0) {
      state.setAngles([...targets]);
      progress = 1;
      running = false;
      emit();
      return;
    }

    const easeFn = EASINGS[easing] ?? EASINGS.smooth;

    const tick = () => {
      if (!running) return;
      const elapsed = (performance.now() - startTime) / 1000;
      const t = Math.min(1, elapsed / durationSeconds);
      progress = t;

      const eased = easeFn(t);
      const angles = new Array(state.numLinks);
      for (let i = 0; i < angles.length; i++) {
        const a0 = startAngles[i] ?? 0;
        const a1 = targets[i] ?? 0;
        angles[i] = a0 + (a1 - a0) * eased;
      }
      state.setAngles(angles);

      if (t >= 1) {
        running = false;
        emit();
        return;
      }
      emit();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  const api = {
    get targets() {
      return targets;
    },
    get durationSeconds() {
      return durationSeconds;
    },
    get easing() {
      return easing;
    },
    get running() {
      return running;
    },
    get progress() {
      return progress;
    },

    setTarget(i, deg) {
      if (i < 0 || i >= targets.length) return;
      const v = clampTargetForJoint(i, deg);
      if (targets[i] === v) return;
      targets[i] = v;
      emit();
    },

    snapTargetsToCurrent() {
      let changed = false;
      for (let i = 0; i < state.numLinks; i++) {
        const v = state.links[i].angleDeg;
        if (targets[i] !== v) {
          targets[i] = v;
          changed = true;
        }
      }
      if (changed) emit();
    },

    zeroTargets() {
      let changed = false;
      for (let i = 0; i < targets.length; i++) {
        const zero = clampTargetForJoint(i, 0);
        if (targets[i] !== zero) {
          targets[i] = zero;
          changed = true;
        }
      }
      if (changed) emit();
    },

    setDuration(seconds) {
      const n = typeof seconds === 'number' ? seconds : Number.parseFloat(seconds);
      if (!Number.isFinite(n)) return;
      const clamped = Math.max(MIN_DURATION, Math.min(MAX_DURATION, n));
      if (durationSeconds === clamped) return;
      durationSeconds = clamped;
      emit();
    },

    setEasing(name) {
      if (!EASINGS[name] || easing === name) return;
      easing = name;
      emit();
    },

    start,
    cancel,

    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };

  return api;
}

function zeros(n) {
  const a = new Array(n);
  for (let i = 0; i < n; i++) a[i] = 0;
  return a;
}
