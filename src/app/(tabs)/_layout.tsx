import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
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

const exploreIcon = ({ color, focused }: { color: ColorValue; focused: boolean }) => (
  <MaterialCommunityIcons
    name="compass"
    color={focused ? 'white' : color}
    size={24}
    style={{
      backgroundColor: focused ? '#087443' : '#E7F5ED',
      borderRadius: 18,
      padding: 7,
      transform: [{ translateY: focused ? -4 : 0 }],
    }}
  />
);

export default function TabsLayout() {
  const { t } = useApp();
  const { colors } = useAppTheme();
  const { bottom } = useSafeAreaInsets();
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
      <Tabs.Screen name="catalog" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="fauna" options={{ href: null }} />
      <Tabs.Screen name="friends" options={{ title: t('communityTitle').split(' Descubriendo')[0], tabBarIcon: icon('account-group') }} />
      <Tabs.Screen name="my-trip" options={{ title: 'Mi viaje', tabBarIcon: icon('map-marker-path') }} />
      <Tabs.Screen name="explore" options={{ title: t('explore'), tabBarIcon: exploreIcon }} />
      <Tabs.Screen name="commerce" options={{ title: t('commerce'), tabBarIcon: icon('storefront-outline'), tabBarLabel: ({ color }) => <Text style={{ color, fontSize: 8, fontWeight: '800', lineHeight: 9, textAlign: 'center' }}>{t('commerce').replace(' y ', ' y\n').replace(' & ', ' &\n')}</Text> }} />
      <Tabs.Screen name="logistics" options={{ title: 'Buses', tabBarIcon: icon('bus') }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
