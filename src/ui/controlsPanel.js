import { EASING_OPTIONS } from '../motion/motionPlanner.js';

export function mountControlsPanel(container, state, planner, keyframes) {
  let mode = 'manual';
  let manualRefs = emptyManualRefs();
  let plannerRefs = null;
  let sequenceRefs = null;

  function render() {
    container.innerHTML = '';
    manualRefs = emptyManualRefs();
    plannerRefs = null;
    sequenceRefs = null;

    renderHeader();
    if (state.numLinks === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-sm text-slate-500';
      empty.textContent = 'No links defined. Configure N in the Setup tab.';
      container.appendChild(empty);
      return;
    }
    if (mode === 'manual') renderManual();
    else if (mode === 'planner') renderPlanner();
    else renderSequence();
  }

  function renderHeader() {
    const header = document.createElement('div');
    header.className = 'mb-4 flex items-center justify-between gap-3';

    const modeGroup = document.createElement('div');
    modeGroup.className = 'mode-toggle';
    for (const [id, label] of [['manual', 'Manual'], ['planner', 'Planner'], ['sequence', 'Sequence']]) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `mode-btn${mode === id ? ' mode-btn-active' : ''}`;
      btn.textContent = label;
      btn.addEventListener('click', () => {
        if (mode === id) return;
        if (keyframes?.playing) keyframes.cancel();
        if (planner.running) planner.cancel();
        mode = id;
        render();
      });
      modeGroup.appendChild(btn);
    }
    header.appendChild(modeGroup);

    const resetBtn = document.createElement('button');
    resetBtn.className = 'secondary';
    resetBtn.type = 'button';
    resetBtn.textContent = 'Reset to 0';
    resetBtn.addEventListener('click', () => {
      if (keyframes?.playing) keyframes.cancel();
      if (planner.running) planner.cancel();
      state.resetAngles();
    });
    header.appendChild(resetBtn);

    container.appendChild(header);
  }

  function renderManual() {
    const rowsWrap = document.createElement('div');
    rowsWrap.className = 'space-y-3';
    container.appendChild(rowsWrap);

    for (let i = 0; i < state.numLinks; i++) {
      const link = state.links[i];
      const row = document.createElement('div');
      row.className = 'flex flex-col gap-1';

      const labelRow = document.createElement('div');
      labelRow.className = 'flex items-center justify-between text-xs';
      const labelSpan = document.createElement('span');
      labelSpan.className = 'text-slate-300 font-medium';
      labelSpan.innerHTML = `&theta;${i + 1} <span class="text-slate-500">(axis ${link.axis.toUpperCase()})</span>`;
      const readout = document.createElement('span');
      readout.className = 'text-slate-500 tabular-nums';
      readout.textContent = `${link.angleDeg.toFixed(1)}\u00b0`;
      labelRow.appendChild(labelSpan);
      labelRow.appendChild(readout);
      row.appendChild(labelRow);

      const ctrlRow = document.createElement('div');
      ctrlRow.className = 'flex items-center gap-2';
      const slider = makeAngleSlider(link.angleDeg);
      const number = makeAngleNumber(link.angleDeg);
      const unit = makeUnit();
      ctrlRow.appendChild(slider);
      ctrlRow.appendChild(number);
      ctrlRow.appendChild(unit);
      row.appendChild(ctrlRow);
      rowsWrap.appendChild(row);

      manualRefs.sliders.push(slider);
      manualRefs.numbers.push(number);
      manualRefs.readouts.push(readout);

      slider.addEventListener('input', () => {
        const v = Number.parseFloat(slider.value);
        if (!Number.isFinite(v)) return;
        number.value = v.toFixed(1);
        readout.textContent = `${v.toFixed(1)}\u00b0`;
        state.setAngle(i, v);
      });
      number.addEventListener('input', () => {
        const v = Number.parseFloat(number.value);
        if (!Number.isFinite(v)) return;
        slider.value = String(v);
        readout.textContent = `${v.toFixed(1)}\u00b0`;
        state.setAngle(i, v);
      });
    }
  }

  function renderPlanner() {
    const configRow = document.createElement('div');
    configRow.className = 'mb-3 grid grid-cols-2 gap-2';

    const durationWrap = document.createElement('label');
    durationWrap.className = 'flex flex-col gap-1 text-xs text-slate-400';
    durationWrap.innerHTML = '<span>Duration (s)</span>';
    const durationInput = document.createElement('input');
    durationInput.type = 'number';
    durationInput.min = '0';
    durationInput.max = '120';
    durationInput.step = '0.1';
    durationInput.value = planner.durationSeconds.toFixed(1);
    durationInput.addEventListener('input', () => {
      planner.setDuration(Number.parseFloat(durationInput.value));
    });
    durationWrap.appendChild(durationInput);
    configRow.appendChild(durationWrap);

    const easingWrap = document.createElement('label');
    easingWrap.className = 'flex flex-col gap-1 text-xs text-slate-400';
    easingWrap.innerHTML = '<span>Easing</span>';
    const easingSelect = document.createElement('select');
    for (const { value, label } of EASING_OPTIONS) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      if (planner.easing === value) opt.selected = true;
      easingSelect.appendChild(opt);
    }
    easingSelect.addEventListener('change', () => {
      planner.setEasing(easingSelect.value);
    });
    easingWrap.appendChild(easingSelect);
    configRow.appendChild(easingWrap);
    container.appendChild(configRow);

    const rowsWrap = document.createElement('div');
    rowsWrap.className = 'space-y-3 mb-3';
    container.appendChild(rowsWrap);

    const targetSliders = [];
    const targetNumbers = [];
    const currentReadouts = [];

    for (let i = 0; i < state.numLinks; i++) {
      const link = state.links[i];
      const target = planner.targets[i] ?? 0;
      const row = document.createElement('div');
      row.className = 'flex flex-col gap-1';

      const labelRow = document.createElement('div');
      labelRow.className = 'flex items-center justify-between text-xs';
      const labelSpan = document.createElement('span');
      labelSpan.className = 'text-slate-300 font-medium';
      labelSpan.innerHTML = `&theta;${i + 1} target <span class="text-slate-500">(axis ${link.axis.toUpperCase()})</span>`;
      const currentReadout = document.createElement('span');
      currentReadout.className = 'text-slate-500 tabular-nums';
      currentReadout.textContent = `now ${link.angleDeg.toFixed(1)}\u00b0`;
      labelRow.appendChild(labelSpan);
      labelRow.appendChild(currentReadout);
      row.appendChild(labelRow);

      const ctrlRow = document.createElement('div');
      ctrlRow.className = 'flex items-center gap-2';
      const slider = makeAngleSlider(target);
      const number = makeAngleNumber(target);
      const unit = makeUnit();
      ctrlRow.appendChild(slider);
      ctrlRow.appendChild(number);
      ctrlRow.appendChild(unit);
      row.appendChild(ctrlRow);
      rowsWrap.appendChild(row);

      targetSliders.push(slider);
      targetNumbers.push(number);
      currentReadouts.push(currentReadout);

      slider.addEventListener('input', () => {
        const v = Number.parseFloat(slider.value);
        if (!Number.isFinite(v)) return;
        number.value = v.toFixed(1);
        planner.setTarget(i, v);
      });
      number.addEventListener('input', () => {
        const v = Number.parseFloat(number.value);
        if (!Number.isFinite(v)) return;
        slider.value = String(v);
        planner.setTarget(i, v);
      });
    }

    const actionsRow = document.createElement('div');
    actionsRow.className = 'flex flex-wrap items-center gap-2 mb-3';
    const snapBtn = document.createElement('button');
    snapBtn.type = 'button';
    snapBtn.className = 'secondary';
    snapBtn.textContent = 'Snap to current';
    snapBtn.title = 'Copy the robot\u2019s current pose into the targets';
    snapBtn.addEventListener('click', () => planner.snapTargetsToCurrent());
    const zeroBtn = document.createElement('button');
    zeroBtn.type = 'button';
    zeroBtn.className = 'secondary';
    zeroBtn.textContent = 'Zero targets';
    zeroBtn.addEventListener('click', () => planner.zeroTargets());
    const runBtn = document.createElement('button');
    runBtn.type = 'button';
    runBtn.className = 'primary';
    runBtn.textContent = 'Run';
    runBtn.addEventListener('click', () => planner.start());
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => planner.cancel());
    actionsRow.appendChild(snapBtn);
    actionsRow.appendChild(zeroBtn);
    actionsRow.appendChild(runBtn);
    actionsRow.appendChild(cancelBtn);
    container.appendChild(actionsRow);

    const progressWrap = document.createElement('div');
    progressWrap.className = 'progress';
    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';
    progressFill.style.width = `${(planner.progress * 100).toFixed(1)}%`;
    progressWrap.appendChild(progressFill);
    container.appendChild(progressWrap);
    const progressText = document.createElement('p');
    progressText.className = 'text-xs text-slate-500 mt-1 tabular-nums';
    container.appendChild(progressText);

    plannerRefs = {
      durationInput,
      easingSelect,
      targetSliders,
      targetNumbers,
      currentReadouts,
      snapBtn,
      zeroBtn,
      runBtn,
      cancelBtn,
      progressFill,
      progressText,
    };
    syncPlannerUi();
  }

  function renderSequence() {
    if (!keyframes) {
      const msg = document.createElement('p');
      msg.className = 'text-sm text-slate-500';
      msg.textContent = 'Keyframe store unavailable.';
      container.appendChild(msg);
      return;
    }

    const hint = document.createElement('p');
    hint.className = 'text-xs text-slate-400 mb-3';
    hint.textContent = 'Pose the robot (drag in 3D or use Manual sliders), then capture keyframes. Play steps through them in order.';
    container.appendChild(hint);

    const configRow = document.createElement('div');
    configRow.className = 'mb-3 grid grid-cols-2 gap-2';

    const durationWrap = document.createElement('label');
    durationWrap.className = 'flex flex-col gap-1 text-xs text-slate-400';
    durationWrap.innerHTML = '<span>Per-segment duration (s)</span>';
    const durationInput = document.createElement('input');
    durationInput.type = 'number';
    durationInput.min = '0';
    durationInput.max = '120';
    durationInput.step = '0.1';
    durationInput.value = planner.durationSeconds.toFixed(1);
    durationInput.addEventListener('input', () => {
      planner.setDuration(Number.parseFloat(durationInput.value));
    });
    durationWrap.appendChild(durationInput);
    configRow.appendChild(durationWrap);

    const easingWrap = document.createElement('label');
    easingWrap.className = 'flex flex-col gap-1 text-xs text-slate-400';
    easingWrap.innerHTML = '<span>Easing</span>';
    const easingSelect = document.createElement('select');
    for (const { value, label } of EASING_OPTIONS) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      if (planner.easing === value) opt.selected = true;
      easingSelect.appendChild(opt);
    }
    easingSelect.addEventListener('change', () => {
      planner.setEasing(easingSelect.value);
    });
    easingWrap.appendChild(easingSelect);
    configRow.appendChild(easingWrap);
    container.appendChild(configRow);

    const listWrap = document.createElement('div');
    listWrap.className = 'space-y-2 mb-3';
    container.appendChild(listWrap);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'secondary w-full mb-3';
    addBtn.textContent = '+ Add keyframe from current pose';
    addBtn.addEventListener('click', () => keyframes.add());
    container.appendChild(addBtn);

    const actionsRow = document.createElement('div');
    actionsRow.className = 'flex flex-wrap items-center gap-2';
    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'primary';
    playBtn.textContent = 'Play sequence';
    playBtn.addEventListener('click', () => {
      keyframes.play(planner.durationSeconds, planner.easing);
    });
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => keyframes.cancel());
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'secondary';
    clearBtn.textContent = 'Clear all';
    clearBtn.title = 'Remove every keyframe';
    clearBtn.addEventListener('click', () => keyframes.clear());
    actionsRow.appendChild(playBtn);
    actionsRow.appendChild(cancelBtn);
    actionsRow.appendChild(clearBtn);
    container.appendChild(actionsRow);

    const statusText = document.createElement('p');
    statusText.className = 'text-xs text-slate-500 mt-2 tabular-nums';
    container.appendChild(statusText);

    sequenceRefs = {
      durationInput,
      easingSelect,
      listWrap,
      addBtn,
      playBtn,
      cancelBtn,
      clearBtn,
      statusText,
    };
    syncSequenceUi();
  }

  function rebuildKeyframeList() {
    if (!sequenceRefs) return;
    const wrap = sequenceRefs.listWrap;
    wrap.innerHTML = '';
    const playing = keyframes.playing;
    const frames = keyframes.frames;

    if (frames.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-xs text-slate-500 italic';
      empty.textContent = 'No keyframes yet.';
      wrap.appendChild(empty);
      return;
    }

    frames.forEach((frame, idx) => {
      const card = document.createElement('div');
      card.className = 'rounded border border-slate-700 bg-slate-800/40 p-2 text-xs';

      const head = document.createElement('div');
      head.className = 'flex items-center justify-between mb-1';
      const title = document.createElement('span');
      title.className = 'text-slate-200 font-medium';
      title.textContent = `Keyframe ${idx + 1}`;
      head.appendChild(title);

      const btnGroup = document.createElement('div');
      btnGroup.className = 'flex gap-1';
      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'secondary px-2 py-0.5 text-xs';
      saveBtn.textContent = 'Save current';
      saveBtn.title = 'Overwrite this keyframe with the current pose';
      saveBtn.disabled = playing;
      saveBtn.addEventListener('click', () => keyframes.saveTo(idx));
      const gotoBtn = document.createElement('button');
      gotoBtn.type = 'button';
      gotoBtn.className = 'secondary px-2 py-0.5 text-xs';
      gotoBtn.textContent = 'Go to';
      gotoBtn.title = 'Snap the robot to this pose';
      gotoBtn.disabled = playing;
      gotoBtn.addEventListener('click', () => keyframes.goto(idx));
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'secondary px-2 py-0.5 text-xs';
      delBtn.textContent = 'Delete';
      delBtn.disabled = playing;
      delBtn.addEventListener('click', () => keyframes.delete(idx));
      btnGroup.appendChild(saveBtn);
      btnGroup.appendChild(gotoBtn);
      btnGroup.appendChild(delBtn);
      head.appendChild(btnGroup);
      card.appendChild(head);

      const angleList = document.createElement('div');
      angleList.className = 'text-slate-400 tabular-nums';
      angleList.textContent = frame.angles
        .map((deg, j) => `\u03b8${j + 1}=${(deg ?? 0).toFixed(1)}\u00b0`)
        .join('  ');
      card.appendChild(angleList);

      wrap.appendChild(card);
    });
  }

  function syncSequenceUi() {
    if (!sequenceRefs) return;
    const r = sequenceRefs;
    const playing = keyframes.playing;
    const enoughFrames = keyframes.frames.length >= 2;

    r.addBtn.disabled = playing;
    r.playBtn.disabled = playing || !enoughFrames;
    r.cancelBtn.disabled = !playing;
    r.clearBtn.disabled = playing || keyframes.frames.length === 0;
    r.durationInput.disabled = playing;
    r.easingSelect.disabled = playing;

    if (document.activeElement !== r.durationInput) {
      const displayed = Number.parseFloat(r.durationInput.value);
      if (displayed !== planner.durationSeconds) {
        r.durationInput.value = planner.durationSeconds.toFixed(1);
      }
    }
    if (r.easingSelect.value !== planner.easing) r.easingSelect.value = planner.easing;

    if (playing) r.statusText.textContent = `Playing \u2026 ${keyframes.frames.length} keyframes`;
    else if (!enoughFrames) r.statusText.textContent = 'Add at least two keyframes to play.';
    else r.statusText.textContent = `${keyframes.frames.length} keyframes ready.`;

    rebuildKeyframeList();
  }

  function syncManualInputsFromState() {
    for (let i = 0; i < state.numLinks; i++) {
      const v = state.links[i].angleDeg;
      const slider = manualRefs.sliders[i];
      const number = manualRefs.numbers[i];
      const readout = manualRefs.readouts[i];
      if (slider && Number.parseFloat(slider.value) !== v) slider.value = String(v);
      if (number && document.activeElement !== number) {
        if (Number.parseFloat(number.value) !== v) number.value = v.toFixed(1);
      }
      if (readout) readout.textContent = `${v.toFixed(1)}\u00b0`;
    }
  }

  function syncPlannerCurrentFromState() {
    if (!plannerRefs) return;
    for (let i = 0; i < plannerRefs.currentReadouts.length; i++) {
      const v = state.links[i]?.angleDeg ?? 0;
      plannerRefs.currentReadouts[i].textContent = `now ${v.toFixed(1)}\u00b0`;
    }
  }

  function syncPlannerUi() {
    if (!plannerRefs) return;
    const r = plannerRefs;
    const isRunning = planner.running;

    r.runBtn.disabled = isRunning;
    r.cancelBtn.disabled = !isRunning;
    r.snapBtn.disabled = isRunning;
    r.zeroBtn.disabled = isRunning;
    r.durationInput.disabled = isRunning;
    r.easingSelect.disabled = isRunning;

    for (let i = 0; i < r.targetSliders.length; i++) {
      const v = planner.targets[i] ?? 0;
      const slider = r.targetSliders[i];
      const number = r.targetNumbers[i];
      slider.disabled = isRunning;
      number.disabled = isRunning;
      if (Number.parseFloat(slider.value) !== v) slider.value = String(v);
      if (document.activeElement !== number) {
        if (Number.parseFloat(number.value) !== v) number.value = v.toFixed(1);
      }
    }

    if (document.activeElement !== r.durationInput) {
      const displayed = Number.parseFloat(r.durationInput.value);
      if (displayed !== planner.durationSeconds) {
        r.durationInput.value = planner.durationSeconds.toFixed(1);
      }
    }

    const pct = planner.progress * 100;
    r.progressFill.style.width = `${pct.toFixed(1)}%`;
    if (isRunning) {
      r.progressText.textContent = `Running \u2026 ${pct.toFixed(0)}%`;
    } else if (planner.progress >= 1) {
      r.progressText.textContent = 'Motion complete';
    } else if (planner.progress > 0) {
      r.progressText.textContent = `Canceled at ${pct.toFixed(0)}%`;
    } else {
      r.progressText.textContent = 'Idle';
    }
  }

  state.subscribe('structure', render);

  state.subscribe('angles', () => {
    if (mode === 'manual') syncManualInputsFromState();
    else if (mode === 'planner') syncPlannerCurrentFromState();
  });

  planner.subscribe(() => {
    if (mode === 'planner') syncPlannerUi();
    else if (mode === 'sequence') syncSequenceUi();
  });

  if (keyframes) {
    keyframes.subscribe(() => {
      if (mode === 'sequence') syncSequenceUi();
    });
  }

  render();
}

function makeAngleSlider(value) {
  const el = document.createElement('input');
  el.type = 'range';
  el.min = '-180';
  el.max = '180';
  el.step = '0.1';
  el.value = String(value);
  el.className = 'flex-1';
  return el;
}

function makeAngleNumber(value) {
  const el = document.createElement('input');
  el.type = 'number';
  el.min = '-180';
  el.max = '180';
  el.step = '0.1';
  el.value = value.toFixed(1);
  el.className = 'w-20';
  return el;
}

function makeUnit() {
  const el = document.createElement('span');
  el.className = 'text-xs text-slate-500';
  el.textContent = '\u00b0';
  return el;
}

function emptyManualRefs() {
  return { sliders: [], numbers: [], readouts: [] };
}
