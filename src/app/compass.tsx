import { useRouter } from 'expo-router';
import { ArrowLeft, LocateFixed } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';

import { MapCanvas, type MapCoordinate } from '@/components/explore/map-canvas';
import { Button, IconButton } from '@/components/ui/button';
import { useCompass } from '@/hooks/use-compass';
import { normalizeHeading } from '@/lib/compass';
import { useApp } from '@/providers/app-provider';
import { useAppTheme } from '@/theme/theme-provider';

const COSTA_RICA = { latitude: 9.7489, longitude: -83.7534 };

export default function CompassScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [panelHeight, setPanelHeight] = useState(230);
  const { language } = useApp();
  const { colors } = useAppTheme();
  const es = language === 'es';
  const [retry, setRetry] = useState(0);
  const { degrees, rotation, position, locationStatus, sensorStatus } = useCompass(retry);
  const [center, setCenter] = useState<MapCoordinate>(COSTA_RICA);
  const [centered, setCentered] = useState(false);
  const retrySensors = () => setRetry((value) => value + 1);
  const openSettings = () => { void Linking.openSettings().catch(retrySensors); };
  const recenter = () => { if (position) setCenter({ ...position.coords }); };
  useEffect(() => {
    if (position && !centered) { setCenter(position.coords); setCentered(true); }
  }, [centered, position]);
  const needleStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const sensorCopy = sensorStatus === 'ready'
    ? (es ? 'Rumbo geográfico del teléfono' : 'Phone true heading')
    : sensorStatus === 'waiting' ? (es ? 'Buscando orientación…' : 'Finding heading…')
      : sensorStatus === 'calibrate' ? (es ? 'Mové el teléfono en forma de 8 y alejalo de imanes. Esperando norte geográfico fiable.' : 'Move your phone in a figure eight, away from magnets. Waiting for reliable true north.')
        : (es ? 'Brújula no disponible. El mapa mantiene el norte arriba.' : 'Compass unavailable. The map remains north-up.');
  const locationCopy = position
    ? (es ? `Ubicación actual · precisión ±${Math.round(position.coords.accuracy!)} m` : `Current location · accuracy ±${Math.round(position.coords.accuracy!)} m`)
    : locationStatus === 'waiting' ? (es ? 'Buscando tu ubicación…' : 'Finding your location…')
      : (es ? 'Sin ubicación precisa. El mapa no indica tu posición.' : 'No precise location. The map does not show your position.');

  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <MapCanvas expanded focusLocation={center} selectedLocation={position?.coords} />
    <View style={{ position: 'absolute', top: insets.top + 12, left: 16 }}>
      <IconButton accessibilityLabel={es ? 'Atrás' : 'Back'} icon={<ArrowLeft color={colors.text} />} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/explore')} />
    </View>
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: insets.top + 68, bottom: panelHeight + insets.bottom + 52, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ transform: [{ scale: Math.max(0.4, Math.min(1, (width - 48) / 248, (height - panelHeight - insets.top - insets.bottom - 120) / 248)) }] }}>
      <Pressable accessibilityRole="button" accessibilityLabel={es ? 'Rosa de los vientos. Centrar en mi ubicación' : 'Compass rose. Center on my location'} accessibilityState={{ disabled: !position }} disabled={!position} onPress={() => { if (position) setCenter({ ...position.coords }); }} className="focus-visible:ring-2 focus-visible:ring-ui-focus" style={{ width: 248, height: 248, borderRadius: 124, backgroundColor: `${colors.surface}99`, borderColor: colors.surface, borderWidth: 2, shadowColor: colors.text, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 }}>
        <Svg width="244" height="244" viewBox="0 0 244 244">
          <Circle cx="122" cy="122" r="114" fill="none" stroke={colors.border} strokeWidth="5" />
          <Circle cx="122" cy="122" r="87" fill="none" stroke={colors.secondary} strokeOpacity={0.4} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => <G key={angle} transform={`rotate(${angle} 122 122)`}>
            <Path d="M122 49 L134 122 L122 112 Z" fill={colors.primary} opacity={0.65} />
            <Path d="M122 49 L110 122 L122 112 Z" fill={colors.surface} opacity={0.9} />
          </G>)}
          {['N', 'NE', 'E', 'SE', 'S', es ? 'SO' : 'SW', es ? 'O' : 'W', es ? 'NO' : 'NW'].map((label, i) => <SvgText key={label} x={122 + 100 * Math.sin(i * Math.PI / 4)} y={128 - 100 * Math.cos(i * Math.PI / 4)} textAnchor="middle" fontWeight="bold" fontSize={i % 2 ? 11 : 20} fill={i === 0 ? colors.primary : colors.text}>{label}</SvgText>)}
        </Svg>
        {degrees !== null ? <Animated.View style={[StyleSheet.absoluteFill, needleStyle]}>
          <Svg width="244" height="244" viewBox="0 0 244 244"><Path d="M122 65 L135 131 L122 124 L109 131 Z" fill={colors.secondary} stroke={colors.surface} strokeWidth="2" /><Circle cx="122" cy="122" r="6" fill={colors.secondary} stroke={colors.surface} strokeWidth="2" /></Svg>
        </Animated.View> : null}
      </Pressable>
      </View>
    </View>
    <ScrollView onLayout={(event) => setPanelHeight(event.nativeEvent.layout.height)} style={{ position: 'absolute', left: Math.max(16, (width - 520) / 2), right: Math.max(16, (width - 520) / 2), bottom: insets.bottom + 36, maxHeight: '38%', backgroundColor: colors.surface, borderRadius: 20 }} contentContainerStyle={{ padding: 16, gap: 8 }}>
      <Text className="font-display text-xl" style={{ color: colors.text }}>{es ? 'Brújula' : 'Compass'} · {degrees === null ? '—' : `${Math.round(normalizeHeading(degrees)) % 360}°`}</Text>
      <Text style={{ color: colors.text }}>{sensorCopy}</Text>
      <Text style={{ color: colors.textMuted }}>{locationCopy}</Text>
      <Button onPress={recenter} emphasis="outline" label={es ? 'Centrar en mi ubicación' : 'Center on my location'} icon={<LocateFixed color={colors.primary} size={18} />} disabled={!position} />
      {['unavailable', 'denied'].includes(sensorStatus) || ['error', 'denied', 'imprecise'].includes(locationStatus) ? <Button onPress={retrySensors} emphasis="ghost" label={es ? 'Reintentar' : 'Retry'} /> : null}
      {locationStatus === 'denied' || sensorStatus === 'denied' ? <Button onPress={openSettings} emphasis="ghost" label={es ? 'Abrir ajustes' : 'Open settings'} /> : null}
    </ScrollView>
  </View>;
}
