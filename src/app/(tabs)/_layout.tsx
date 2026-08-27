import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import { Platform, type ColorValue } from 'react-native';

import { GlobalHeader } from '@/components/global-header';
import { useApp } from '@/providers/app-provider';

const icon = (name: keyof typeof MaterialCommunityIcons.glyphMap) =>
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return (
      <MaterialCommunityIcons name={name} color={focused ? '#ffffff' : color} size={23} style={focused ? { backgroundColor: '#087443', borderRadius: 22, padding: 8 } : undefined} />
    );
  };

const friendsIcon = ({ focused }: { color: ColorValue; focused: boolean }) => (
  <MaterialCommunityIcons
    name="account-group"
    color="white"
    size={29}
    style={{
      backgroundColor: focused ? '#087443' : '#13a95b',
      borderColor: '#ffffff',
      borderRadius: 30,
      borderWidth: 4,
      padding: 11,
      transform: [{ translateY: -9 }],
      ...Platform.select({
        web: { boxShadow: '0 3px 10px rgba(6, 47, 35, 0.24)' },
        default: { elevation: 6, shadowColor: '#062f23', shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.24, shadowRadius: 5 },
      }),
    }}
  />
);

export default function TabsLayout() {
  const { t } = useApp();

  return (
    <Tabs
      initialRouteName="explore"
      screenOptions={{
        header: () => <GlobalHeader />,
        tabBarActiveTintColor: '#087443',
        tabBarInactiveTintColor: '#65736d',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 3 },
        tabBarStyle: { alignSelf: 'center', backgroundColor: '#ffffff', borderTopColor: '#e4eee8', height: 78, maxWidth: 1180, paddingBottom: 9, paddingTop: 7, width: '100%' },
      }}
    >
      <Tabs.Screen name="explore" options={{ title: t('explore'), tabBarIcon: icon('compass') }} />
      <Tabs.Screen name="fauna" options={{ title: t('fauna'), tabBarIcon: icon('paw-outline') }} />
      <Tabs.Screen name="friends" options={{ title: 'Amigos', tabBarIcon: friendsIcon, tabBarLabelStyle: { color: '#087443', fontSize: 11, fontWeight: '900' } }} />
      <Tabs.Screen name="commerce" options={{ title: t('commerce'), tabBarIcon: icon('storefront-outline') }} />
      <Tabs.Screen name="logistics" options={{ title: t('logistics'), tabBarIcon: icon('truck-outline') }} />
      <Tabs.Screen name="profile" options={{ title: t('profile'), tabBarIcon: icon('account-circle-outline') }} />
    </Tabs>
  );
}
