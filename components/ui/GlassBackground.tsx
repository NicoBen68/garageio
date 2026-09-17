import { View, StyleSheet, useColorScheme, Platform } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  style?: any;
}

const canUseGlass = Platform.OS === 'ios' && isGlassEffectAPIAvailable();

/**
 * GlassCard — utilise le vrai GlassView natif iOS 26
 * Fallback BlurView sur iOS < 26 et Android
 */
export function GlassCard({ children, style }: Props) {
  const isDark = useColorScheme() === 'dark';

  if (canUseGlass) {
    return (
      <GlassView
        style={[styles.card, style]}
        glassEffectStyle="regular"
        colorScheme={isDark ? 'dark' : 'light'}
      >
        {children}
      </GlassView>
    );
  }

  // Fallback BlurView
  return (
    <View style={[styles.cardFallbackWrap, style]}>
      <BlurView
        intensity={isDark ? 35 : 28}
        tint={isDark ? 'dark' : 'extraLight'}
        style={styles.cardFallbackBlur}
      >
        <View style={[styles.cardFallbackInner, {
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.60)',
        }]}>
          {children}
        </View>
      </BlurView>
    </View>
  );
}

/**
 * GlassBackground — fond avec blobs lumineux
 */
export default function GlassBackground({ children, style }: Props) {
  const isDark = useColorScheme() === 'dark';

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

const styles = StyleSheet.create({
  container:           { flex: 1, overflow: 'hidden' },
  blob:                { position: 'absolute', borderRadius: 999 },
  blobTopLeft:         { width: 320, height: 320, top: -120, left: -100 },
  blobBottomRight:     { width: 280, height: 280, bottom: -60, right: -80 },
  blobMid:             { width: 200, height: 200, top: '30%', right: -60 },
  card:                { borderRadius: 20, overflow: 'hidden', padding: 14 },
  cardFallbackWrap:    { borderRadius: 20, overflow: 'hidden' },
  cardFallbackBlur:    { borderRadius: 20, overflow: 'hidden' },
  cardFallbackInner:   { borderWidth: 1, borderRadius: 20, padding: 14 },
});
