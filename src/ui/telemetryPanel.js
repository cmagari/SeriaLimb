import { Chart } from 'chart.js/auto';

Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = '#1e293b';

const JOINT_COLORS = [
  '#3b82f6', '#f59e0b', '#22c55e', '#ef4444', '#a78bfa', '#38bdf8',
  '#f97316', '#ec4899', '#84cc16', '#14b8a6', '#e879f9', '#facc15',
];

const METRICS = [
  { key: 'angles',     label: 'Joint Angles',    unit: '°',     yLabel: 'angle (°)' },
  { key: 'velocities', label: 'Joint Velocity',   unit: '°/s',   yLabel: 'velocity (°/s)' },
  { key: 'torques',    label: 'Joint Torque',     unit: 'N·m',   yLabel: 'torque (N·m)' },
  { key: 'powers',     label: 'Joint Power',      unit: 'W',     yLabel: 'power (W)' },
];

export function mountTelemetryPanel(container, recorder, state) {
  let chartInstances = [];
  let selectedIndex = 0;

  recorder.subscribe(render);
  render();

  function render() {
    destroyCharts();
    container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'mb-4';
    header.innerHTML = `
      <h2 class="text-sm font-semibold text-slate-200 mb-1">Telemetry</h2>
      <p class="text-xs text-slate-400">Per-joint data recorded from the last planner session.</p>
    `;
    container.appendChild(header);

    if (recorder.sessions.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-sm text-slate-500';
      empty.textContent = 'Run a planner session to record telemetry.';
      container.appendChild(empty);
      return;
    }

    // Clamp selection in case sessions were cleared
    selectedIndex = Math.min(selectedIndex, recorder.sessions.length - 1);
    const session = recorder.sessions[selectedIndex];

    renderControls(session);
    renderLegend(session.numLinks);
    renderCharts(session);
  }

  function renderControls(session) {
    const row = document.createElement('div');
    row.className = 'mb-3 flex items-center gap-2 flex-wrap';

    if (recorder.sessions.length > 1) {
      const sel = document.createElement('select');
      sel.className = 'flex-1';
      recorder.sessions.forEach((s, i) => {
        const opt = document.createElement('option');
        opt.value = String(i);
        const d = new Date(s.id);
        const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        opt.textContent = `Session ${i + 1} — ${s.durationSeconds.toFixed(1)}s ${s.easing} (${time})`;
        opt.selected = i === selectedIndex;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', () => {
        selectedIndex = Number(sel.value);
        render();
      });
      row.appendChild(sel);
    } else {
      const d = new Date(session.id);
      const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const info = document.createElement('span');
      info.className = 'text-xs text-slate-400 flex-1';
      info.textContent = `Session 1 — ${session.durationSeconds.toFixed(1)}s ${session.easing} (${time})`;
      row.appendChild(info);
    }

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'secondary';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', () => {
      recorder.sessions.splice(0);
      selectedIndex = 0;
      render();
    });
    row.appendChild(clearBtn);
    container.appendChild(row);

    const exportRow = document.createElement('div');
    exportRow.className = 'mb-4 flex gap-2';

    const csvBtn = document.createElement('button');
    csvBtn.type = 'button';
    csvBtn.className = 'secondary';
    csvBtn.textContent = 'Export CSV';
    csvBtn.addEventListener('click', () => exportCsv(session));
    exportRow.appendChild(csvBtn);

    const pngBtn = document.createElement('button');
    pngBtn.type = 'button';
    pngBtn.className = 'secondary';
    pngBtn.textContent = 'Export PNG';
    pngBtn.addEventListener('click', () => exportPng(chartInstances, session));
    exportRow.appendChild(pngBtn);

    container.appendChild(exportRow);
  }

  function renderLegend(numLinks) {
    const legend = document.createElement('div');
    legend.className = 'flex flex-wrap gap-x-3 gap-y-1 mb-3';
    for (let i = 0; i < numLinks; i++) {
      const item = document.createElement('span');
      item.className = 'flex items-center gap-1 text-xs text-slate-400';
      const dot = document.createElement('span');
      dot.style.cssText = `display:inline-block;width:8px;height:8px;border-radius:50%;background:${JOINT_COLORS[i]};flex-shrink:0`;
      item.appendChild(dot);
      item.appendChild(document.createTextNode(`J${i + 1}`));
      legend.appendChild(item);
    }
    container.appendChild(legend);
  }

  function renderCharts(session) {
    chartInstances = [];
    for (const metric of METRICS) {
      const label = document.createElement('p');
      label.className = 'text-xs text-slate-400 mb-1';
      label.textContent = `${metric.label} (${metric.unit})`;
      container.appendChild(label);

      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:relative;height:150px;margin-bottom:16px';
      const canvas = document.createElement('canvas');
      wrap.appendChild(canvas);
      container.appendChild(wrap);

      const datasets = [];
      for (let i = 0; i < session.numLinks; i++) {
        datasets.push({
          label: `J${i + 1}`,
          data: session.samples.map((s) => ({ x: s.elapsed, y: s[metric.key][i] ?? 0 })),
          borderColor: JOINT_COLORS[i],
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.2,
        });
      }

      const chart = new Chart(canvas, {
        type: 'line',
        data: { datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: {
            legend: { display: false },
            tooltip: { mode: 'index', intersect: false },
          },
          scales: {
            x: {
              type: 'linear',
              title: { display: true, text: 'time (s)', font: { size: 10 } },
              ticks: { font: { size: 10 } },
            },
            y: {
              title: { display: true, text: metric.yLabel, font: { size: 10 } },
              ticks: { font: { size: 10 } },
            },
          },
        },
      });
      chartInstances.push(chart);
    }
  }

  function destroyCharts() {
    for (const c of chartInstances) c.destroy();
    chartInstances = [];
  }
}

