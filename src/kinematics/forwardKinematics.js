import { Matrix4, Vector3 } from 'three';

export const DEG2RAD = Math.PI / 180;

export function segmentTransform(axis, angleRad, length) {
  const rot = new Matrix4();
  if (axis === 'x') rot.makeRotationX(angleRad);
  else if (axis === 'y') rot.makeRotationY(angleRad);
  else rot.makeRotationZ(angleRad);
  const trans = new Matrix4().makeTranslation(length, 0, 0);
  return rot.multiply(trans);
}

export function accumulate(links) {
  const cumulative = new Matrix4();
  const jointWorldPositions = [new Vector3(0, 0, 0)];
  const segmentLocalTransforms = [];
  for (const link of links) {
    const T = segmentTransform(link.axis, link.angleDeg * DEG2RAD, link.length);
    segmentLocalTransforms.push(T.clone());
    cumulative.multiply(T);
    jointWorldPositions.push(new Vector3().setFromMatrixPosition(cumulative));
  }
  return { jointWorldPositions, segmentLocalTransforms };
}
