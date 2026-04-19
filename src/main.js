import { createRobotState } from './model/robotState.js';
import { createSceneManager } from './scene/sceneManager.js';
import { buildRobotTree, applyAngles, disposeRobotTree } from './scene/robotMesh.js';
import { buildCoMMarkers, updateCoMMarkers, applyCoMVisibility, disposeCoMMarkers } from './scene/comMarkers.js';
import { createViewState } from './scene/viewState.js';
import { createMotionPlanner } from './motion/motionPlanner.js';
import { mountTabs } from './ui/tabs.js';
import { mountSetupPanel } from './ui/setupPanel.js';
import { mountControlsPanel } from './ui/controlsPanel.js';
import { mountViewPanel } from './ui/viewPanel.js';

const viewport      = document.getElementById('viewport');
const tabBar        = document.getElementById('tab-bar');
const setupPanelEl  = document.getElementById('panel-setup');
const ctrlPanelEl   = document.getElementById('panel-controls');
const viewPanelEl   = document.getElementById('panel-view');

const state     = createRobotState({ numLinks: 3 });
const sceneMgr  = createSceneManager(viewport);
const planner   = createMotionPlanner(state);
const viewState = createViewState();

let robotRoot = buildRobotTree(state);
sceneMgr.scene.add(robotRoot);

let comRoot = buildCoMMarkers(state, robotRoot);
sceneMgr.scene.add(comRoot);
applyCoMVisibility(comRoot, viewState);

state.subscribe('structure', () => {
  sceneMgr.scene.remove(robotRoot);
  disposeRobotTree(robotRoot);
  robotRoot = buildRobotTree(state);
  sceneMgr.scene.add(robotRoot);

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
});

mountTabs(tabBar);
mountSetupPanel(setupPanelEl, state);
mountControlsPanel(ctrlPanelEl, state, planner);
mountViewPanel(viewPanelEl, viewState);
