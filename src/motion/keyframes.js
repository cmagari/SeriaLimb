export function createKeyframeStore(state, planner, recorder = null) {
  const frames = [];
  let playing = false;
  let cancelRequested = false;
  const listeners = new Set();

  function emit() {
    for (const cb of listeners) cb(api);
  }

  function snapshotAngles() {
    return state.links.map((l) => l.angleDeg);
  }

  const api = {
    get frames() { return frames; },
    get playing() { return playing; },

    add() {
      frames.push({ id: Date.now() + Math.random(), angles: snapshotAngles() });
      emit();
    },

    saveTo(i) {
      if (i < 0 || i >= frames.length) return;
      frames[i].angles = snapshotAngles();
      emit();
    },

    delete(i) {
      if (i < 0 || i >= frames.length) return;
      frames.splice(i, 1);
      emit();
    },

    clear() {
      if (frames.length === 0) return;
      frames.length = 0;
      emit();
    },

    goto(i) {
      if (i < 0 || i >= frames.length) return;
      const f = frames[i];
      const padded = state.links.map((_, j) => f.angles[j] ?? 0);
      state.setAngles(padded);
    },

    cancel() {
      if (!playing) return;
      cancelRequested = true;
      planner.cancel();
    },

    async play(durationPerSegment, easing) {
      if (frames.length < 2 || playing) return;
      playing = true;
      cancelRequested = false;
      planner.setDuration(durationPerSegment);
      planner.setEasing(easing);
      emit();
      recorder?.beginGroup();
      try {
        for (let i = 0; i < frames.length - 1; i++) {
          if (cancelRequested) break;
          const start = frames[i].angles;
          const end = frames[i + 1].angles;
          state.setAngles(state.links.map((_, j) => start[j] ?? 0));
          for (let j = 0; j < state.numLinks; j++) {
            planner.setTarget(j, end[j] ?? 0);
          }
          try {
            await runSegment(planner);
          } catch {
            break;
          }
        }
      } finally {
        recorder?.endGroup();
        playing = false;
        emit();
      }
    },

    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };

  return api;
}

function runSegment(planner) {
  return new Promise((resolve, reject) => {
    let started = false;
    const unsub = planner.subscribe((api) => {
      if (api.running) {
        started = true;
        return;
      }
      if (!started) return;
      unsub();
      if (api.progress >= 1) resolve();
      else reject(new Error('cancelled'));
    });
    planner.start();
  });
}
