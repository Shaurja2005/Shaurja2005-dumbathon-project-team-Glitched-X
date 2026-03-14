export const state = {
  unlocked: false,
  captchaSolved: false,
  currentRule: "safe",
  safeIndices: new Set(),
  selectedIndices: new Set(),
  pendingAction: null,
  shuffleCycles: 0,
};
