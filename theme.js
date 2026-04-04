export const colors = {
  primary: '#00E676',      // electric green
  primaryDark: '#00C853',
  primaryLight: '#E8FFF0',
  accent: '#F59E0B',       // amber for highlights
  success: '#10B981',      // green for cheapest
  bg: '#F8FAFF',
  card: '#FFFFFF',
  ink: '#1E293B',
  ink2: '#475569',
  muted: '#94A3B8',
  border: '#E2E8F0',
};

export const storeColors = {
  lidl:         '#0050AA',
  konzum:       '#E30613',
  kaufland:     '#E30613',
  spar:         '#007A3D',
  studenac:     '#F7A800',
  tommy:        '#005CA9',
  plodine:      '#E30613',
  eurospin:     '#FFD700',
  dm:           '#CC0066',
  ktc:          '#004B87',
  metro:        '#003C78',
  ntl:          '#E30613',
  ribola:       '#005CA9',
  roto:         '#E30613',
  trgocentar:   '#005CA9',
  brodokomerc:  '#005CA9',
  lorenco:      '#005CA9',
  boso:         '#005CA9',
  vrutak:       '#005CA9',
  zabac:        '#005CA9',
};

export function getStoreInitial(store) {
  return store ? store.charAt(0).toUpperCase() : '?';
}
