# CLAUDE.md

## Project

SeriaLimb — browser-based 3D serial-link robot visualizer.

**Stack:** Vite 5 · Three.js 0.160 · Tailwind CSS v4 (`@tailwindcss/vite`)
**Dev server:** `npm run dev` → localhost:5173

## Architecture

```
src/
  model/
    robotState.js        # pub/sub state (events: 'structure', 'angles'); N links, per-link mass/axis/angle, payloadMass
  kinematics/
    forwardKinematics.js # segmentTransform (Matrix4 rot+trans) + accumulate → joint world positions
  scene/
    sceneManager.js      # WebGLRenderer, PerspectiveCamera, OrbitControls, ResizeObserver, animate loop
    robotMesh.js         # buildRobotTree / applyAngles / disposeRobotTree — joint Groups + link/joint cylinders
    comMarkers.js        # buildCoMMarkers / updateCoMMarkers / applyCoMVisibility — crosshairs + assembly sphere
    viewState.js         # showJointCoM / showLinkCoM / showAssemblyCoM toggles
  motion/
    motionPlanner.js     # RAF animation, smooth (ease-in-out) / linear easing, 0–120 s duration
  ui/
    tabs.js              # tab bar (Setup / Controls / View)
    setupPanel.js        # staged config form — link table, payload mass, Build/Refresh button
    controlsPanel.js     # Manual (sliders) + Planner (targets, duration, easing, progress bar) modes
    viewPanel.js         # CoM visibility checkboxes with colour swatches
```

## Key conventions

- Robot geometry: joint radius/height scales with `sqrt(jointMass)`; link radius scales with `sqrt(linkMass)`
- CoM markers use `depthTest: false` / `depthWrite: false` so they show through geometry
- `robotState` separates two events: `structure` (rebuild meshes) vs `angles` (update rotations only)
- Sidebar collapse: CSS `max-width` transition on `#sidebar-content`; inline style overrides for Tailwind flex
- Angles clamped to ±180°; link count 1–12; masses must be positive
