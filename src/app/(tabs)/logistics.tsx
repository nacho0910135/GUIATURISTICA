import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  calculateCostaRicaTotal,
  type Destination,
  emergencyContacts,
  ferryRoutes,
  getFeaturedDestinations,
  getOfflinePack,
  getTides,
  getWeather,
  openNavigation,
  recommendDestinations,
  saveOfflinePack,
  scheduleFerryReminder,
  TIDES_STALE_TIME,
  WEATHER_STALE_TIME,
} from '@/lib/logistics';
import { useApp } from '@/providers/app-provider';

type Language = 'es' | 'en';
const categories = ['Todo', 'Playa', 'Catarata', 'Parque', 'Río', 'Mirador', 'Termales'];
const hoursOptions = [4, 8, 12];
const budgets = [5000, 15000, 30000];

export default function LogisticsScreen() {
  const { formatPrice, language } = useApp();
  const [hours, setHours] = useState(8);
  const [category, setCategory] = useState('Todo');
  const [maxBudget, setMaxBudget] = useState(15000);
  const [coordinates, setCoordinates] = useState({ latitude: 9.932, longitude: -84.08, label: 'San José' });
  const [subtotal, setSubtotal] = useState('10000');
  const [offlinePack, setOfflinePack] = useState(getOfflinePack);

  const featured = useQuery({ queryKey: ['logistics', 'featured-destinations-v2'], queryFn: getFeaturedDestinations, staleTime: 24 * 60 * 60 * 1000 });
  const recommendation = useMutation({
    mutationFn: () => recommendDestinations({ ...coordinates, hours, category, maxBudget }),
    onError: (reason) => Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : copy(language, 'No se pudo calcular la ruta.', 'Could not calculate the route.')),
  });
  const totals = useMemo(() => calculateCostaRicaTotal(Number(subtotal.replace(',', '.')) || 0), [subtotal]);

  const locateUser = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return Alert.alert('Descubriendo CR', copy(language, 'Se necesita permiso de ubicación.', 'Location permission is required.'));
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude, label: copy(language, 'Mi ubicación', 'My location') });
  };

  const downloadOffline = () => {
    const destinations = [...(featured.data ?? []), ...(recommendation.data ?? [])]
      .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);
    if (!destinations.length) return;
    saveOfflinePack(destinations);
    setOfflinePack(getOfflinePack());
    Alert.alert('Offline', copy(language, 'Fichas, coordenadas y contactos guardados.', 'Profiles, coordinates, and contacts saved.'));
  };

  return (
    <ScrollView className="flex-1 bg-mint-50 dark:bg-forest-950" contentContainerStyle={{ paddingBottom: 44 }} showsVerticalScrollIndicator={false}>
      <View className="overflow-hidden bg-[#06364a] px-5 pb-7 pt-7">
        <View className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-caribbean-500/20" />
        <View className="flex-row items-center">
          <View className="h-16 w-16 items-center justify-center rounded-[24px] bg-caribbean-500"><MaterialCommunityIcons name="ferry" size={34} color="white" /></View>
          <View className="ml-4 flex-1"><Text className="text-3xl font-black tracking-tight text-white">{copy(language, 'Logística & Clima', 'Logistics & Weather')}</Text><Text className="mt-1 text-sm leading-5 text-[#ccebf7]">{copy(language, 'Planeá rutas, mareas y transporte aun sin señal.', 'Plan routes, tides, and transport even without signal.')}</Text></View>
        </View>
        <View className="mt-5 flex-row items-center rounded-2xl bg-white/10 p-4">
          <MaterialCommunityIcons name={offlinePack ? 'cloud-check-outline' : 'cloud-download-outline'} size={24} color="#79d7f4" />
          <Text className="ml-3 flex-1 text-sm font-bold text-white">{offlinePack ? copy(language, `Paquete offline · ${offlinePack.destinations.length} destinos`, `Offline pack · ${offlinePack.destinations.length} destinations`) : copy(language, 'Caché offline activo por 7 días', '7-day offline cache enabled')}</Text>
          <Pressable accessibilityRole="button" onPress={downloadOffline}><Text className="font-black text-[#79d7f4]">{copy(language, 'Guardar', 'Save')}</Text></Pressable>
        </View>
      </View>

      <SectionTitle icon="weather-partly-cloudy" title={copy(language, 'Clima y mareas por destino', 'Weather and tides by destination')} />
      {featured.isPending ? <ActivityIndicator className="mt-8" color="#159ed1" /> : null}
      {featured.isError ? <ErrorCard message={copy(language, 'Sin conexión. Guardá destinos para consultarlos offline.', 'Offline. Save destinations for offline access.')} /> : null}
      <ScrollView horizontal className="mt-4" contentContainerStyle={{ gap: 13, paddingHorizontal: 20 }} showsHorizontalScrollIndicator={false}>
        {(featured.data ?? offlinePack?.destinations ?? []).map((destination) => <DestinationCard destination={destination} formatPrice={formatPrice} key={destination.id} language={language} />)}
      </ScrollView>
      <Text className="mx-5 mt-3 text-xs leading-5 text-forest-500 dark:text-mint-300">{copy(language, 'Clima: caché 30 min · Mareas: caché 3 h. La alerta evita cruces cerca de pleamar.', 'Weather: 30 min cache · Tides: 3 h cache. Alerts avoid crossings near high tide.')}</Text>

      <SectionTitle icon="ferry" title={copy(language, 'Ferris del Golfo de Nicoya', 'Gulf of Nicoya ferries')} />
      <View className="px-5">{ferryRoutes.map((route) => <FerryCard formatPrice={formatPrice} key={route.id} language={language} route={route} />)}</View>

      <SectionTitle icon="creation" title={copy(language, '¿Qué hacer hoy?', 'What to do today?')} />
      <View className="mx-5 mt-4 rounded-3xl border border-mint-200 bg-white p-5 dark:border-forest-700 dark:bg-forest-900">
        <FieldLabel>{copy(language, 'Tiempo disponible', 'Available time')}</FieldLabel>
        <View className="mt-3 flex-row gap-2">{hoursOptions.map((value) => <Choice active={hours === value} key={value} label={`${value} h`} onPress={() => setHours(value)} />)}</View>
        <FieldLabel className="mt-5">{copy(language, 'Ubicación', 'Location')}</FieldLabel>
        <Pressable accessibilityRole="button" className="mt-3 flex-row items-center rounded-2xl bg-mint-100 p-4 dark:bg-forest-800" onPress={() => void locateUser()}><MaterialCommunityIcons name="crosshairs-gps" size={22} color="#087db4" /><Text className="ml-3 flex-1 font-bold text-forest-800 dark:text-white">{coordinates.label}</Text><Text className="text-xs font-black text-caribbean-600">GPS</Text></Pressable>
        <FieldLabel className="mt-5">{copy(language, 'Preferencia', 'Preference')}</FieldLabel>
        <ScrollView horizontal className="mt-3" contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}>{categories.map((value) => <Choice active={category === value} key={value} label={categoryLabel(value, language)} onPress={() => setCategory(value)} />)}</ScrollView>
        <FieldLabel className="mt-5">{copy(language, 'Presupuesto máximo por persona', 'Maximum budget per person')}</FieldLabel>
        <View className="mt-3 flex-row gap-2">{budgets.map((value) => <Choice active={maxBudget === value} key={value} label={formatPrice(value)} onPress={() => setMaxBudget(value)} />)}</View>
        <Pressable accessibilityRole="button" className="mt-6 flex-row items-center justify-center rounded-2xl bg-caribbean-600 p-4" disabled={recommendation.isPending} onPress={() => recommendation.mutate()}>{recommendation.isPending ? <ActivityIndicator color="white" /> : <MaterialCommunityIcons name="map-marker-path" size={23} color="white" />}<Text className="ml-3 font-black text-white">{copy(language, 'Crear mi ruta', 'Build my route')}</Text></Pressable>
      </View>

      {recommendation.data ? (
        <View className="mx-5 mt-4 rounded-3xl bg-forest-900 p-5">
          <Text className="text-lg font-black text-white">{copy(language, 'Ruta personalizada', 'Personalized route')}</Text>
          {!recommendation.data.length ? <Text className="mt-3 text-mint-200">{copy(language, 'No hay resultados con esos filtros.', 'No results match those filters.')}</Text> : recommendation.data.map((destination, index) => (
            <Pressable accessibilityRole="button" className="mt-4 flex-row items-center" key={destination.id} onPress={() => void openNavigation(destination.latitude, destination.longitude)}><View className="h-9 w-9 items-center justify-center rounded-full bg-frog-500"><Text className="font-black text-white">{index + 1}</Text></View><View className="ml-3 flex-1"><Text className="font-black text-white">{destination.name}</Text><Text className="mt-1 text-xs text-mint-200">{((destination.dist_meters ?? 0) / 1000).toFixed(1)} km · {formatPrice(destination.price_national_crc)}</Text></View><MaterialCommunityIcons name="navigation-variant" size={23} color="#78dfa1" /></Pressable>
          ))}
        </View>
      ) : null}

      <SectionTitle icon="shield-cross-outline" title="Costa Rica Safe Travel" />
      <View className="mx-5 mt-4 overflow-hidden rounded-3xl border border-coral-200 bg-white dark:border-coral-500/30 dark:bg-forest-900">
        <Pressable accessibilityRole="button" className="flex-row items-center bg-coral-500 p-5" onPress={() => void Linking.openURL('tel:911')}><MaterialCommunityIcons name="phone-alert" size={30} color="white" /><View className="ml-4 flex-1"><Text className="text-xl font-black text-white">911</Text><Text className="text-sm text-white/90">{copy(language, 'Emergencias · llamada directa', 'Emergency · direct call')}</Text></View><MaterialCommunityIcons name="phone" size={25} color="white" /></Pressable>
        <View className="p-5">{emergencyContacts.slice(1).map((contact) => <ContactRow contact={contact} key={contact.phone} />)}<Pressable accessibilityRole="link" className="mt-4 flex-row items-center" onPress={() => void Linking.openURL('https://www.rree.go.cr/?cat=enCR&sec=misiones')}><MaterialCommunityIcons name="office-building-outline" size={22} color="#087db4" /><Text className="ml-3 font-bold text-caribbean-600">{copy(language, 'Directorio de embajadas y consulados', 'Embassy and consulate directory')}</Text></Pressable></View>
      </View>

      <View className="mx-5 mt-5 rounded-3xl border border-mint-200 bg-white p-5 dark:border-forest-700 dark:bg-forest-900">
        <Text className="text-lg font-black text-forest-950 dark:text-white">{copy(language, 'Calculadora 10% + IVA 13%', '10% service + 13% VAT calculator')}</Text>
        <TextInput accessibilityLabel={copy(language, 'Subtotal en colones', 'Subtotal in colones')} className="mt-4 rounded-2xl bg-mint-100 px-4 py-3 text-forest-950 dark:bg-forest-800 dark:text-white" keyboardType="decimal-pad" onChangeText={setSubtotal} placeholder="10000" placeholderTextColor="#75a291" value={subtotal} />
        <MoneyRow label={copy(language, 'Servicio 10%', 'Service 10%')} value={formatPrice(totals.service)} /><MoneyRow label={copy(language, 'IVA 13%', 'VAT 13%')} value={formatPrice(totals.tax)} /><MoneyRow bold label={copy(language, 'Total', 'Total')} value={formatPrice(totals.total)} />
      </View>

      <View className="mx-5 mt-5 rounded-3xl bg-[#e9f8f1] p-5 dark:bg-forest-900">
        <View className="flex-row items-center"><MaterialCommunityIcons name="cellphone-check" size={26} color="#087443" /><Text className="ml-3 text-lg font-black text-forest-950 dark:text-white">SINPE Móvil</Text></View>
        <Text className="mt-3 text-sm leading-6 text-forest-700 dark:text-mint-200">{copy(language, 'Para usarlo necesitás una cuenta en colones de una entidad participante y un número móvil activo. Si sos visitante sin cuenta local, pedí pago con tarjeta o efectivo; verificá siempre el nombre del destinatario antes de enviar.', 'You need a CRC account at a participating bank and an active mobile number. Visitors without a local account should request card or cash payment; always verify the recipient name before sending.')}</Text>
        <Pressable accessibilityRole="link" className="mt-4 self-start" onPress={() => void Linking.openURL('https://www.bccr.fi.cr/cr/es/sistema-de-pagos/servicios-sinpe/servicios-dirigidos-a-personas.html')}><Text className="font-black text-forest-700 dark:text-frog-300">{copy(language, 'Guía oficial del BCCR  ›', 'Official BCCR guide  ›')}</Text></Pressable>
      </View>
    </ScrollView>
  );
}

