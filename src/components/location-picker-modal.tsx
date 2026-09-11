import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MapCanvas, type MapCoordinate } from '@/components/explore/map-canvas';
import { FrogLoader } from '@/components/frog-loader';
import { useBackToExplore } from '@/hooks/use-back-to-explore';
import { reverseLocationName, searchLocations, type LocationSearchResult } from '@/lib/location-search';

const COSTA_RICA_CENTER = { latitude: 9.7489, longitude: -83.7534 };

export function LocationPickerModal({
  initialLocation,
  language,
  onClose,
  onConfirm,
  open,
  title,
}: {
  initialLocation?: MapCoordinate;
  language: 'es' | 'en';
  onClose: () => void;
  onConfirm: (location: MapCoordinate, label?: string) => void;
  open: boolean;
  title?: string;
}) {
  const backToExplore = useBackToExplore();
  const centerRef = useRef<MapCoordinate>(initialLocation ?? COSTA_RICA_CENTER);
  const [focusLocation, setFocusLocation] = useState<MapCoordinate | undefined>(initialLocation);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [chosenLabel, setChosenLabel] = useState<string>();

  useEffect(() => {
    if (!open) return;
    centerRef.current = initialLocation ?? COSTA_RICA_CENTER;
    setFocusLocation(initialLocation);
    setQuery('');
    setResults([]);
    setChosenLabel(undefined);
    setSearchError(false);
  }, [initialLocation, open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) { setResults([]); setSearching(false); setSearchError(false); return; }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      setSearchError(false);
      void searchLocations(trimmed, language, controller.signal)
        .then(setResults)
        .catch((error) => { if ((error as Error).name !== 'AbortError') setSearchError(true); })
        .finally(() => { if (!controller.signal.aborted) setSearching(false); });
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [language, query]);

  const chooseResult = (result: LocationSearchResult) => {
    if (!result.coordinate) return;
    centerRef.current = result.coordinate;
    setFocusLocation({ ...result.coordinate });
    setChosenLabel([result.name, result.address].filter(Boolean).join(', '));
    setQuery(result.name);
    setResults([]);
    Keyboard.dismiss();
  };

  const confirm = async () => {
    const coordinate = centerRef.current;
    const label = chosenLabel ?? await reverseLocationName(coordinate, language).catch(() => undefined);
    onConfirm(coordinate, label);
    onClose();
  };

  return (
    <Modal animationType="slide" navigationBarTranslucent onRequestClose={() => { onClose(); backToExplore(); }} statusBarTranslucent visible={open}>
      <SafeAreaView className="flex-1 bg-ui-background dark:bg-ui-dark-background" edges={['top', 'bottom']}>
        <View className="z-20 flex-row items-center gap-3 border-b border-ui-border bg-ui-surface px-4 py-3 dark:border-ui-dark-border dark:bg-ui-dark-surface">
          <Pressable accessibilityLabel={language === 'es' ? 'Volver' : 'Back'} accessibilityRole="button" className="h-12 w-12 items-center justify-center rounded-full bg-ui-muted dark:bg-ui-dark-muted" onPress={onClose}>
            <MaterialCommunityIcons name="arrow-left" size={25} color="#17211C" />
          </Pressable>
          <View className="min-h-12 flex-1 flex-row items-center rounded-control border border-ui-border bg-ui-muted px-3 dark:border-ui-dark-border dark:bg-ui-dark-muted">
            <MaterialCommunityIcons name="magnify" size={22} color="#68737A" />
            <TextInput accessibilityLabel={language === 'es' ? 'Buscar un lugar' : 'Search for a place'} autoCorrect={false} className="ml-2 flex-1 py-3 text-ui-text dark:text-ui-dark-text" onChangeText={setQuery} placeholder={language === 'es' ? 'Buscá un lugar o dirección' : 'Search a place or address'} placeholderTextColor="#68737A" returnKeyType="search" value={query} />
            {searching ? <FrogLoader color="#0B6B4F" size="small" /> : query ? <Pressable accessibilityLabel={language === 'es' ? 'Limpiar búsqueda' : 'Clear search'} accessibilityRole="button" className="h-11 w-11 items-center justify-center" onPress={() => { setQuery(''); setResults([]); }}><MaterialCommunityIcons name="close-circle" size={21} color="#68737A" /></Pressable> : null}
          </View>
        </View>
        {results.length || searchError ? (
          <View className="absolute left-4 right-4 z-30 rounded-card border border-ui-border bg-ui-surface shadow-lg dark:border-ui-dark-border dark:bg-ui-dark-surface" style={{ top: Platform.OS === 'web' ? 78 : 112 }}>
            {searchError ? <Text accessibilityRole="alert" className="p-4 text-sm font-bold text-ui-danger dark:text-ui-dark-danger">{language === 'es' ? 'No pudimos buscar lugares. Revisá tu conexión e intentá de nuevo.' : 'We could not search places. Check your connection and try again.'}</Text> : <ScrollView keyboardShouldPersistTaps="handled">{results.map((result) => <Pressable accessibilityRole="button" className="min-h-14 flex-row items-center border-b border-ui-border px-4 py-3 dark:border-ui-dark-border" key={result.id} onPress={() => chooseResult(result)}><MaterialCommunityIcons name="map-marker-outline" size={23} color="#0B6B4F" /><View className="ml-3 flex-1"><Text className="font-black text-ui-text dark:text-ui-dark-text">{result.name}</Text><Text className="mt-0.5 text-xs text-ui-text-muted dark:text-ui-dark-text-muted" numberOfLines={2}>{result.address}</Text></View></Pressable>)}</ScrollView>}
          </View>
        ) : null}
        <View className="flex-1">
          <MapCanvas expanded focusLocation={focusLocation} onLocationPick={(coordinate) => { centerRef.current = coordinate; setFocusLocation({ ...coordinate }); setChosenLabel(undefined); }} onViewportChange={(coordinate) => { centerRef.current = coordinate; setChosenLabel(undefined); }} />
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <View className="mb-8 h-12 w-12 items-center justify-center rounded-full bg-ui-primary shadow-lg dark:bg-ui-dark-primary"><MaterialCommunityIcons name="map-marker" size={30} color="white" /></View>
          </View>
        </View>
        <View className="border-t border-ui-border bg-ui-surface px-5 pb-3 pt-4 dark:border-ui-dark-border dark:bg-ui-dark-surface">
          <Text className="text-center text-xl font-black text-ui-text dark:text-ui-dark-text">{title ?? (language === 'es' ? 'Fijá la ubicación' : 'Set the location')}</Text>
          <Text className="mt-1 text-center text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Mové el mapa hasta dejar el pin sobre el lugar exacto.' : 'Move the map until the pin is over the exact place.'}</Text>
          <Pressable accessibilityRole="button" className="mt-4 min-h-14 items-center justify-center rounded-control bg-ui-primary px-5 dark:bg-ui-dark-primary" onPress={() => void confirm()}><Text className="text-base font-black text-white">{language === 'es' ? 'Confirmar ubicación' : 'Confirm location'}</Text></Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
