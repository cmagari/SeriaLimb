import { accumulate, DEG2RAD } from '../kinematics/forwardKinematics.js';

const G = 9.81;
const MAX_SESSIONS = 5;

export function createTelemetryRecorder(state, planner) {
  const sessions = [];
  let current = null;
  let prevAngles = [];
  let prevTime = 0;
  const listeners = new Set();

  function emit() {
    for (const cb of listeners) cb();
  }

  function snapshot(angles, dt) {
    const velocities = angles.map((a, i) => (dt > 0 ? (a - prevAngles[i]) / dt : 0));
    const { jointWorldPositions } = accumulate(state.links);
    const torques = computeGravityTorques(state.links, jointWorldPositions, state.payloadMass);
    const powers = torques.map((tau, i) => tau * velocities[i] * DEG2RAD);
    return { velocities, torques, powers };
  }

  planner.subscribe((api) => {
    // ── Session start ────────────────────────────────────────────────────────
    if (!current && api.running && api.progress === 0) {
      const now = performance.now();
      const angles = state.links.map((l) => l.angleDeg);
      current = {
        id: Date.now(),
        startTime: now,
        durationSeconds: api.durationSeconds,
        easing: api.easing,
        numLinks: state.numLinks,
        samples: [],
      };
      prevAngles = [...angles];
      prevTime = now;
      const { jointWorldPositions } = accumulate(state.links);
      const torques = computeGravityTorques(state.links, jointWorldPositions, state.payloadMass);
      current.samples.push({
        elapsed: 0,
        angles,
        velocities: new Array(state.numLinks).fill(0),
        torques,
        powers: new Array(state.numLinks).fill(0),
      });
      return;
    }

    // ── Ongoing ticks ────────────────────────────────────────────────────────
    if (current && api.running) {
      const now = performance.now();
      const elapsed = (now - current.startTime) / 1000;
      const angles = state.links.map((l) => l.angleDeg);
      const dt = (now - prevTime) / 1000;
      const { velocities, torques, powers } = snapshot(angles, dt);
      current.samples.push({ elapsed, angles: [...angles], velocities, torques, powers });
      prevAngles = angles;
      prevTime = now;
    }

    // ── Motion ended ─────────────────────────────────────────────────────────
    if (current && !api.running) {
      const now = performance.now();
      const elapsed = (now - current.startTime) / 1000;
      const angles = state.links.map((l) => l.angleDeg);
      const { jointWorldPositions } = accumulate(state.links);
      const torques = computeGravityTorques(state.links, jointWorldPositions, state.payloadMass);
      current.samples.push({
        elapsed,
        angles: [...angles],
        velocities: new Array(state.numLinks).fill(0),
        torques,
        powers: new Array(state.numLinks).fill(0),
      });
      sessions.push(current);
      if (sessions.length > MAX_SESSIONS) sessions.shift();
      current = null;
      emit();
    }
  });

  return {
    get sessions() { return sessions; },
    get recording() { return current !== null; },
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}

// Quasi-static gravity torque at each joint.
// Gravity = (0, -g, 0). Moment arm = (r × g_hat) · axis_hat.
// Simplifies to: axis='x' → |r.z|, axis='y' → 0, axis='z' → |r.x|
function computeGravityTorques(links, jointPositions, payloadMass) {
  const n = links.length;
  const torques = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    const pi = jointPositions[i];
    const axis = links[i].axis;

    for (let j = i; j < n; j++) {
      const p0 = jointPositions[j];
      const p1 = jointPositions[j + 1];

      // Link j CoM at midpoint between p0 and p1
      const lx = (p0.x + p1.x) / 2 - pi.x;
      const ly = (p0.y + p1.y) / 2 - pi.y;
      const lz = (p0.z + p1.z) / 2 - pi.z;
      torques[i] += links[j].linkMass * G * momentArm(lx, ly, lz, axis);

      // Joint j+1 mass at its pivot (skip last — no joint beyond tip)
      if (j + 1 < n) {
        const jx = p1.x - pi.x;
        const jy = p1.y - pi.y;
        const jz = p1.z - pi.z;
        torques[i] += links[j + 1].jointMass * G * momentArm(jx, jy, jz, axis);
      }
    }

    // Payload at tip
    const tip = jointPositions[n];
    const tx = tip.x - pi.x;
    const ty = tip.y - pi.y;
    const tz = tip.z - pi.z;
    torques[i] += payloadMass * G * momentArm(tx, ty, tz, axis);
  }

  return torques;
}

function momentArm(rx, ry, rz, axis) {
  if (axis === 'x') return Math.abs(rz);
  if (axis === 'y') return 0;
  return Math.abs(rx); // z-axis
}