// ── CSV export ────────────────────────────────────────────────────────────────

function exportCsv(session) {
  const n = session.numLinks;
  const headers = ['time_s'];
  for (let i = 0; i < n; i++) headers.push(`theta${i + 1}_deg`);
  for (let i = 0; i < n; i++) headers.push(`omega${i + 1}_degs`);
  for (let i = 0; i < n; i++) headers.push(`tau${i + 1}_Nm`);
  for (let i = 0; i < n; i++) headers.push(`P${i + 1}_W`);

  const lines = [headers.join(',')];
  for (const s of session.samples) {
    const row = [s.elapsed.toFixed(4)];
    for (let i = 0; i < n; i++) row.push((s.angles[i] ?? 0).toFixed(4));
    for (let i = 0; i < n; i++) row.push((s.velocities[i] ?? 0).toFixed(4));
    for (let i = 0; i < n; i++) row.push((s.torques[i] ?? 0).toFixed(4));
    for (let i = 0; i < n; i++) row.push((s.powers[i] ?? 0).toFixed(4));
    lines.push(row.join(','));
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `telemetry_${session.id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PNG export ────────────────────────────────────────────────────────────────

function exportPng(charts, session) {
  if (charts.length === 0) return;
  const LABEL_H = 20;
  const HEAD_H = 24;
  const W = charts[0].canvas.width;
  const CH = charts[0].canvas.height;

  const offscreen = document.createElement('canvas');
  offscreen.width = W;
  offscreen.height = HEAD_H + (LABEL_H + CH) * charts.length + 8;
  const ctx = offscreen.getContext('2d');
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, offscreen.width, offscreen.height);

  const d = new Date(session.id);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText(
    `SeriaLimb Telemetry — ${session.durationSeconds.toFixed(1)}s ${session.easing} — ${d.toLocaleString()}`,
    8, 16,
  );

  const imgs = charts.map((c) => {
    const img = new Image();
    img.src = c.toBase64Image('image/png', 1);
    return img;
  });

  Promise.all(
    imgs.map(
      (img) =>
        new Promise((resolve) => {
          img.onload = resolve;
          if (img.complete) resolve();
        }),
    ),
  ).then(() => {
    let y = HEAD_H;
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    for (let i = 0; i < charts.length; i++) {
      ctx.fillText(METRICS[i].label + ` (${METRICS[i].unit})`, 8, y + 14);
      ctx.drawImage(imgs[i], 0, y + LABEL_H);
      y += LABEL_H + CH;
    }
    const a = document.createElement('a');
    a.download = `telemetry_${session.id}.png`;
    a.href = offscreen.toDataURL('image/png');
    a.click();
  });
}
