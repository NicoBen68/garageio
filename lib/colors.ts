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

export const dark = {
  // Fonds
  bg:          '#0F172A',
  bgSecondary: '#162032',
  card:        '#1E293B',
  cardBorder:  '#334155',
  input:       '#1E293B',
  inputBorder: '#334155',

  // Textes
  textPrimary:   '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted:     '#64748B',
  textDisabled:  '#475569',

  // Éléments UI
  separator:   '#334155',
  tabBar:      '#1E293B',
  tabBorder:   '#334155',
  overlay:     'rgba(0,0,0,0.7)',

  // Statuts
  success:     '#22C55E',
  warning:     '#F59E0B',
  error:       '#EF4444',
  info:        '#3B82F6',
};

export const light = {
  // Fonds
  bg:          '#F8FAFC',
  bgSecondary: '#F1F5F9',
  card:        '#FFFFFF',
  cardBorder:  '#E2E8F0',
  input:       '#FFFFFF',
  inputBorder: '#CBD5E1',

  // Textes
  textPrimary:   '#0F172A',
  textSecondary: '#475569',
  textMuted:     '#94A3B8',
  textDisabled:  '#CBD5E1',

  // Éléments UI
  separator:   '#E2E8F0',
  tabBar:      '#FFFFFF',
  tabBorder:   '#E2E8F0',
  overlay:     'rgba(0,0,0,0.5)',

  // Statuts
  success:     '#16A34A',
  warning:     '#D97706',
  error:       '#DC2626',
  info:        '#2563EB',
};

export type ColorScheme = typeof dark;

export function useColors(): ColorScheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}
