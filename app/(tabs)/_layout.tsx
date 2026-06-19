import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../lib/colors';

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: c.tabBar, borderTopColor: c.tabBorder },
        tabBarActiveTintColor:   '#3B82F6',
        tabBarInactiveTintColor: c.textMuted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Véhicules', tabBarIcon: ({ color, size }) => <Ionicons name="car-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="maintenance" options={{ title: 'Entretien', tabBarIcon: ({ color, size }) => <Ionicons name="construct-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="reminders" options={{ title: 'Rappels', tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Profil', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="add-vehicle" options={{ href: null }} />
      <Tabs.Screen name="vehicle/[id]" options={{ href: null }} />
      <Tabs.Screen name="vehicle/[id]/maintenance" options={{ href: null }} />
      <Tabs.Screen name="vehicle/[id]/add-maintenance" options={{ href: null }} />
    </Tabs>
  );
}
