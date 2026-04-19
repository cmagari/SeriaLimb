import { Raycaster, Vector2, Vector3, Quaternion, Plane } from 'three';
import { solveCCD } from '../kinematics/inverseKinematics.js';

const DEG_PER_RAD = 180 / Math.PI;

function axisVec(c) {
  if (c === 'x') return new Vector3(1, 0, 0);
  if (c === 'y') return new Vector3(0, 1, 0);
  return new Vector3(0, 0, 1);
}

export function createDragControls({ renderer, camera, controls, state, getRobotRoot }) {
  const canvas = renderer.domElement;
  const raycaster = new Raycaster();
  const pointer = new Vector2();

  let drag = null;

  function setPointerFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
  }

  function findHandle() {
    const root = getRobotRoot();
    if (!root) return null;
    const hits = raycaster.intersectObject(root, true);
    for (const hit of hits) {
      let obj = hit.object;
      while (obj && !obj.userData?.dragHandle) obj = obj.parent;
      if (obj?.userData?.dragHandle) {
        return { handle: obj.userData.dragHandle, point: hit.point.clone() };
      }
    }
    return null;
  }

  function startTipDrag(hitPoint) {
    const normal = new Vector3();
    camera.getWorldDirection(normal);
    const plane = new Plane().setFromNormalAndCoplanarPoint(normal, hitPoint);
    drag = { type: 'tip', plane };
  }

  function tipMove() {
    const target = new Vector3();
    if (!raycaster.ray.intersectPlane(drag.plane, target)) return;
    const current = state.links.map((l) => l.angleDeg);
    const next = solveCCD(state.links, current, target);
    state.setAngles(next);
  }

  function startJointDrag(handle, hitPoint) {
    const i = handle.index;
    const root = getRobotRoot();
    const jointGroup = root?.userData?.jointGroups?.[i];
    if (!jointGroup) return false;

    const parentQuat = new Quaternion();
    jointGroup.parent.getWorldQuaternion(parentQuat);
    const axisWorld = axisVec(state.links[i].axis).applyQuaternion(parentQuat).normalize();

    const pivot = new Vector3();
    jointGroup.getWorldPosition(pivot);

    const plane = new Plane().setFromNormalAndCoplanarPoint(axisWorld, pivot);
    const projected = new Vector3();
    plane.projectPoint(hitPoint, projected);
    const refVec = projected.sub(pivot);
    if (refVec.lengthSq() < 1e-8) return false;

    drag = {
      type: 'joint',
      index: i,
      plane,
      pivot,
      axisWorld,
      refVec,
      initialAngle: state.links[i].angleDeg,
    };
    return true;
  }

  function jointMove() {
    const hit = new Vector3();
    if (!raycaster.ray.intersectPlane(drag.plane, hit)) return;
    const newVec = hit.sub(drag.pivot);
    if (newVec.lengthSq() < 1e-8) return;
    const cross = new Vector3().crossVectors(drag.refVec, newVec);
    const angleRad = Math.atan2(cross.dot(drag.axisWorld), drag.refVec.dot(newVec));
    state.setAngle(drag.index, drag.initialAngle + angleRad * DEG_PER_RAD);
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;
    setPointerFromEvent(event);
    const found = findHandle();
    if (!found) return;

    let started = false;
    if (found.handle.type === 'tip') {
      startTipDrag(found.point);
      started = !!drag;
    } else if (found.handle.type === 'joint') {
      started = startJointDrag(found.handle, found.point);
    }
    if (!started) return;

    controls.enabled = false;
    try { canvas.setPointerCapture(event.pointerId); } catch {}
    event.preventDefault();
  }

  function onPointerMove(event) {
    if (!drag) return;
    setPointerFromEvent(event);
    if (drag.type === 'tip') tipMove();
    else if (drag.type === 'joint') jointMove();
  }

  function endDrag(event) {
    if (!drag) return;
    drag = null;
    controls.enabled = true;
    try { canvas.releasePointerCapture(event.pointerId); } catch {}
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  return {
    dispose() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointercancel', endDrag);
    },
  };
}
