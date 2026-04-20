import { createRobotState } from './model/robotState.js';
import { createSceneManager } from './scene/sceneManager.js';
import { buildRobotTree, applyAngles, applyJointColors, disposeRobotTree } from './scene/robotMesh.js';
import { buildCoMMarkers, updateCoMMarkers, applyCoMVisibility, disposeCoMMarkers } from './scene/comMarkers.js';
import { createViewState } from './scene/viewState.js';
import { createMotionPlanner } from './motion/motionPlanner.js';
import { createKeyframeStore } from './motion/keyframes.js';
import { createDragControls } from './scene/dragControls.js';
import { mountTabs } from './ui/tabs.js';
import { mountSetupPanel } from './ui/setupPanel.js';
import { mountControlsPanel } from './ui/controlsPanel.js';
import { mountViewPanel } from './ui/viewPanel.js';
import { createTelemetryRecorder } from './motion/telemetryRecorder.js';
import { mountTelemetryPanel } from './ui/telemetryPanel.js';

const viewport      = document.getElementById('viewport');
const tabBar        = document.getElementById('tab-bar');
const setupPanelEl  = document.getElementById('panel-setup');
const ctrlPanelEl   = document.getElementById('panel-controls');
const viewPanelEl   = document.getElementById('panel-view');

const state     = createRobotState({ numLinks: 3 });
const sceneMgr  = createSceneManager(viewport);
const planner   = createMotionPlanner(state);
const viewState = createViewState();
const recorder  = createTelemetryRecorder(state, planner);
const keyframes = createKeyframeStore(state, planner, recorder);

let robotRoot = buildRobotTree(state);
sceneMgr.scene.add(robotRoot);

let comRoot = buildCoMMarkers(state, robotRoot);
sceneMgr.scene.add(comRoot);
applyCoMVisibility(comRoot, viewState);
applyJointColors(robotRoot, viewState.showJointColors);

state.subscribe('structure', () => {
  sceneMgr.scene.remove(robotRoot);
  disposeRobotTree(robotRoot);
  robotRoot = buildRobotTree(state);
  sceneMgr.scene.add(robotRoot);
  applyJointColors(robotRoot, viewState.showJointColors);

  sceneMgr.scene.remove(comRoot);
  disposeCoMMarkers(comRoot);
  comRoot = buildCoMMarkers(state, robotRoot);
  sceneMgr.scene.add(comRoot);
  applyCoMVisibility(comRoot, viewState);
});

state.subscribe('angles', () => {
  applyAngles(robotRoot, state);
  updateCoMMarkers(comRoot, state, robotRoot);
});

viewState.subscribe(() => {
  applyCoMVisibility(comRoot, viewState);
  applyJointColors(robotRoot, viewState.showJointColors);
});

createDragControls({
  renderer: sceneMgr.renderer,
  camera: sceneMgr.camera,
  controls: sceneMgr.controls,
  state,
  getRobotRoot: () => robotRoot,
});

mountTabs(tabBar);
mountSetupPanel(setupPanelEl, state);
mountControlsPanel(ctrlPanelEl, state, planner, keyframes);
mountViewPanel(viewPanelEl, viewState);

const telemetryPanelEl = document.getElementById('panel-telemetry');
mountTelemetryPanel(telemetryPanelEl, recorder, state);

// ── Sidebar collapse ────────────────────────────────────────────────────────
const sidebar       = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const toggleIcon    = sidebarToggle.querySelector('.sidebar-toggle-icon');

sidebarToggle.addEventListener('click', () => {
  const collapsing = !sidebar.classList.contains('sidebar-collapsed');
  sidebar.classList.toggle('sidebar-collapsed', collapsing);
  if (collapsing) {
    sidebar.style.flex    = '0 0 20px';
    sidebar.style.minWidth = '0';
    toggleIcon.textContent = '‹';
    sidebarToggle.title    = 'Expand panel';
  } else {
    sidebar.style.flex    = '';
    sidebar.style.minWidth = '';
    toggleIcon.textContent = '›';
    sidebarToggle.title    = 'Collapse panel';
  }
});
