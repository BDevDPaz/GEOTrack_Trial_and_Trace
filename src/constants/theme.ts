export const PALETTE = {
  obsidian: '#0A0A0C',       // Fondo principal
  graphite: '#121214',       // Fondos secundarios (ej. inputs, pills)
  carbonMist: '#1C1C1F',     // Capas de elevación (ej. tarjetas, modales)
  steelLine: '#2A2A2E',      // Bordes y divisores estructurales
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#52525B',
  mutedGold: '#D4AF37',      // Acento principal
  successGreen: '#27AE60',
  amberWarning: '#F2994A',
  deepRed: '#EB5757',
  slateBlue: '#546E7A',
};

export const RADIUS = {
  round: 9999,
  cards: 16,
  inputs: 12,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const FONT = {
  h1: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600' as const },
  bodyStrong: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '500' as const },
  label: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1 },
};
