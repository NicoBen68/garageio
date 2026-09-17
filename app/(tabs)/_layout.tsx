import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme, StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { GlassView, GlassContainer, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';

const TABS = [
  { name: 'index',       title: 'Véhicules', icon: 'car-outline'           },
  { name: 'maintenance', title: 'Entretien', icon: 'construct-outline'      },
  { name: 'reminders',   title: 'Rappels',   icon: 'notifications-outline'  },
  { name: 'settings',    title: 'Profil',    icon: 'person-outline'         },
] as const;

const PILL_H  = 60;
const BUBBLE  = 44;
const canUseGlass = Platform.OS === 'ios' && isGlassEffectAPIAvailable();

function LiquidGlassTabBar({ state, navigation }: any) {
  const isDark = useColorScheme() === 'dark';

  const tabsContent = (
    <View style={styles.tabsRow}>
      {state.routes.map((route: any, index: number) => {
        const tab = TABS.find(t => t.name === route.name);
        if (!tab) return null;
        const isFocused = state.index === index;

        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={styles.tabItem}
            accessibilityRole="button"
            accessibilityLabel={tab.title}
            accessibilityState={{ selected: isFocused }}
          >
            {isFocused ? (
              canUseGlass ? (
                // Vrai GlassView natif iOS 26 pour la bulle active
                <GlassView
                  style={styles.bubble}
                  glassEffectStyle="regular"
                  colorScheme={isDark ? 'dark' : 'light'}
                  isInteractive
                >
                  <Ionicons name={tab.icon as any} size={22} color="#3B82F6" />
                </GlassView>
              ) : (
                // Fallback BlurView
                <View style={styles.bubbleWrap}>
                  <BlurView
                    intensity={isDark ? 70 : 60}
                    tint={isDark ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterial'}
                    style={styles.bubble}
                  >
                    <View style={[styles.bubbleBorder, { borderColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.90)' }]} />
                    <Ionicons name={tab.icon as any} size={22} color="#3B82F6" />
                  </BlurView>
                </View>
              )
            ) : (
              <Ionicons
                name={tab.icon as any}
                size={22}
                color={isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.35)'}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.pillShadow}>
        {canUseGlass ? (
          // Vrai Liquid Glass natif iOS 26 pour la pill
          <GlassContainer spacing={8} style={styles.pill}>
            <GlassView
              style={StyleSheet.absoluteFill}
              glassEffectStyle="regular"
              colorScheme={isDark ? 'dark' : 'light'}
            />
            {tabsContent}
          </GlassContainer>
        ) : (
          // Fallback BlurView
          <BlurView
            intensity={isDark ? 55 : 45}
            tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterial'}
            style={styles.pill}
          >
            <View style={[styles.topShine, { backgroundColor: isDark ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.85)' }]} />
            <View style={[styles.pillBorder, { borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.80)' }]} />
            {tabsContent}
          </BlurView>
        )}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <LiquidGlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"       options={{ title: 'Véhicules' }} />
      <Tabs.Screen name="maintenance" options={{ title: 'Entretien' }} />
      <Tabs.Screen name="reminders"   options={{ title: 'Rappels'   }} />
      <Tabs.Screen name="settings"    options={{ title: 'Profil'    }} />
      <Tabs.Screen name="add-vehicle"                  options={{ href: null }} />
      <Tabs.Screen name="vehicle/[id]"                 options={{ href: null }} />
      <Tabs.Screen name="vehicle/[id]/maintenance"     options={{ href: null }} />
      <Tabs.Screen name="vehicle/[id]/add-maintenance" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 28,
    left: 24,
    right: 24,
  },
  pillShadow: {
    borderRadius: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 16,
  },
  pill: {
    borderRadius: 40,
    overflow: 'hidden',
    height: PILL_H,
    justifyContent: 'center',
  },
  topShine: {
    position: 'absolute',
    top: 0, left: 16, right: 16,
    height: 1, borderRadius: 1, zIndex: 10,
  },
  pillBorder: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 40, borderWidth: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    zIndex: 5,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: PILL_H,
  },
  bubbleWrap: {
    borderRadius: BUBBLE / 2,
    overflow: 'hidden',
  },
  bubble: {
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleBorder: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: BUBBLE / 2, borderWidth: 1,
  },
});
