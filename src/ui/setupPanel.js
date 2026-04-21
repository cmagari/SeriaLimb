import { MIN_LINKS, MAX_LINKS, ANGLE_MIN, ANGLE_MAX } from '../model/robotState.js';
import { exportConfigCsv, parseConfigCsv } from '../model/configCsv.js';

export function mountSetupPanel(container, state) {
  let staged = cloneFromState(state);

  function render() {
    container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'mb-4';
    header.innerHTML = `
      <h2 class="text-sm font-semibold text-slate-200 mb-1">Robot Configuration</h2>
      <p class="text-xs text-slate-400">Define the chain, then click Build to instantiate.</p>
    `;
    container.appendChild(header);

    const nRow = document.createElement('div');
    nRow.className = 'mb-4 flex items-center gap-3';
    const nLabel = document.createElement('label');
    nLabel.htmlFor = 'num-links-input';
    nLabel.className = 'text-sm text-slate-300';
    nLabel.textContent = 'N (links)';
    const nInput = document.createElement('input');
    nInput.id = 'num-links-input';
    nInput.type = 'number';
    nInput.min = String(MIN_LINKS);
    nInput.max = String(MAX_LINKS);
    nInput.value = String(staged.numLinks);
    nInput.className = 'w-20';
    nRow.appendChild(nLabel);
    nRow.appendChild(nInput);
    const nHint = document.createElement('span');
    nHint.className = 'text-xs text-slate-500';
    nHint.textContent = `(${MIN_LINKS}-${MAX_LINKS})`;
    nRow.appendChild(nHint);
    container.appendChild(nRow);

    nInput.addEventListener('input', () => {
      const n = clampInt(nInput.value, MIN_LINKS, MAX_LINKS);
      staged = resizeStaged(staged, n);
      renderTable();
    });

    const tableWrap = document.createElement('div');
    tableWrap.id = 'link-table-wrap';
    tableWrap.className = 'mb-4';
    container.appendChild(tableWrap);

    const payloadRow = document.createElement('div');
    payloadRow.className = 'mb-4 flex items-center gap-3';
    const payloadLabel = document.createElement('label');
    payloadLabel.htmlFor = 'payload-mass-input';
    payloadLabel.className = 'text-sm text-slate-300';
    payloadLabel.textContent = 'Payload mass (kg)';
    const payloadInput = document.createElement('input');
    payloadInput.id = 'payload-mass-input';
    payloadInput.type = 'number';
    payloadInput.min = '0';
    payloadInput.step = '0.1';
    payloadInput.value = staged.payloadMass.toFixed(2);
    payloadInput.className = 'w-24';
    payloadInput.addEventListener('input', () => {
      const v = Number.parseFloat(payloadInput.value);
      if (Number.isFinite(v) && v >= 0) {
        staged.payloadMass = v;
      }
    });
    const payloadHint = document.createElement('span');
    payloadHint.className = 'text-xs text-slate-500';
    payloadHint.textContent = 'at end-effector';
    payloadRow.appendChild(payloadLabel);
    payloadRow.appendChild(payloadInput);
    payloadRow.appendChild(payloadHint);
    container.appendChild(payloadRow);

    const buildBtn = document.createElement('button');
    buildBtn.className = 'primary w-full mb-3';
    buildBtn.type = 'button';
    buildBtn.textContent = 'Build / Refresh';
    buildBtn.addEventListener('click', () => {
      state.setStructure(staged);
    });
    container.appendChild(buildBtn);

    container.appendChild(renderCsvRow());

    renderTable();
  }

  function renderCsvRow() {
    const row = document.createElement('div');
    row.className = 'flex gap-2';

    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.className = 'secondary flex-1';
    exportBtn.textContent = 'Export CSV';
    exportBtn.title = 'Download the current configuration as CSV';
    exportBtn.addEventListener('click', onExport);
    row.appendChild(exportBtn);

    const loadBtn = document.createElement('button');
    loadBtn.type = 'button';
    loadBtn.className = 'secondary flex-1';
    loadBtn.textContent = 'Load CSV';
    loadBtn.title = 'Load a configuration from a CSV file (applies immediately)';
    row.appendChild(loadBtn);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv,text/csv';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', onLoadFile);
    row.appendChild(fileInput);

    loadBtn.addEventListener('click', () => fileInput.click());
    return row;
  }

  function onExport() {
    const csv = exportConfigCsv(state.getSnapshot());
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serialimb_config_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onLoadFile(event) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseConfigCsv(text);
      state.setStructure(parsed);
    } catch (err) {
      window.alert(`Could not load CSV: ${err.message ?? err}`);
    }
  }

  function renderTable() {
    const wrap = container.querySelector('#link-table-wrap');
    if (!wrap) return;
    wrap.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'link-table';
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th style="width: 2rem">#</th>
        <th>Length<br><span class="unit">(m)</span></th>
        <th>Link mass<br><span class="unit">(kg)</span></th>
        <th>Joint mass<br><span class="unit">(kg)</span></th>
        <th style="width: 3.5rem">Axis</th>
        <th>Min &theta;<br><span class="unit">(&deg;)</span></th>
        <th>Max &theta;<br><span class="unit">(&deg;)</span></th>
      </tr>
    `;
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    for (let i = 0; i < staged.numLinks; i++) {
      const link = staged.links[i];
      const row = document.createElement('tr');

      const idxCell = document.createElement('td');
      idxCell.className = 'text-slate-400 text-center';
      idxCell.textContent = String(i + 1);
      row.appendChild(idxCell);

      row.appendChild(numberCell(link.length, 0.05, 'length', i));
      row.appendChild(numberCell(link.linkMass, 0.01, 'linkMass', i));
      row.appendChild(numberCell(link.jointMass, 0.01, 'jointMass', i));

      const axisCell = document.createElement('td');
      const axisSel = document.createElement('select');
      for (const a of ['x', 'y', 'z']) {
        const opt = document.createElement('option');
        opt.value = a;
        opt.textContent = a.toUpperCase();
        if (link.axis === a) opt.selected = true;
        axisSel.appendChild(opt);
      }
      axisSel.addEventListener('change', () => {
        staged.links[i].axis = axisSel.value;
      });
      axisCell.appendChild(axisSel);
      row.appendChild(axisCell);

      row.appendChild(limitCell(link.minAngleDeg, 'minAngleDeg', i));
      row.appendChild(limitCell(link.maxAngleDeg, 'maxAngleDeg', i));

      tbody.appendChild(row);
    }

    wrap.appendChild(table);
  }

  function numberCell(value, min, field, idx) {
    const td = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.1';
    input.min = String(min);
    input.value = String(value);
    input.addEventListener('input', () => {
      const v = Number.parseFloat(input.value);
      if (Number.isFinite(v) && v > 0) {
        staged.links[idx][field] = v;
      }
    });
    td.appendChild(input);
    return td;
  }

  function limitCell(value, field, idx) {
    const td = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '1';
    input.min = String(ANGLE_MIN);
    input.max = String(ANGLE_MAX);
    input.value = String(value);
    input.addEventListener('input', () => {
      const v = Number.parseFloat(input.value);
      if (!Number.isFinite(v)) return;
      const clamped = Math.max(ANGLE_MIN, Math.min(ANGLE_MAX, v));
      staged.links[idx][field] = clamped;
    });
    td.appendChild(input);
    return td;
  }

  state.subscribe('structure', () => {
    staged = cloneFromState(state);
    render();
  });

  render();
}

function cloneFromState(state) {
  const snap = state.getSnapshot();
  return {
    numLinks: snap.numLinks,
    payloadMass: snap.payloadMass,
    links: snap.links.map((l) => ({
      length: l.length,
      linkMass: l.linkMass,
      jointMass: l.jointMass,
      axis: l.axis,
      minAngleDeg: l.minAngleDeg,
      maxAngleDeg: l.maxAngleDeg,
    })),
  };
}

function resizeStaged(staged, n) {
  const newLinks = [];
  for (let i = 0; i < n; i++) {
    newLinks.push(
      staged.links[i]
        ? { ...staged.links[i] }
        : {
            length: 1.0,
            linkMass: 1.0,
            jointMass: 1.0,
            axis: 'z',
            minAngleDeg: ANGLE_MIN,
            maxAngleDeg: ANGLE_MAX,
          },
    );
  }
  return { numLinks: n, links: newLinks, payloadMass: staged.payloadMass };
}

function clampInt(v, min, max) {
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
