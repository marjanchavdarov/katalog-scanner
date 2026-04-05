export const colors = {
  primary: '#00C853',
  primaryDark: '#00A040',
  primaryLight: '#E8FFF0',
  accent: '#F59E0B',
  success: '#00C853',
  bg: '#F4F6F9',
  card: '#FFFFFF',
  ink: '#1E293B',
  ink2: '#475569',
  muted: '#94A3B8',
  border: '#E2E8F0',
};
export const storeColors = {
  lidl:'#0050AA', konzum:'#E8001C', kaufland:'#E30613',
  spar:'#007A3D', interspar:'#007A3D', studenac:'#F7A800',
  tommy:'#005CA9', plodine:'#6B21A8', eurospin:'#D97706',
  dm:'#CC0066', ktc:'#004B87', metro:'#003C78',
  ntl:'#059669', ribola:'#1D4ED8', roto:'#B45309',
  trgocentar:'#0369A1', brodokomerc:'#0E7490',
  lorenco:'#1E3A8A', boso:'#7C3AED', vrutak:'#065F46',
  zabac:'#166534', jadranka_trgovina:'#0C4A6E', trgovina_krk:'#134E4A',
};
export function getStoreInitial(store) {
  return store ? store.charAt(0).toUpperCase() : '?';
}
