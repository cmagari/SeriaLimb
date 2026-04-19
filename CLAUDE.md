# CLAUDE.md

## Project

SeriaLimb — browser-based 3D serial-link robot visualizer.

**Stack:** Vite 5 · Three.js 0.160 · Tailwind CSS v4 (`@tailwindcss/vite`) · Chart.js
**Dev server:** `npm run dev` → localhost:5173

## Architecture

```
src/
  model/
    robotState.js          # pub/sub state (events: 'structure', 'angles'); N links, per-link mass/axis/angle, payloadMass
  kinematics/
    forwardKinematics.js   # segmentTransform (Matrix4 rot+trans) + accumulate → joint world positions
    inverseKinematics.js   # solveCCD — cyclic coordinate descent IK for arbitrary per-joint axes
  scene/
    sceneManager.js        # WebGLRenderer, PerspectiveCamera, OrbitControls, ResizeObserver, animate loop
    robotMesh.js           # buildRobotTree / applyAngles / disposeRobotTree — joint Groups + link/joint cylinders; tags drag handles
    comMarkers.js          # buildCoMMarkers / updateCoMMarkers / applyCoMVisibility — crosshairs + assembly sphere
    viewState.js           # showJointCoM / showLinkCoM / showAssemblyCoM toggles
    dragControls.js        # pointer/raycaster handlers — IK on tip, FK on joint cylinders; disables OrbitControls during drag
  motion/
    motionPlanner.js       # RAF animation, smooth (ease-in-out) / linear easing, 0–120 s duration
    telemetryRecorder.js   # per-frame angle/velocity/torque/power recorder; beginGroup/endGroup merges multi-segment runs into one session
    keyframes.js           # keyframe store + sequence player (chains planner runs through frames; wraps recorder group)
  ui/
    tabs.js                # tab bar (Setup / Controls / View / Telemetry)
    setupPanel.js          # staged config form — link table, payload mass, Build/Refresh button
    controlsPanel.js       # Manual (sliders) + Planner (targets, duration, easing, progress bar) + Sequence (keyframes) modes
    viewPanel.js           # CoM visibility checkboxes with colour swatches
    telemetryPanel.js      # Chart.js plots + session selector + CSV/PNG export
```

## Key conventions

- Robot geometry: joint radius/height scales with `sqrt(jointMass)`; link radius scales with `sqrt(linkMass)`
- CoM markers use `depthTest: false` / `depthWrite: false` so they show through geometry
- `robotState` separates two events: `structure` (rebuild meshes) vs `angles` (update rotations only)
- Drag handles: meshes carry `userData.dragHandle = { type: 'tip' | 'joint', index? }`; `dragControls` walks ancestors to find one
- Telemetry sessions: a normal `planner.start()` produces one session; wrapping a group of starts in `recorder.beginGroup()` / `endGroup()` merges them into a single continuous session (used by `keyframes.play`)
- Keyframes persist across structure changes — `play()` pads/truncates to current `numLinks`; user clears explicitly via the panel
- Sidebar collapse: CSS `max-width` transition on `#sidebar-content`; inline style overrides for Tailwind flex
- Angles clamped to ±180°; link count 1–12; masses must be positive
