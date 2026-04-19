const TABS = [
  { id: 'setup', label: 'Setup' },
  { id: 'controls', label: 'Controls' },
  { id: 'view', label: 'View' },
  { id: 'telemetry', label: 'Telemetry' },
];

export function mountTabs(tabBarEl, onSwitch) {
  tabBarEl.innerHTML = '';
  const buttons = new Map();
  for (const tab of TABS) {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.dataset.tab = tab.id;
    btn.setAttribute('role', 'tab');
    btn.type = 'button';
    btn.textContent = tab.label;
    btn.addEventListener('click', () => activate(tab.id));
    tabBarEl.appendChild(btn);
    buttons.set(tab.id, btn);
  }

  function activate(id) {
    for (const [tid, btn] of buttons) {
      btn.classList.toggle('active', tid === id);
      const panel = document.getElementById(`panel-${tid}`);
      if (panel) panel.classList.toggle('hidden', tid !== id);
    }
    if (onSwitch) onSwitch(id);
  }

  activate('setup');
  return { activate };
}
