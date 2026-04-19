import {
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  CylinderGeometry,
  MathUtils,
} from 'three';

const COLORS = {
  link: 0x3b82f6,
  joint: 0xf59e0b,
  base: 0x64748b,
  endEffector: 0x22c55e,
};

const BASE_JOINT_RADIUS = 0.12;
const BASE_LINK_RADIUS = 0.055;
const BASE_PAYLOAD_RADIUS = 0.1;
const MIN_MASS_VIS = 0.1;

function jointRadius(mass) {
  return BASE_JOINT_RADIUS * Math.sqrt(Math.max(MIN_MASS_VIS, mass));
}

function linkRadius(mass) {
  return BASE_LINK_RADIUS * Math.sqrt(Math.max(MIN_MASS_VIS, mass));
}

function payloadRadius(mass) {
  return BASE_PAYLOAD_RADIUS * Math.sqrt(Math.max(MIN_MASS_VIS, mass));
}

function applyRotation(group, axis, angleDeg) {
  const rad = MathUtils.degToRad(angleDeg);
  group.rotation.set(0, 0, 0);
  if (axis === 'x') group.rotation.x = rad;
  else if (axis === 'y') group.rotation.y = rad;
  else group.rotation.z = rad;
}

function makeMaterial(color) {
  return new MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.15 });
}

function makeJointCylinder(axis, mass) {
  const radius = jointRadius(mass);
  const height = radius * 1.8;
  const mesh = new Mesh(
    new CylinderGeometry(radius, radius, height, 24),
    makeMaterial(COLORS.joint),
  );
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  else if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  return mesh;
}

export function buildRobotTree(state) {
  const root = new Group();
  root.name = 'robotRoot';
  const jointGroups = [];

  const baseMarker = new Mesh(
    new CylinderGeometry(0.22, 0.28, 0.08, 32),
    makeMaterial(COLORS.base),
  );
  baseMarker.position.y = -0.04;
  root.add(baseMarker);

  let parent = root;
  const links = state.links;

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const jointGroup = new Group();
    jointGroup.name = `joint${i + 1}`;
    jointGroup.position.x = i === 0 ? 0 : links[i - 1].length;
    applyRotation(jointGroup, link.axis, link.angleDeg);
    parent.add(jointGroup);
    jointGroups.push(jointGroup);

    jointGroup.add(makeJointCylinder(link.axis, link.jointMass));

    const r = linkRadius(link.linkMass);
    const linkMesh = new Mesh(
      new CylinderGeometry(r, r, link.length, 24),
      makeMaterial(COLORS.link),
    );
    linkMesh.rotation.z = -Math.PI / 2;
    linkMesh.position.x = link.length / 2;
    jointGroup.add(linkMesh);

    parent = jointGroup;
  }

  if (links.length > 0) {
    const lastLen = links[links.length - 1].length;
    const endMarker = new Mesh(
      new SphereGeometry(payloadRadius(state.payloadMass), 20, 14),
      makeMaterial(COLORS.endEffector),
    );
    endMarker.position.x = lastLen;
    parent.add(endMarker);
  }

  root.userData.jointGroups = jointGroups;
  return root;
}

export function applyAngles(root, state) {
  const jointGroups = root.userData.jointGroups;
  if (!jointGroups) return;
  const links = state.links;
  const n = Math.min(links.length, jointGroups.length);
  for (let i = 0; i < n; i++) {
    applyRotation(jointGroups[i], links[i].axis, links[i].angleDeg);
  }
}

export function disposeRobotTree(root) {
  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.geometry?.dispose?.();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose?.());
      } else {
        obj.material?.dispose?.();
      }
    }
  });
}
