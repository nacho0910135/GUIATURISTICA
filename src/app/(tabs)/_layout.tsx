import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { Tabs, useRouter } from 'expo-router';
import { Platform, Text, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlobalHeader } from '@/components/global-header';
import { useApp } from '@/providers/app-provider';
import { useAppTheme } from '@/theme/theme-provider';

const icon = (name: keyof typeof MaterialCommunityIcons.glyphMap) =>
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return (
      <MaterialCommunityIcons name={name} color={color} size={24} />
    );
  };

const friendsIcon = ({ color, focused }: { color: ColorValue; focused: boolean }) => (
  <MaterialCommunityIcons
    name="account-group"
    color={focused ? 'white' : color}
    size={25}
    style={{
      backgroundColor: focused ? '#0077A8' : 'transparent',
      borderColor: focused ? '#ffffff' : 'transparent',
      borderRadius: 30,
      borderWidth: 4,
      padding: focused ? 10 : 0,
      transform: [{ translateY: focused ? -7 : 0 }],
      ...Platform.select({
        web: { boxShadow: '0 3px 10px rgba(6, 47, 35, 0.24)' },
        default: { elevation: 6, shadowColor: '#062f23', shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.24, shadowRadius: 5 },
      }),
    }}
  />
);

export default function TabsLayout() {
  const { avatarUrl, t } = useApp();
  const { colors } = useAppTheme();
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();

  return (
    <Tabs
      initialRouteName="explore"
      screenOptions={{
        header: () => <GlobalHeader />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 3 },
        tabBarStyle: { alignSelf: 'center', backgroundColor: colors.surface, borderTopColor: colors.border, height: 72 + bottom, maxWidth: 1120, paddingBottom: 8 + bottom, paddingTop: 6, width: '100%' },
      }}
    >
      <Tabs.Screen
        listeners={{ tabPress: (event) => { event.preventDefault(); router.replace({ pathname: '/(tabs)/explore', params: { reset: String(Date.now()) } }); } }}
        name="explore"
        options={{ title: t('explore'), tabBarIcon: icon('compass') }}
      />
      <Tabs.Screen name="fauna" options={{ title: t('fauna'), tabBarIcon: icon('paw-outline') }} />
      <Tabs.Screen name="friends" options={{ title: 'Comunidad', tabBarIcon: friendsIcon, tabBarActiveTintColor: colors.secondary, tabBarLabelStyle: { fontSize: 11, fontWeight: '800' } }} />
      <Tabs.Screen name="commerce" options={{ title: t('commerce'), tabBarIcon: icon('hospital-box-outline'), tabBarLabel: ({ color }) => <Text style={{ color, fontSize: 8, fontWeight: '800', lineHeight: 9, textAlign: 'center' }}>{t('commerce').replace(' y ', ' y\n').replace(' & ', ' &\n')}</Text> }} />
      <Tabs.Screen name="logistics" options={{ title: t('logistics'), tabBarIcon: icon('truck-outline') }} />
      <Tabs.Screen name="profile" options={{ title: t('profile'), tabBarIcon: ({ color }) => avatarUrl ? <Image source={{ uri: avatarUrl }} style={{ borderColor: color as string, borderRadius: 15, borderWidth: 2, height: 30, width: 30 }} /> : <MaterialCommunityIcons name="account-circle-outline" color={color} size={24} /> }} />
    </Tabs>
  );
}