function DestinationCard({ destination, formatPrice, language }: { destination: Destination; formatPrice: (value: number) => string; language: Language }) {
  const weather = useQuery({ queryKey: ['weather', destination.latitude.toFixed(3), destination.longitude.toFixed(3), language], queryFn: () => getWeather(destination, language), staleTime: WEATHER_STALE_TIME });
  const tides = useQuery({ queryKey: ['tides', destination.latitude.toFixed(3), destination.longitude.toFixed(3)], queryFn: () => getTides(destination), staleTime: TIDES_STALE_TIME, enabled: destination.has_high_tides_risk });
  return <View className="w-72 overflow-hidden rounded-3xl border border-mint-200 bg-white dark:border-forest-700 dark:bg-forest-900"><View className="h-44 bg-forest-800">{destination.cover_image_url ? <Image source={{ uri: destination.cover_image_url }} contentFit="cover" style={{ height: '100%', width: '100%' }} transition={180} /> : null}<View className="absolute left-3 top-3 rounded-full bg-forest-950/85 px-3 py-2"><Text className="text-xs font-black text-white">{weather.data ? `${weather.data.temperature}°${weather.data.temperatureUnit} · ${weather.data.description}` : weather.isPending ? '…' : copy(language, 'Configurar clima', 'Configure weather')}</Text></View>{destination.has_high_tides_risk ? <View className={`absolute bottom-3 left-3 right-3 flex-row items-center rounded-2xl px-3 py-2 ${tides.data?.alert ? 'bg-coral-500' : 'bg-[#06364a]/90'}`}><MaterialCommunityIcons name="waves-arrow-up" size={19} color="white" /><Text className="ml-2 flex-1 text-xs font-black text-white">{tideLabel(tides.data, tides.isPending, language)}</Text></View> : null}</View><View className="p-4"><Text className="text-lg font-black text-forest-950 dark:text-white">{destination.name}</Text><Text className="mt-1 text-sm text-forest-500 dark:text-mint-300">{destination.province} · {destination.category}</Text><View className="mt-4 flex-row items-center justify-between"><Text className="font-black text-forest-700 dark:text-frog-300">{formatPrice(destination.price_national_crc)}</Text><Pressable accessibilityRole="button" className="flex-row items-center rounded-xl bg-caribbean-600 px-3 py-2" onPress={() => void openNavigation(destination.latitude, destination.longitude)}><MaterialCommunityIcons name="waze" size={18} color="white" /><Text className="ml-2 text-xs font-black text-white">Waze</Text></Pressable></View></View></View>;
}

