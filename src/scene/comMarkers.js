import {
  Group,
  LineSegments,
  BufferGeometry,
  Float32BufferAttribute,
  LineBasicMaterial,
  Mesh,
  SphereGeometry,
  TorusGeometry,
  MeshBasicMaterial,
  Vector3,
} from 'three';

const STYLE = {
  jointCoM:     { color: 0xfbbf24, size: 0.28 },  // amber
  linkCoM:      { color: 0x38bdf8, size: 0.22 },  // sky blue
  payloadCoM:   { color: 0xa3e635, size: 0.30 },  // lime
  assemblySphere: 0xfafafa,                        // white
  assemblyRing:   0xa78bfa,                        // violet
};

// Exported so the View panel can display a colour legend
export { STYLE as COM_STYLE };

function makeCrosshair(color, size) {
  const h = size / 2;
  const verts = new Float32Array([
    -h, 0, 0,   h, 0, 0,
     0,-h, 0,   0, h, 0,
     0, 0,-h,   0, 0, h,
  ]);
  const geom = new BufferGeometry();
  geom.setAttribute('position', new Float32BufferAttribute(verts, 3));
  const lines = new LineSegments(
    geom,
    new LineBasicMaterial({ color, depthTest: false, depthWrite: false }),
  );
  lines.renderOrder = 1;
  return lines;
}

function makeAssemblyGroup() {
  const g = new Group();
  g.add(new Mesh(
    new SphereGeometry(0.09, 16, 10),
    new MeshBasicMaterial({ color: STYLE.assemblySphere }),
  ));
  const rMat = new MeshBasicMaterial({ color: STYLE.assemblyRing });
  const rGeom = () => new TorusGeometry(0.17, 0.012, 8, 40);
  const r1 = new Mesh(rGeom(), rMat);
  const r2 = new Mesh(rGeom(), rMat);
  r2.rotation.x = Math.PI / 2;
  const r3 = new Mesh(rGeom(), rMat);
  r3.rotation.y = Math.PI / 2;
  g.add(r1, r2, r3);
  return g;
}

export function buildCoMMarkers(state, robotRoot) {
  const root = new Group();
  root.name = 'comMarkers';

  const jointCoMGroup = new Group();
  const linkCoMGroup  = new Group();
  const assemblyGroup = makeAssemblyGroup();

  root.add(jointCoMGroup, linkCoMGroup, assemblyGroup);

  const jointCrosshairs   = [];
  const linkCrosshairs    = [];

  for (let i = 0; i < state.numLinks; i++) {
    const jc = makeCrosshair(STYLE.jointCoM.color, STYLE.jointCoM.size);
    jointCoMGroup.add(jc);
    jointCrosshairs.push(jc);

    const lc = makeCrosshair(STYLE.linkCoM.color, STYLE.linkCoM.size);
    linkCoMGroup.add(lc);
    linkCrosshairs.push(lc);
  }

  // Payload CoM — grouped under linkCoMGroup so its visibility is toggled together
  const payloadCrosshair = makeCrosshair(STYLE.payloadCoM.color, STYLE.payloadCoM.size);
  linkCoMGroup.add(payloadCrosshair);

  root.userData = {
    jointCoMGroup,
    linkCoMGroup,
    assemblyGroup,
    jointCrosshairs,
    linkCrosshairs,
    payloadCrosshair,
  };

  updateCoMMarkers(root, state, robotRoot);
  return root;
}

export function updateCoMMarkers(comRoot, state, robotRoot) {
  robotRoot.updateMatrixWorld(true);

  const { jointCrosshairs, linkCrosshairs, payloadCrosshair, assemblyGroup } = comRoot.userData;
  const jointGroups = robotRoot.userData.jointGroups;
  const links = state.links;
  const n = links.length;

  if (!jointGroups || n === 0) return;

  const tmp = new Vector3();

  for (let i = 0; i < n; i++) {
    // Joint CoM at the joint pivot (world position of jointGroup)
    jointGroups[i].getWorldPosition(tmp);
    jointCrosshairs[i].position.copy(tmp);

    // Link CoM at link midpoint
    tmp.set(links[i].length / 2, 0, 0);
    tmp.applyMatrix4(jointGroups[i].matrixWorld);
    linkCrosshairs[i].position.copy(tmp);
  }

  // Payload CoM at tip of last link
  tmp.set(links[n - 1].length, 0, 0);
  tmp.applyMatrix4(jointGroups[n - 1].matrixWorld);
  payloadCrosshair.position.copy(tmp);

  // Assembly CoM = weighted average of all point masses
  assemblyGroup.position.copy(computeAssemblyCoM(state, jointGroups, links));
}

export function applyCoMVisibility(comRoot, viewState) {
  const { jointCoMGroup, linkCoMGroup, assemblyGroup } = comRoot.userData;
  jointCoMGroup.visible  = viewState.showJointCoM;
  linkCoMGroup.visible   = viewState.showLinkCoM;
  assemblyGroup.visible  = viewState.showAssemblyCoM;
}

export function disposeCoMMarkers(comRoot) {
  comRoot.traverse((obj) => {
    if (obj.isLineSegments || obj.isMesh) {
      obj.geometry?.dispose?.();
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
      else obj.material?.dispose?.();
    }
  });
}

function computeAssemblyCoM(state, jointGroups, links) {
  const n = links.length;
  let totalMass = 0;
  const comPos = new Vector3();
  const tmp = new Vector3();

  for (let i = 0; i < n; i++) {
    // Joint mass at joint pivot
    jointGroups[i].getWorldPosition(tmp);
    comPos.addScaledVector(tmp, links[i].jointMass);
    totalMass += links[i].jointMass;

    // Link mass at link midpoint
    tmp.set(links[i].length / 2, 0, 0);
    tmp.applyMatrix4(jointGroups[i].matrixWorld);
    comPos.addScaledVector(tmp, links[i].linkMass);
    totalMass += links[i].linkMass;
  }

  // Payload at tip of last link
  tmp.set(links[n - 1].length, 0, 0);
  tmp.applyMatrix4(jointGroups[n - 1].matrixWorld);
  comPos.addScaledVector(tmp, state.payloadMass);
  totalMass += state.payloadMass;

  if (totalMass > 0) comPos.divideScalar(totalMass);
  return comPos;
}
