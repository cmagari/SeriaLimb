import { JOINT_COLORS } from '../scene/jointColors.js';

const TOGGLES = [
  {
    key: 'showJointCoM',
    label: 'Joint CoM markers',
    desc: 'Crosshair at each joint pivot (point mass location)',
    swatches: [{ color: '#fbbf24', tip: 'joint' }],
  },
  {
    key: 'showLinkCoM',
    label: 'Link & payload CoM markers',
    desc: 'Crosshairs at each link midpoint and at the end-effector',
    swatches: [
      { color: '#38bdf8', tip: 'link center' },
      { color: '#a3e635', tip: 'payload' },
    ],
  },
  {
    key: 'showAssemblyCoM',
    label: 'Assembly CoM',
    desc: 'Weighted center of mass of the full robot (all links, joints, payload)',
    swatches: [
      { color: '#fafafa', tip: 'sphere' },
      { color: '#a78bfa', tip: 'rings' },
    ],
  },
  {
    key: 'showJointColors',
    label: 'Highlight joints by color',
    desc: 'Color each joint to match its series in the telemetry graphs',
    swatches: JOINT_COLORS.slice(0, 4).map((c, i) => ({ color: c, tip: `J${i + 1}` })),
  },
];

export function mountViewPanel(container, viewState) {
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'mb-4';
  header.innerHTML = `
    <h2 class="text-sm font-semibold text-slate-200 mb-1">CoM Visualization</h2>
    <p class="text-xs text-slate-400">Toggle center-of-mass indicators in the viewport.</p>
  `;
  container.appendChild(header);

  const list = document.createElement('div');
  list.className = 'space-y-2';
  container.appendChild(list);

  const checkboxes = new Map();

  for (const item of TOGGLES) {
    const row = document.createElement('label');
    row.className = 'com-toggle-row';
    row.htmlFor = `com-toggle-${item.key}`;

    const topLine = document.createElement('div');
    topLine.className = 'flex items-center gap-2';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `com-toggle-${item.key}`;
    checkbox.checked = viewState[item.key];
    checkbox.className = 'com-checkbox';
    checkbox.addEventListener('change', () => viewState.toggle(item.key));

    const labelText = document.createElement('span');
    labelText.className = 'text-sm text-slate-200 font-medium';
    labelText.textContent = item.label;

    const swatchGroup = document.createElement('span');
    swatchGroup.className = 'flex items-center gap-1 ml-auto';
    for (const s of item.swatches) {
      const dot = document.createElement('span');
      dot.className = 'com-swatch';
      dot.style.background = s.color;
      dot.title = s.tip;
      swatchGroup.appendChild(dot);
    }

    topLine.appendChild(checkbox);
    topLine.appendChild(labelText);
    topLine.appendChild(swatchGroup);

    const descEl = document.createElement('p');
    descEl.className = 'text-xs text-slate-500 ml-6 mt-0.5';
    descEl.textContent = item.desc;

    row.appendChild(topLine);
    row.appendChild(descEl);
    list.appendChild(row);

    checkboxes.set(item.key, checkbox);
  }

  viewState.subscribe(() => {
    for (const [key, checkbox] of checkboxes) {
      checkbox.checked = viewState[key];
    }
  });
}