function FerryCard({ formatPrice, language, route }: { formatPrice: (value: number) => string; language: Language; route: (typeof ferryRoutes)[number] }) {
  const remind = async () => { try { const departure = await scheduleFerryReminder(route); Alert.alert('Ferri', copy(language, `Alerta lista para la salida ${departure.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`, `Reminder set for the ${departure.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} departure.`)); } catch (reason) { Alert.alert('Ferri', reason instanceof Error && reason.message === 'NATIVE_ONLY' ? copy(language, 'Las alertas se programan desde Android o iOS.', 'Reminders are scheduled on Android or iOS.') : copy(language, 'No se pudo programar la alerta.', 'Could not schedule the reminder.')); } };
  return <View className="mt-4 rounded-3xl border border-mint-200 bg-white p-5 dark:border-forest-700 dark:bg-forest-900"><View className="flex-row items-start"><View className="h-12 w-12 items-center justify-center rounded-2xl bg-caribbean-500/15"><MaterialCommunityIcons name="ferry" size={27} color="#087db4" /></View><View className="ml-3 flex-1"><Text className="text-lg font-black text-forest-950 dark:text-white">{route.route}</Text><Text className="mt-1 text-sm font-bold text-caribbean-600">{route.operator}</Text></View></View><ScrollView horizontal className="mt-4" contentContainerStyle={{ gap: 7 }} showsHorizontalScrollIndicator={false}>{route.departures.map((time) => <View className="rounded-xl bg-mint-100 px-3 py-2 dark:bg-forest-800" key={time}><Text className="text-xs font-black text-forest-800 dark:text-white">{time}</Text></View>)}</ScrollView><Text className="mt-4 text-sm text-forest-600 dark:text-mint-200">{copy(language, 'Adulto', 'Adult')} {formatPrice(route.adultFare)} · {copy(language, 'Menor', 'Child')} {formatPrice(route.childFare)} · {copy(language, 'Vehículo liviano', 'Light vehicle')} {formatPrice(route.vehicleFare)}</Text><Text className="mt-2 text-xs text-forest-500 dark:text-mint-300">{copy(language, `Llegá ${route.arrivalMinutes} min antes`, `Arrive ${route.arrivalMinutes} min early`)}{route.validUntil ? ` · ${copy(language, 'vigente hasta', 'valid until')} ${route.validUntil}` : ''}</Text><View className="mt-4 flex-row gap-2"><Pressable accessibilityRole="button" className="flex-1 items-center rounded-xl bg-caribbean-600 p-3" onPress={() => void remind()}><Text className="font-black text-white">{copy(language, 'Crear alerta', 'Set reminder')}</Text></Pressable><Pressable accessibilityRole="link" className="flex-1 items-center rounded-xl border border-caribbean-600 p-3" onPress={() => void Linking.openURL(route.ticketUrl)}><Text className="font-black text-caribbean-600">{copy(language, 'Comprar', 'Buy tickets')}</Text></Pressable></View></View>;
}

