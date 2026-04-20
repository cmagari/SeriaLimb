export const JOINT_COLORS = [
  '#3b82f6', '#f59e0b', '#22c55e', '#ef4444', '#a78bfa', '#38bdf8',
  '#f97316', '#ec4899', '#84cc16', '#14b8a6', '#e879f9', '#facc15',
];

export function jointColor(index) {
  return JOINT_COLORS[index % JOINT_COLORS.length];
}
