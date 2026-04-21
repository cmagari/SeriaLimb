import { Vector3, Quaternion } from 'three';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const MAX_ITER = 10;
const TOL = 0.005;

function axisVec(c) {
  if (c === 'x') return new Vector3(1, 0, 0);
  if (c === 'y') return new Vector3(0, 1, 0);
  return new Vector3(0, 0, 1);
}

// Returns { positions[n+1], parentRots[n] }
//  positions[i] = world position of joint i pivot (positions[n] = tip)
//  parentRots[i] = world rotation of joint i's parent frame (excludes joint i's own rotation)
function fk(links, angles) {
  const cumRot = new Quaternion();
  const cumPos = new Vector3();
  const positions = [new Vector3()];
  const parentRots = [];
  for (let i = 0; i < links.length; i++) {
    parentRots.push(cumRot.clone());
    const q = new Quaternion().setFromAxisAngle(axisVec(links[i].axis), angles[i] * DEG2RAD);
    cumRot.multiply(q);
    cumPos.add(new Vector3(links[i].length, 0, 0).applyQuaternion(cumRot));
    positions.push(cumPos.clone());
  }
  return { positions, parentRots };
}

export function solveCCD(links, currentAngles, targetWorld) {
  const n = links.length;
  if (n === 0) return currentAngles.slice();
  const angles = currentAngles.slice();

  for (let iter = 0; iter < MAX_ITER; iter++) {
    let { positions, parentRots } = fk(links, angles);
    if (positions[n].distanceTo(targetWorld) < TOL) break;

    for (let i = n - 1; i >= 0; i--) {
      const pivot = positions[i];
      const tip = positions[n];
      const axisW = axisVec(links[i].axis).applyQuaternion(parentRots[i]).normalize();

      const a = tip.clone().sub(pivot);
      const b = targetWorld.clone().sub(pivot);
      const aP = a.sub(axisW.clone().multiplyScalar(a.dot(axisW)));
      const bP = b.sub(axisW.clone().multiplyScalar(b.dot(axisW)));
      if (aP.lengthSq() < 1e-12 || bP.lengthSq() < 1e-12) continue;

      const cross = new Vector3().crossVectors(aP, bP);
      const deltaDeg = Math.atan2(cross.dot(axisW), aP.dot(bP)) * RAD2DEG;
      const minA = links[i].minAngleDeg ?? -180;
      const maxA = links[i].maxAngleDeg ?? 180;
      angles[i] = Math.max(minA, Math.min(maxA, angles[i] + deltaDeg));

      ({ positions } = fk(links, angles));
    }
  }
  return angles;
}