function SectionTitle({ icon, title }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string }) { return <View className="mt-8 flex-row items-center px-5"><View className="h-10 w-10 items-center justify-center rounded-2xl bg-caribbean-500/15"><MaterialCommunityIcons name={icon} size={23} color="#087db4" /></View><Text className="ml-3 flex-1 text-xl font-black text-forest-950 dark:text-white">{title}</Text></View>; }
function FieldLabel({ children, className = '' }: { children: string; className?: string }) { return <Text className={`text-sm font-black text-forest-800 dark:text-white ${className}`}>{children}</Text>; }
function Choice({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) { return <Pressable accessibilityRole="button" className={`rounded-full border px-4 py-2 ${active ? 'border-caribbean-600 bg-caribbean-600' : 'border-mint-200 bg-white dark:border-forest-600 dark:bg-forest-800'}`} onPress={onPress}><Text className={`text-xs font-black ${active ? 'text-white' : 'text-forest-700 dark:text-mint-200'}`}>{label}</Text></Pressable>; }
function ContactRow({ contact }: { contact: { label: string; phone: string } }) { return <Pressable accessibilityRole="button" className="mb-3 flex-row items-center" onPress={() => void Linking.openURL(`tel:${contact.phone}`)}><MaterialCommunityIcons name="phone-outline" size={22} color="#087443" /><Text className="ml-3 flex-1 font-bold text-forest-800 dark:text-white">{contact.label}</Text><Text className="text-sm font-black text-forest-600 dark:text-mint-200">{contact.phone}</Text></Pressable>; }
function MoneyRow({ bold, label, value }: { bold?: boolean; label: string; value: string }) { return <View className="mt-3 flex-row justify-between"><Text className={`${bold ? 'font-black' : ''} text-forest-700 dark:text-mint-200`}>{label}</Text><Text className={`${bold ? 'text-lg' : ''} font-black text-forest-950 dark:text-white`}>{value}</Text></View>; }
function ErrorCard({ message }: { message: string }) { return <View className="mx-5 mt-4 rounded-2xl bg-coral-50 p-4 dark:bg-forest-900"><Text className="font-bold text-coral-600">{message}</Text></View>; }
function copy(language: Language, es: string, en: string) { return language === 'es' ? es : en; }
function categoryLabel(value: string, language: Language) { const labels: Record<string, [string, string]> = { Todo: ['Todo', 'All'], Playa: ['Playa', 'Beach'], Catarata: ['Catarata', 'Waterfall'], Parque: ['Parque', 'Park'], Río: ['Río', 'River'], Mirador: ['Mirador', 'Viewpoint'], Termales: ['Termales', 'Hot springs'] }; return copy(language, ...(labels[value] ?? [value, value])); }
function tideLabel(tide: Awaited<ReturnType<typeof getTides>> | undefined, pending: boolean, language: Language) { if (pending) return copy(language, 'Consultando marea…', 'Checking tide…'); if (!tide?.nextHigh) return copy(language, 'Zona sujeta a mareas', 'Tide-sensitive area'); const time = new Date(tide.nextHigh.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); return tide.alert ? copy(language, `Alerta: pleamar ${time} · evitá cruces`, `Alert: high tide ${time} · avoid crossings`) : copy(language, `Próxima pleamar ${time}`, `Next high tide ${time}`); }
