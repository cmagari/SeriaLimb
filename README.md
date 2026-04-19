# SeriaLimb

A browser-based 3D visualizer for **N-link revolute serial robots**. Define the chain, drive each joint angle with a slider, and watch the arm update live in a Three.js viewport.

---

## Prerequisites

- **Node.js 18+** (tested on 22.x) and npm.
- A modern browser with WebGL (Chrome, Firefox, Edge, Safari).

---

## Install & run

```bash
npm install
npm run dev
```

Vite will print a local URL (e.g. `http://localhost:5173/`). Open it in your browser.

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server with hot reload. |
| `npm run build` | Produce a production bundle in `dist/`. |
| `npm run preview` | Serve the production bundle locally. |

---

## Using the app

The window is split 70 / 30: the **3D viewport** on the left and the **sidebar** (Setup + Controls tabs) on the right.

### Viewport

- **Left-click + drag** — orbit the camera.
- **Right-click + drag** — pan.
- **Scroll wheel** — zoom.
- The grid is on the XZ plane (Y up); axes helper shows X (red), Y (green), Z (blue) at the base.
- Color key: **slate** cylinder = base, **orange** cylinders = joints (length-axis = each joint's rotation axis), **blue** cylinders = links, **green** sphere = end-effector payload.

### Setup tab

Defines the robot's structure. Edits here stage locally — nothing changes in the scene until you click **Build / Refresh**.

| Field | Meaning |
| --- | --- |
| `N (links)` | Number of links in the chain (1–12). |
| `Length (m)` | Link length in meters, measured along its local +X axis. |
| `Link mass (kg)` | Point mass at the **center of the link**; controls link cylinder radius (`r ∝ √mass`). |
| `Joint mass (kg)` | Actuator mass at the **center of the joint**; controls joint cylinder radius. |
| `Axis` | Rotation axis for this joint: `X`, `Y`, or `Z` (default `Z`). |
| `Payload mass (kg)` | Mass at the end-effector; controls the green tip sphere radius. |

Click **Build / Refresh** to apply. Joint angles are preserved across rebuilds when the link index still exists.

> **Mass convention.** Link and joint masses are treated as point masses placed at the geometric center of their respective element (link midpoint, joint pivot). The payload mass is a point mass at the tip of the last link. This is the convention future CoM / dynamics work will assume.

### Controls tab

Has two modes, toggled at the top: **Manual** and **Planner**. **Reset to 0** is available in either mode (cancels a running motion and zeroes all joint angles).

#### Manual mode

One row per joint, generated from the current structure:

- **Slider** — drag from −180° to +180°.
- **Number input** — type a precise value; slider follows.
- **Readout** — shows the current angle in degrees, updated live.

Changes apply immediately to the 3D model.

#### Planner mode

Animates the robot from its current pose to a set of target joint angles over a fixed duration.

| Control | Purpose |
| --- | --- |
| `Duration (s)` | How long the motion should take (0–120 s). `0` snaps instantly. |
| `Easing` | `Smooth` (cubic ease-in-out, default) or `Linear`. |
| Per-joint target slider + number | The angle you want θᵢ to reach. The *now* readout on the right shows the live current angle. |
| `Snap to current` | Copies the robot's current pose into the targets (handy starting point). |
| `Zero targets` | Sets every target back to 0°. |
| `Run` | Kicks off the motion. All joints start together and arrive together. |
| `Cancel` | Stops a running motion immediately (robot freezes at its current pose). |
| Progress bar | Fills left-to-right while the motion runs; shows the outcome when it stops. |

Inputs are disabled while a motion is running; switching back to Manual mode also cancels any active motion.

---

### View tab

Toggle CoM (center-of-mass) visualizations. Markers are always positioned in world space and update in real time as joints are driven.

| Toggle | Visual | What it shows |
| --- | --- | --- |
| **Joint CoM markers** | Amber crosshairs | Point mass at each joint pivot |
| **Link & payload CoM markers** | Sky-blue crosshairs (links) + lime crosshair (payload) | Point mass at each link midpoint; separate style at the end-effector |
| **Assembly CoM** | White sphere + violet rings | Weighted center of mass of the entire robot: all joint masses + link masses + payload |

The crosshair geometry (three perpendicular line segments) is the standard mechanics notation for a point mass. The assembly marker uses a sphere-plus-rings to distinguish it clearly from the individual markers.

---

## Kinematics

Each joint `i` applies the transform

```
T_i = R_axis_i(θ_i) · Tx(L_i)
```

where `R_axis` is a rotation about the selected local axis and `Tx(L)` is a translation of the link length along the local +X axis. The world-frame transform for joint `n` is `T_1 · T_2 · … · T_n`. The scene graph nests these as Three.js `Group`s so rotations propagate to downstream links automatically.

---

## Project layout

```
SeriaLimb/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.js                 # entry: wires state, scene, UI
    ├── style.css               # Tailwind v4 + component styles
    ├── model/
    │   └── robotState.js       # state store with pub/sub
    ├── kinematics/
    │   └── forwardKinematics.js
    ├── motion/
    │   └── motionPlanner.js    # target angles, easing, rAF animation loop
    ├── scene/
    │   ├── sceneManager.js     # renderer, camera, lights, orbit
    │   └── robotMesh.js        # hierarchical robot tree
    └── ui/
        ├── tabs.js
        ├── setupPanel.js
        └── controlsPanel.js    # manual + planner modes
```

## Tech stack

- **Vite 5** — dev server and bundler.
- **Three.js** — scene graph, `Matrix4`, `OrbitControls`.
- **Tailwind CSS v4** — styling via the `@tailwindcss/vite` plugin.

---

## Roadmap

- JSON / URDF export of the current configuration.
- Inverse Kinematics — drag the end-effector to solve joint angles.
- Center-of-Mass visualization (masses are already captured in state).
- Simple gravity simulation for unpowered joints.
