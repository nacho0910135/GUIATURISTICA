import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import {
  ASSISTANCE_CATEGORIES,
  type AssistanceCategoryId,
  type AssistanceService,
  type Coordinates,
  getAssistanceDirectory,
} from '@/lib/commerce';
import { openNavigation } from '@/lib/logistics';
import { useApp } from '@/providers/app-provider';

function ServiceCard({ service }: { service: AssistanceService }) {
  const { language } = useApp();
  return (
    <View className="mb-4 rounded-card border border-ui-border bg-ui-surface p-5 dark:border-ui-dark-border dark:bg-ui-dark-surface">
      <View className="flex-row items-start">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-ui-primary-soft dark:bg-ui-dark-primary-soft">
          <MaterialCommunityIcons name="map-marker-radius" size={25} color="#087443" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{service.title}</Text>
          <Text className="mt-1 font-bold text-ui-primary dark:text-ui-dark-primary">{service.distance_km.toFixed(1)} km</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">{service.business_verified_at && service.business_verification_evidence_url ? <Text className="rounded-full bg-ui-primary px-2 py-1 text-[10px] font-black text-white">{language === 'es' ? 'NEGOCIO VERIFICADO' : 'VERIFIED BUSINESS'}</Text> : <Text className="rounded-full bg-ui-muted px-2 py-1 text-[10px] font-black text-ui-text-muted dark:bg-white/10 dark:text-ui-dark-text-muted">{language === 'es' ? 'INFORMACIÓN COMERCIAL' : 'COMMERCIAL INFORMATION'}</Text>}{service.business_updated_at ? <Text className="rounded-full bg-ui-secondary px-2 py-1 text-[10px] font-black text-white">{language === 'es' ? 'INFORMACIÓN ACTUALIZADA POR EL NEGOCIO' : 'UPDATED BY THE BUSINESS'}</Text> : null}</View>
          {service.business_verified_at ? <Text className="mt-1 text-[10px] font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Última verificación' : 'Last verified'}: {new Date(service.business_verified_at).toLocaleDateString(language === 'es' ? 'es-CR' : 'en-US')}</Text> : null}
        </View>
      </View>
      {service.description ? <Text className="mt-3 leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{service.description}</Text> : null}
      <View className="mt-4 flex-row gap-3">
        {service.phone ? (
          <Pressable accessibilityRole="button" className="flex-1 flex-row items-center justify-center rounded-2xl bg-ui-secondary py-3.5 dark:bg-ui-dark-secondary" onPress={() => void Linking.openURL(`tel:${service.phone!.replace(/[^+\d]/g, '')}`)}>
            <MaterialCommunityIcons name="phone" size={20} color="white" />
            <Text className="ml-2 font-black text-white">{language === 'es' ? 'Llamar' : 'Call'}</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" className="flex-1 flex-row items-center justify-center rounded-2xl bg-ui-primary py-3.5 dark:bg-ui-dark-primary" onPress={() => void openNavigation(service.latitude, service.longitude)}>
          <MaterialCommunityIcons name="navigation-variant" size={20} color="white" />
          <Text className="ml-2 font-black text-white">{language === 'es' ? 'Cómo llegar' : 'Directions'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function CommerceScreen() {
  const { language } = useApp();
  const [category, setCategory] = useState<AssistanceCategoryId>('hospitals');
  const [coordinates, setCoordinates] = useState<Coordinates>();
  const [locationError, setLocationError] = useState('');
  const [locating, setLocating] = useState(true);

  const locate = useCallback(async () => {
    setLocating(true);
    setLocationError('');
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('permission');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoordinates(position.coords);
    } catch (reason) {
      setLocationError(reason instanceof Error && reason.message === 'permission'
        ? (language === 'es' ? 'Necesitamos tu ubicación para ordenar la asistencia más cercana.' : 'Location is required to sort the nearest assistance.')
        : (language === 'es' ? 'No pudimos obtener tu ubicación. Intentá nuevamente.' : 'We could not get your location. Please try again.'));
    } finally {
      setLocating(false);
    }
  }, [language]);

  useEffect(() => { void locate(); }, [locate]);

  const directory = useQuery({
    queryKey: ['assistance-directory', category, coordinates?.latitude, coordinates?.longitude],
    queryFn: () => getAssistanceDirectory(category, coordinates!),
    enabled: Boolean(coordinates),
    staleTime: 10 * 60 * 1000,
  });
  const selectedCategory = ASSISTANCE_CATEGORIES.find((item) => item.id === category)!;

  const header = (
    <View>
      <View className="px-5 pb-5 pt-7">
        <Text className="text-3xl font-extrabold tracking-tight text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Asistencia y Emergencias' : 'Assistance & Emergencies'}</Text>
        <Text className="mt-2 text-base leading-6 text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Servicios esenciales ordenados desde tu ubicación actual.' : 'Essential services sorted from your current location.'}</Text>
        <Text className="mt-2 text-xs font-semibold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? '© OpenStreetMap contributors · ODbL' : '© OpenStreetMap contributors · ODbL'}</Text>
      </View>
      <View className="flex-row flex-wrap px-3 pb-4">
        {ASSISTANCE_CATEGORIES.map((item) => (
          <Pressable accessibilityRole="button" accessibilityState={{ selected: category === item.id }} key={item.id} onPress={() => setCategory(item.id)} className="items-center px-1 py-2" style={{ width: '33.3333%' }}>
            <View className={category === item.id ? 'h-14 w-14 items-center justify-center rounded-full bg-ui-primary dark:bg-ui-dark-primary' : 'h-14 w-14 items-center justify-center rounded-full border border-ui-border bg-ui-surface dark:border-ui-dark-border dark:bg-ui-dark-surface'}>
              <MaterialCommunityIcons name={item.icon} size={25} color={category === item.id ? 'white' : '#087443'} />
            </View>
            <Text className={category === item.id ? 'mt-2 text-center text-xs font-black text-ui-primary dark:text-ui-dark-primary' : 'mt-2 text-center text-xs font-extrabold text-ui-text dark:text-ui-dark-text'} numberOfLines={3}>{item[language]}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-ui-background dark:bg-ui-dark-background">
      <FlatList
        data={directory.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ServiceCard service={item} />}
        contentContainerStyle={{ paddingBottom: 28, paddingHorizontal: 20 }}
        ListHeaderComponent={header}
        ListEmptyComponent={locating || directory.isLoading
          ? <View className="items-center py-14"><ActivityIndicator size="large" color="#087443" /><Text className="mt-4 text-center font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Buscando servicios cercanos…' : 'Finding nearby services…'}</Text></View>
          : locationError
            ? <View className="items-center rounded-card border border-ui-border bg-ui-surface px-6 py-10 dark:border-ui-dark-border dark:bg-ui-dark-surface"><MaterialCommunityIcons name="crosshairs-question" size={42} color="#68737A" /><Text className="mt-4 text-center font-bold text-ui-text dark:text-ui-dark-text">{locationError}</Text><Pressable className="mt-5 rounded-2xl bg-ui-primary px-5 py-3" onPress={() => void locate()}><Text className="font-black text-white">{language === 'es' ? 'Reintentar ubicación' : 'Retry location'}</Text></Pressable></View>
            : <View className="items-center rounded-card border border-dashed border-ui-border bg-ui-surface px-6 py-12 dark:border-ui-dark-border dark:bg-ui-dark-surface"><MaterialCommunityIcons name={selectedCategory.icon} size={44} color="#68737A" /><Text className="mt-4 text-center text-lg font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'No hay resultados en esta categoría' : 'No results in this category'}</Text></View>}
      />
    </View>
  );
}
