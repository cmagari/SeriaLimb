import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  GridHelper,
  AxesHelper,
  AmbientLight,
  DirectionalLight,
  Color,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function createSceneManager(container) {
  const scene = new Scene();
  scene.background = new Color(0x0b1020);

  const initW = Math.max(container.clientWidth, 1);
  const initH = Math.max(container.clientHeight, 1);

  const camera = new PerspectiveCamera(50, initW / initH, 0.05, 500);
  camera.position.set(4, 3.5, 5);
  camera.lookAt(0, 0.5, 0);

  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(initW, initH);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.target.set(0, 0.5, 0);
  controls.update();

  const grid = new GridHelper(20, 20, 0x475569, 0x1e293b);
  scene.add(grid);

  const axes = new AxesHelper(1.2);
  scene.add(axes);

  scene.add(new AmbientLight(0xffffff, 0.55));
  const dir = new DirectionalLight(0xffffff, 0.9);
  dir.position.set(5, 10, 7);
  scene.add(dir);
  const fill = new DirectionalLight(0x9fb3ff, 0.35);
  fill.position.set(-6, 4, -4);
  scene.add(fill);

  const resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  resizeObserver.observe(container);

  let rafId = 0;
  let running = true;
  function animate() {
    if (!running) return;
    rafId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  return {
    scene,
    camera,
    renderer,
    controls,
    dispose() {
      running = false;
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    },
  };
}
