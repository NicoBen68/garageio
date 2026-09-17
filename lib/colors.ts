import { useColorScheme } from 'react-native';

export const palette = {
  // Bleu principal
  blue:        '#3B82F6',
  blueDark:    '#2563EB',
  blueDeep:    '#1D4ED8',

  // Verts
  green:       '#22C55E',
  greenDark:   '#166534',
  greenBg:     '#0F4C35',

  // Rouges
  red:         '#EF4444',
  redLight:    '#FCA5A5',
  redBg:       '#1A0F0F',

  // Oranges
  orange:      '#F59E0B',
  orangeBg:    '#1A160A',

  // Violets
  purple:      '#A855F7',

  // Transparents
  transparent: 'transparent',
};

// ── Glassmorphism tokens ─────────────────────────────────────────────────────
export const glass = {
  // Cards / surfaces verre
  card:           'rgba(255,255,255,0.08)',
  cardStrong:     'rgba(255,255,255,0.12)',
  cardBorder:     'rgba(255,255,255,0.15)',
  cardBorderSoft: 'rgba(255,255,255,0.08)',

  // Inputs
  input:          'rgba(255,255,255,0.06)',
  inputBorder:    'rgba(255,255,255,0.18)',

  // Tab bar
  tabBar:         'rgba(10,15,30,0.75)',
  tabBorder:      'rgba(255,255,255,0.08)',

  // Blobs de fond dark
  blobBlue:       '#3B82F6',
  blobGreen:      '#22C55E',

  // Textes
  textPrimary:    '#F8FAFC',
  textSecondary:  'rgba(255,255,255,0.65)',
  textMuted:      'rgba(255,255,255,0.38)',
  textDisabled:   'rgba(255,255,255,0.25)',

  // Overlay & separator
  separator:      'rgba(255,255,255,0.08)',
  overlay:        'rgba(0,0,0,0.7)',

  // Statuts
  success:        '#22C55E',
  warning:        '#F59E0B',
  error:          '#EF4444',
  info:           '#3B82F6',
};

// ── Glassmorphism light (fond clair, verre teinté) ───────────────────────────
export const glassLight = {
  card:           'rgba(255,255,255,0.65)',
  cardStrong:     'rgba(255,255,255,0.80)',
  cardBorder:     'rgba(100,130,200,0.18)',
  cardBorderSoft: 'rgba(100,130,200,0.10)',

  input:          'rgba(255,255,255,0.70)',
  inputBorder:    'rgba(100,130,200,0.25)',

  tabBar:         'rgba(248,250,252,0.80)',
  tabBorder:      'rgba(100,130,200,0.15)',

  blobBlue:       '#3B82F6',
  blobGreen:      '#22C55E',

  textPrimary:    '#0F172A',
  textSecondary:  '#475569',
  textMuted:      '#94A3B8',
  textDisabled:   '#CBD5E1',

  separator:      'rgba(100,130,200,0.12)',
  overlay:        'rgba(0,0,0,0.4)',

  success:        '#16A34A',
  warning:        '#D97706',
  error:          '#DC2626',
  info:           '#2563EB',
};

// Fonds principaux (derrière les blobs)
export const darkBg  = '#0a0f1e';
export const lightBg = '#EFF4FF';

export const dark = {
  bg:          '#0a0f1e',
  bgSecondary: '#0d1525',
  card:        glass.card,
  cardBorder:  glass.cardBorder,
  input:       glass.input,
  inputBorder: glass.inputBorder,
  textPrimary:   glass.textPrimary,
  textSecondary: glass.textSecondary,
  textMuted:     glass.textMuted,
  textDisabled:  glass.textDisabled,
  separator:   glass.separator,
  tabBar:      glass.tabBar,
  tabBorder:   glass.tabBorder,
  overlay:     glass.overlay,
  success:     glass.success,
  warning:     glass.warning,
  error:       glass.error,
  info:        glass.info,
  // Glass extras
  cardStrong:     glass.cardStrong,
  cardBorderSoft: glass.cardBorderSoft,
  blobBlue:       glass.blobBlue,
  blobGreen:      glass.blobGreen,
  isGlass:        true as const,
};

export const light = {
  bg:          '#EFF4FF',
  bgSecondary: '#E8EFFE',
  card:        glassLight.card,
  cardBorder:  glassLight.cardBorder,
  input:       glassLight.input,
  inputBorder: glassLight.inputBorder,
  textPrimary:   glassLight.textPrimary,
  textSecondary: glassLight.textSecondary,
  textMuted:     glassLight.textMuted,
  textDisabled:  glassLight.textDisabled,
  separator:   glassLight.separator,
  tabBar:      glassLight.tabBar,
  tabBorder:   glassLight.tabBorder,
  overlay:     glassLight.overlay,
  success:     glassLight.success,
  warning:     glassLight.warning,
  error:       glassLight.error,
  info:        glassLight.info,
  // Glass extras
  cardStrong:     glassLight.cardStrong,
  cardBorderSoft: glassLight.cardBorderSoft,
  blobBlue:       glassLight.blobBlue,
  blobGreen:      glassLight.blobGreen,
  isGlass:        false as const,
};

export type ColorScheme = typeof dark;

export function useColors(): ColorScheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}
