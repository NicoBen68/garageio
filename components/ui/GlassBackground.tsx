import { View, StyleSheet, useColorScheme } from 'react-native';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  style?: any;
}

export default function GlassBackground({ children, style }: Props) {
  const scheme = useColorScheme();
  const isDark  = scheme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#080d1a' : '#EEF3FF' }, style]}>
      <View style={[styles.blob, styles.blobTopLeft, {
        backgroundColor: '#3B82F6',
        opacity: isDark ? 0.18 : 0.12,
      }]} />
      <View style={[styles.blob, styles.blobBottomRight, {
        backgroundColor: '#22C55E',
        opacity: isDark ? 0.14 : 0.10,
      }]} />
      <View style={[styles.blob, styles.blobMid, {
        backgroundColor: '#3B82F6',
        opacity: isDark ? 0.08 : 0.06,
      }]} />
      {children}
    </View>
  );
}

export function GlassCard({ children, style }: Props) {
  const scheme = useColorScheme();
  const isDark  = scheme === 'dark';
  return (
    <View style={[
      styles.card,
      {
        backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.60)',
        borderColor:      isDark ? 'rgba(255,255,255,0.12)' : 'rgba(100,130,200,0.18)',
      },
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 999 },
  blobTopLeft:     { width: 320, height: 320, top: -120, left: -100 },
  blobBottomRight: { width: 280, height: 280, bottom: -60, right: -80 },
  blobMid:         { width: 200, height: 200, top: '30%', right: -60 },
  card:            { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
});
