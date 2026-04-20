export function createViewState() {
  const flags = {
    showJointCoM: false,
    showLinkCoM: false,
    showAssemblyCoM: false,
    showJointColors: false,
  };
  const listeners = new Set();

  function emit() {
    for (const cb of listeners) cb(api);
  }

  const api = {
    get showJointCoM() { return flags.showJointCoM; },
    get showLinkCoM() { return flags.showLinkCoM; },
    get showAssemblyCoM() { return flags.showAssemblyCoM; },
    get showJointColors() { return flags.showJointColors; },

    toggle(key) {
      if (!(key in flags)) return;
      flags[key] = !flags[key];
      emit();
    },

    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };

  return api;
}
