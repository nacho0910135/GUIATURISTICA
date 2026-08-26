import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';

import { GlobalHeader } from '@/components/global-header';
import { useApp } from '@/providers/app-provider';

export default function TabsLayout() {
  const { t } = useApp();
  return (
    <Tabs
      initialRouteName="explore"
      screenOptions={{
        header: () => <GlobalHeader />,
        tabBarActiveTintColor: '#087443',
        tabBarInactiveTintColor: '#6d8079',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarStyle: { borderTopColor: '#dceee5', height: 68, paddingBottom: 8, paddingTop: 7 },
      }}
    >
      <Tabs.Screen name="explore" options={{ title: t('explore'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="compass" color={color} size={size} /> }} />
      <Tabs.Screen name="fauna" options={{ title: t('fauna'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="paw" color={color} size={size} /> }} />
      <Tabs.Screen name="commerce" options={{ title: t('commerce'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="storefront-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="logistics" options={{ title: t('logistics'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="ferry" color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: t('profile'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-circle-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
