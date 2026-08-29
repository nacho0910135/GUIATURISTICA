import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';

import {
  calculateCostaRicaTotal,
  emergencyContacts,
  ferryRoutes,
  getFeaturedDestinations,
  getOfflinePack,
  openNavigation,
  type PlannerPreference,
  recommendDestinations,
  saveOfflinePack,
  scheduleFerryReminder,
} from '@/lib/logistics';
import { useApp } from '@/providers/app-provider';

type Language = 'es' | 'en';
const categories: PlannerPreference[] = ['Todo', 'Playa', 'Naturaleza', 'Cultura', 'Comida', 'Aventura'];
const hoursOptions = [4, 8, 12];
const budgets = [5000, 15000, 30000];

export default function LogisticsScreen() {
  const { formatPrice, language } = useApp();
  const [hours, setHours] = useState(8);
  const [category, setCategory] = useState<PlannerPreference>('Todo');
  const [maxBudget, setMaxBudget] = useState(15000);
  const [children, setChildren] = useState(false);
  const [seniors, setSeniors] = useState(false);
  const [reducedMobility, setReducedMobility] = useState(false);
  const [hasVehicle, setHasVehicle] = useState(true);
  const [coordinates, setCoordinates] = useState({ latitude: 9.932, longitude: -84.08, label: 'San José' });
  const [subtotal, setSubtotal] = useState('10000');
  const [offlinePack, setOfflinePack] = useState<Awaited<ReturnType<typeof getOfflinePack>>>(null);

  useEffect(() => { void getOfflinePack().then(setOfflinePack); }, []);

  const featured = useQuery({ queryKey: ['logistics', 'featured-destinations-v2'], queryFn: getFeaturedDestinations, staleTime: 24 * 60 * 60 * 1000 });
  const recommendation = useMutation({
    mutationFn: () => recommendDestinations({ ...coordinates, hours, category, maxBudget, children, seniors, reducedMobility, hasVehicle, language }),
    onError: (reason) => Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : copy(language, 'No se pudo calcular la ruta.', 'Could not calculate the route.')),
  });
  const totals = useMemo(() => calculateCostaRicaTotal(Number(subtotal.replace(',', '.')) || 0), [subtotal]);

  const locateUser = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return Alert.alert('Descubriendo CR', copy(language, 'Se necesita permiso de ubicación.', 'Location permission is required.'));
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude, label: copy(language, 'Mi ubicación', 'My location') });
  };

  const downloadOffline = async () => {
    const destinations = [...(featured.data ?? []), ...(recommendation.data ? [recommendation.data.destination] : [])]
      .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);
    if (!destinations.length) return;
    await saveOfflinePack(destinations, recommendation.data);
    setOfflinePack(await getOfflinePack());
    Alert.alert('Offline', copy(language, 'Fichas, coordenadas y contactos guardados.', 'Profiles, coordinates, and contacts saved.'));
  };

  return (
    <ScrollView className="flex-1 bg-ui-background dark:bg-ui-dark-background" contentContainerStyle={{ paddingBottom: 44 }} showsVerticalScrollIndicator={false}>
      <View className="border-b border-ui-border bg-ui-surface px-5 pb-7 pt-7 dark:border-ui-dark-border dark:bg-ui-dark-surface">
        <View className="hidden" />
        <View className="flex-row items-center">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-caribbean-50 dark:bg-caribbean-900"><MaterialCommunityIcons name="ferry" size={32} color="#0077A8" /></View>
          <View className="ml-4 flex-1"><Text className="text-3xl font-extrabold tracking-tight text-ui-text dark:text-ui-dark-text">{copy(language, 'Logística & Clima', 'Logistics & Weather')}</Text><Text className="mt-1 text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{copy(language, 'Planeá rutas, mareas y transporte aun sin señal.', 'Plan routes, tides, and transport even without signal.')}</Text></View>
        </View>
        <View className="mt-5 flex-row items-center rounded-card border border-ui-border bg-ui-muted p-4 dark:border-ui-dark-border dark:bg-ui-dark-muted">
          <MaterialCommunityIcons name={offlinePack ? 'cloud-check-outline' : 'cloud-download-outline'} size={24} color="#79d7f4" />
          <Text className="ml-3 flex-1 text-sm font-semibold text-ui-text dark:text-ui-dark-text">{offlinePack ? copy(language, `Paquete offline · ${offlinePack.destinations.length} destinos`, `Offline pack · ${offlinePack.destinations.length} destinations`) : copy(language, 'Caché offline activo por 7 días', '7-day offline cache enabled')}</Text>
          <Pressable accessibilityRole="button" onPress={() => void downloadOffline()}><Text className="font-black text-[#79d7f4]">{copy(language, 'Guardar', 'Save')}</Text></Pressable>
        </View>
      </View>

      <SectionTitle icon="ferry" title={copy(language, 'Ferris del Golfo de Nicoya', 'Gulf of Nicoya ferries')} />
      <View className="px-5">{ferryRoutes.map((route) => <FerryCard formatPrice={formatPrice} key={route.id} language={language} route={route} />)}</View>

      <SectionTitle icon="creation" title={copy(language, '¿Qué hacer hoy?', 'What to do today?')} />
      <View className="mx-5 mt-4 rounded-card border border-ui-border bg-ui-surface p-5 dark:border-ui-dark-border dark:bg-ui-dark-surface">
        <FieldLabel>{copy(language, 'Tiempo disponible', 'Available time')}</FieldLabel>
        <View className="mt-3 flex-row gap-2">{hoursOptions.map((value) => <Choice active={hours === value} key={value} label={`${value} h`} onPress={() => setHours(value)} />)}</View>
        <FieldLabel className="mt-5">{copy(language, 'Ubicación', 'Location')}</FieldLabel>
        <Pressable accessibilityRole="button" className="mt-3 flex-row items-center rounded-control bg-ui-muted p-4 dark:bg-ui-dark-muted" onPress={() => void locateUser()}><MaterialCommunityIcons name="crosshairs-gps" size={22} color="#0077A8" /><Text className="ml-3 flex-1 font-bold text-ui-text dark:text-ui-dark-text">{coordinates.label}</Text><Text className="text-xs font-black text-ui-secondary dark:text-ui-dark-secondary">GPS</Text></Pressable>
        <FieldLabel className="mt-5">{copy(language, 'Preferencia', 'Preference')}</FieldLabel>
        <ScrollView horizontal className="mt-3" contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}>{categories.map((value) => <Choice active={category === value} key={value} label={categoryLabel(value, language)} onPress={() => setCategory(value)} />)}</ScrollView>
        <FieldLabel className="mt-5">{copy(language, 'Presupuesto máximo por persona', 'Maximum budget per person')}</FieldLabel>
        <View className="mt-3 flex-row gap-2">{budgets.map((value) => <Choice active={maxBudget === value} key={value} label={formatPrice(value)} onPress={() => setMaxBudget(value)} />)}</View>
        <FieldLabel className="mt-5">{copy(language, '¿Con quién viajás?', 'Who are you traveling with?')}</FieldLabel>
        <View className="mt-3 flex-row flex-wrap gap-2"><Choice active={children} label={copy(language, 'Niños', 'Children')} onPress={() => setChildren((value) => !value)} /><Choice active={seniors} label={copy(language, 'Adultos mayores', 'Older adults')} onPress={() => setSeniors((value) => !value)} /><Choice active={reducedMobility} label={copy(language, 'Movilidad reducida', 'Reduced mobility')} onPress={() => setReducedMobility((value) => !value)} /></View>
        <FieldLabel className="mt-5">{copy(language, 'Transporte', 'Transportation')}</FieldLabel>
        <View className="mt-3 flex-row gap-2"><Choice active={hasVehicle} label={copy(language, 'Tengo vehículo', 'I have a vehicle')} onPress={() => setHasVehicle(true)} /><Choice active={!hasVehicle} label={copy(language, 'Sin vehículo', 'No vehicle')} onPress={() => setHasVehicle(false)} /></View>
        <Pressable accessibilityRole="button" className="mt-6 flex-row items-center justify-center rounded-2xl bg-caribbean-600 p-4" disabled={recommendation.isPending} onPress={() => recommendation.mutate()}>{recommendation.isPending ? <ActivityIndicator color="white" /> : <MaterialCommunityIcons name="map-marker-path" size={23} color="white" />}<Text className="ml-3 font-black text-white">{copy(language, 'Crear mi ruta', 'Build my route')}</Text></Pressable>
      </View>

      {recommendation.isSuccess ? (
        <View className="mx-5 mt-4 rounded-card border border-ui-border bg-ui-surface p-5 dark:border-ui-dark-border dark:bg-ui-dark-surface">
          <Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{copy(language, 'Ruta personalizada', 'Personalized route')}</Text>
          <DayPlanCard formatPrice={formatPrice} language={language} onSave={downloadOffline} plan={recommendation.data} />
        </View>
      ) : null}

      <SectionTitle icon="shield-cross-outline" title="Costa Rica Safe Travel" />
      <View className="mx-5 mt-4 overflow-hidden rounded-card border border-ui-border bg-ui-surface dark:border-ui-dark-border dark:bg-ui-dark-surface">
        <Pressable accessibilityRole="button" className="flex-row items-center bg-coral-500 p-5" onPress={() => void Linking.openURL('tel:911')}><MaterialCommunityIcons name="phone-alert" size={30} color="white" /><View className="ml-4 flex-1"><Text className="text-xl font-black text-white">911</Text><Text className="text-sm text-white/90">{copy(language, 'Emergencias · llamada directa', 'Emergency · direct call')}</Text></View><MaterialCommunityIcons name="phone" size={25} color="white" /></Pressable>
        <View className="p-5">{emergencyContacts.slice(1).map((contact) => <ContactRow contact={contact} key={contact.phone} />)}<Pressable accessibilityRole="link" className="mt-4 flex-row items-center" onPress={() => void Linking.openURL('https://www.rree.go.cr/?cat=enCR&sec=misiones')}><MaterialCommunityIcons name="office-building-outline" size={22} color="#087db4" /><Text className="ml-3 font-bold text-caribbean-600">{copy(language, 'Directorio de embajadas y consulados', 'Embassy and consulate directory')}</Text></Pressable></View>
      </View>

      <View className="mx-5 mt-5 rounded-card border border-ui-border bg-ui-surface p-5 dark:border-ui-dark-border dark:bg-ui-dark-surface">
        <Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{copy(language, 'Calculadora 10% + IVA 13%', '10% service + 13% VAT calculator')}</Text>
        <TextInput accessibilityLabel={copy(language, 'Subtotal en colones', 'Subtotal in colones')} className="mt-4 rounded-control bg-ui-muted px-4 py-3 text-ui-text dark:bg-ui-dark-muted dark:text-ui-dark-text" keyboardType="decimal-pad" onChangeText={setSubtotal} placeholder="10000" placeholderTextColor="#68737A" value={subtotal} />
        <MoneyRow label={copy(language, 'Servicio 10%', 'Service 10%')} value={formatPrice(totals.service)} /><MoneyRow label={copy(language, 'IVA 13%', 'VAT 13%')} value={formatPrice(totals.tax)} /><MoneyRow bold label={copy(language, 'Total', 'Total')} value={formatPrice(totals.total)} />
      </View>

      <View className="mx-5 mt-5 rounded-card border border-ui-border bg-ui-primary-soft p-5 dark:border-ui-dark-border dark:bg-ui-dark-primary-soft">
        <View className="flex-row items-center"><MaterialCommunityIcons name="cellphone-check" size={26} color="#0B6B4F" /><Text className="ml-3 text-lg font-black text-ui-text dark:text-ui-dark-text">SINPE Móvil</Text></View>
        <Text className="mt-3 text-sm leading-6 text-ui-text-muted dark:text-ui-dark-text-muted">{copy(language, 'Para usarlo necesitás una cuenta en colones de una entidad participante y un número móvil activo. Si sos visitante sin cuenta local, pedí pago con tarjeta o efectivo; verificá siempre el nombre del destinatario antes de enviar.', 'You need a CRC account at a participating bank and an active mobile number. Visitors without a local account should request card or cash payment; always verify the recipient name before sending.')}</Text>
        <Pressable accessibilityRole="link" className="mt-4 self-start" onPress={() => void Linking.openURL('https://www.bccr.fi.cr/cr/es/sistema-de-pagos/servicios-sinpe/servicios-dirigidos-a-personas.html')}><Text className="font-black text-ui-primary dark:text-ui-dark-primary">{copy(language, 'Guía oficial del BCCR  ›', 'Official BCCR guide  ›')}</Text></Pressable>
      </View>
    </ScrollView>
  );
}

function FerryCard({ formatPrice, language, route }: { formatPrice: (value: number) => string; language: Language; route: (typeof ferryRoutes)[number] }) {
  const remind = async () => { try { const departure = await scheduleFerryReminder(route); Alert.alert('Ferri', copy(language, `Alerta lista para la salida ${departure.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`, `Reminder set for the ${departure.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} departure.`)); } catch (reason) { Alert.alert('Ferri', reason instanceof Error && reason.message === 'NATIVE_ONLY' ? copy(language, 'Las alertas se programan desde Android o iOS.', 'Reminders are scheduled on Android or iOS.') : copy(language, 'No se pudo programar la alerta.', 'Could not schedule the reminder.')); } };
  return <View className="mt-4 rounded-card border border-ui-border bg-ui-surface p-5 dark:border-ui-dark-border dark:bg-ui-dark-surface"><View className="flex-row items-start"><View className="h-12 w-12 items-center justify-center rounded-2xl bg-caribbean-500/15"><MaterialCommunityIcons name="ferry" size={27} color="#0077A8" /></View><View className="ml-3 flex-1"><Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{route.route}</Text><Text className="mt-1 text-sm font-bold text-ui-secondary dark:text-ui-dark-secondary">{route.operator}</Text></View></View><ScrollView horizontal className="mt-4" contentContainerStyle={{ gap: 7 }} showsHorizontalScrollIndicator={false}>{route.departures.map((time) => <View className="rounded-xl bg-ui-muted px-3 py-2 dark:bg-ui-dark-muted" key={time}><Text className="text-xs font-black text-ui-text dark:text-ui-dark-text">{time}</Text></View>)}</ScrollView><Text className="mt-4 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{copy(language, 'Adulto', 'Adult')} {formatPrice(route.adultFare)} · {copy(language, 'Menor', 'Child')} {formatPrice(route.childFare)} · {copy(language, 'Vehículo liviano', 'Light vehicle')} {formatPrice(route.vehicleFare)}</Text><Text className="mt-2 text-xs text-ui-text-muted dark:text-ui-dark-text-muted">{copy(language, `Llegá ${route.arrivalMinutes} min antes`, `Arrive ${route.arrivalMinutes} min early`)}{route.validUntil ? ` · ${copy(language, 'vigente hasta', 'valid until')} ${route.validUntil}` : ''}</Text><View className="mt-4 flex-row gap-2"><Pressable accessibilityRole="button" className="flex-1 items-center rounded-xl bg-ui-secondary p-3 dark:bg-ui-dark-secondary" onPress={() => void remind()}><Text className="font-black text-white">{copy(language, 'Crear alerta', 'Set reminder')}</Text></Pressable><Pressable accessibilityRole="link" className="flex-1 items-center rounded-xl border border-ui-secondary p-3 dark:border-ui-dark-secondary" onPress={() => void Linking.openURL(route.ticketUrl)}><Text className="font-black text-ui-secondary dark:text-ui-dark-secondary">{copy(language, 'Comprar', 'Buy tickets')}</Text></Pressable></View></View>;
}

function DayPlanCard({ formatPrice, language, onSave, plan }: { formatPrice: (value: number) => string; language: Language; onSave: () => Promise<void>; plan: Awaited<ReturnType<typeof recommendDestinations>> }) {
  if (!plan) return <Text className="mt-3 text-ui-text-muted dark:text-ui-dark-text-muted">{copy(language, 'No encontramos un plan seguro con esos filtros. Probá con más tiempo o presupuesto.', 'We could not find a safe plan with those filters. Try more time or budget.')}</Text>;
  const { destination, nearbyService } = plan;
  const share = () => Share.share({ message: copy(language,
    `Plan de hoy: ${destination.name}\nTraslado estimado: ${plan.travelMinutes} min por trayecto\nVisita: ${Math.round(plan.visitMinutes / 60 * 10) / 10} h\nPrecio: ${formatPrice(plan.estimatedTotalCrc)}`,
    `Today's plan: ${destination.name}\nEstimated travel: ${plan.travelMinutes} min each way\nVisit: ${Math.round(plan.visitMinutes / 60 * 10) / 10} h\nPrice: ${formatPrice(plan.estimatedTotalCrc)}`,
  ) });
  return <View className="mt-4 gap-4"><View className="rounded-2xl bg-ui-primary-soft p-4 dark:bg-ui-dark-primary-soft"><Text className="text-xs font-black uppercase tracking-wider text-ui-primary dark:text-ui-dark-primary">{copy(language, 'Destino principal', 'Main destination')}</Text><Text className="mt-1 text-xl font-black text-ui-text dark:text-ui-dark-text">{destination.name}</Text><Text className="mt-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{destination.province} · {destination.category}</Text></View>
    <View className="flex-row flex-wrap gap-2"><PlanFact icon="clock-outline" label={`${plan.travelMinutes} min ${copy(language, 'por trayecto', 'each way')}`} /><PlanFact icon="walk" label={`${Math.round(plan.visitMinutes / 60 * 10) / 10} h ${copy(language, 'de visita', 'visit')}`} /><PlanFact icon="map-marker-distance" label={`${((destination.dist_meters ?? 0) / 1000).toFixed(1)} km`} /><PlanFact icon="cash" label={formatPrice(plan.estimatedTotalCrc)} /></View>
    <View className="rounded-2xl bg-ui-muted p-4 dark:bg-ui-dark-muted"><Text className="font-black text-ui-text dark:text-ui-dark-text">{copy(language, 'Condiciones del día', 'Today’s conditions')}</Text><Text className="mt-2 text-ui-text-muted dark:text-ui-dark-text-muted">{plan.weather ? `${plan.weather.temperature}°${plan.weather.temperatureUnit} · ${plan.weather.description} · ${copy(language, 'humedad', 'humidity')} ${plan.weather.humidity}%` : copy(language, 'Clima no disponible. Revisalo antes de salir.', 'Weather unavailable. Check it before leaving.')}</Text><Text className="mt-2 text-ui-text-muted dark:text-ui-dark-text-muted">{copy(language, 'Horario', 'Hours')}: {destination.schedule || copy(language, 'Sin horario verificado', 'No verified hours')}</Text></View>
    {plan.warnings.length ? <View className="rounded-2xl border border-coral-500/40 bg-coral-50 p-4 dark:bg-coral-500/15"><Text className="font-black text-coral-600">{copy(language, 'Antes de salir', 'Before you go')}</Text>{plan.warnings.map((warning) => <Text className="mt-2 text-sm text-ui-text dark:text-ui-dark-text" key={warning}>• {warning}</Text>)}</View> : null}
    {destination.requires_sinac_booking && destination.sinac_booking_url ? <View className="rounded-2xl border border-ui-secondary/40 bg-ui-secondary/5 p-4"><Text className="font-black text-ui-text dark:text-ui-dark-text">{copy(language, 'Reserva oficial SINAC', 'Official SINAC reservation')}</Text><Text className="mt-2 text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{copy(language, 'Este enlace se conserva junto con tu plan offline. SINAC gestiona la reserva directamente.', 'This link is kept with your offline plan. SINAC manages the reservation directly.')}</Text><Pressable className="mt-3 self-start rounded-xl bg-ui-secondary px-4 py-2" onPress={() => void Linking.openURL(destination.sinac_booking_url!)}><Text className="font-black text-white">{copy(language, 'Abrir reserva oficial', 'Open official reservation')}</Text></Pressable></View> : null}
    {nearbyService ? <View className="rounded-2xl border border-ui-border p-4 dark:border-ui-dark-border"><Text className="text-xs font-black uppercase text-ui-text-muted dark:text-ui-dark-text-muted">{copy(language, 'Comida o servicio cercano', 'Nearby food or service')}</Text><Text className="mt-1 font-black text-ui-text dark:text-ui-dark-text">{nearbyService.title} · {nearbyService.distanceKm.toFixed(1)} km</Text><Text className={`mt-2 self-start rounded-full px-2 py-1 text-[10px] font-black ${nearbyService.verifiedAt ? 'bg-ui-primary text-white' : 'bg-ui-muted text-ui-text-muted dark:bg-white/10 dark:text-ui-dark-text-muted'}`}>{nearbyService.verifiedAt ? copy(language, 'NEGOCIO VERIFICADO', 'VERIFIED BUSINESS') : copy(language, 'INFORMACIÓN COMERCIAL', 'COMMERCIAL INFORMATION')}</Text><View className="mt-3 flex-row gap-2"><Pressable className="rounded-xl bg-ui-secondary px-4 py-2" onPress={() => void openNavigation(nearbyService.latitude, nearbyService.longitude)}><Text className="font-black text-white">{copy(language, 'Llegar', 'Directions')}</Text></Pressable>{nearbyService.phone ? <Pressable className="rounded-xl border border-ui-secondary px-4 py-2" onPress={() => void Linking.openURL(`tel:${nearbyService.phone!.replace(/[^+\d]/g, '')}`)}><Text className="font-black text-ui-secondary dark:text-ui-dark-secondary">{copy(language, 'Llamar', 'Call')}</Text></Pressable> : null}</View></View> : null}
    <View className="flex-row flex-wrap gap-2"><Pressable className="flex-row items-center rounded-xl bg-ui-primary px-4 py-3" onPress={() => void openNavigation(destination.latitude, destination.longitude)}><MaterialCommunityIcons name="navigation-variant" size={19} color="white" /><Text className="ml-2 font-black text-white">{copy(language, 'Cómo llegar', 'Directions')}</Text></Pressable><Pressable className="flex-row items-center rounded-xl border border-ui-primary px-4 py-3" onPress={() => void onSave()}><MaterialCommunityIcons name="download" size={19} color="#0B6B4F" /><Text className="ml-2 font-black text-ui-primary dark:text-ui-dark-primary">{copy(language, 'Guardar offline', 'Save offline')}</Text></Pressable><Pressable className="flex-row items-center rounded-xl border border-ui-border px-4 py-3 dark:border-ui-dark-border" onPress={() => void share()}><MaterialCommunityIcons name="share-variant" size={19} color="#0077A8" /><Text className="ml-2 font-black text-ui-secondary dark:text-ui-dark-secondary">{copy(language, 'Compartir', 'Share')}</Text></Pressable></View>
  </View>;
}

function PlanFact({ icon, label }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }) { return <View className="flex-row items-center rounded-xl bg-ui-muted px-3 py-2 dark:bg-ui-dark-muted"><MaterialCommunityIcons name={icon} size={17} color="#0B6B4F" /><Text className="ml-2 text-xs font-black text-ui-text dark:text-ui-dark-text">{label}</Text></View>; }

function SectionTitle({ icon, title }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string }) { return <View className="mt-8 flex-row items-center px-5"><View className="h-10 w-10 items-center justify-center rounded-2xl bg-caribbean-500/15"><MaterialCommunityIcons name={icon} size={23} color="#0077A8" /></View><Text className="ml-3 flex-1 text-xl font-black text-ui-text dark:text-ui-dark-text">{title}</Text></View>; }
function FieldLabel({ children, className = '' }: { children: string; className?: string }) { return <Text className={`text-sm font-black text-ui-text dark:text-ui-dark-text ${className}`}>{children}</Text>; }
function Choice({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) { return <Pressable accessibilityRole="button" className={`rounded-full border px-4 py-2 ${active ? 'border-ui-secondary bg-ui-secondary dark:border-ui-dark-secondary dark:bg-ui-dark-secondary' : 'border-ui-border bg-ui-surface dark:border-ui-dark-border dark:bg-ui-dark-surface'}`} onPress={onPress}><Text className={`text-xs font-black ${active ? 'text-white' : 'text-ui-text dark:text-ui-dark-text'}`}>{label}</Text></Pressable>; }
function ContactRow({ contact }: { contact: { label: string; phone: string } }) { return <Pressable accessibilityRole="button" className="mb-3 flex-row items-center" onPress={() => void Linking.openURL(`tel:${contact.phone}`)}><MaterialCommunityIcons name="phone-outline" size={22} color="#0B6B4F" /><Text className="ml-3 flex-1 font-bold text-ui-text dark:text-ui-dark-text">{contact.label}</Text><Text className="text-sm font-black text-ui-text-muted dark:text-ui-dark-text-muted">{contact.phone}</Text></Pressable>; }
function MoneyRow({ bold, label, value }: { bold?: boolean; label: string; value: string }) { return <View className="mt-3 flex-row justify-between"><Text className={`${bold ? 'font-black' : ''} text-ui-text-muted dark:text-ui-dark-text-muted`}>{label}</Text><Text className={`${bold ? 'text-lg' : ''} font-black text-ui-text dark:text-ui-dark-text`}>{value}</Text></View>; }
function copy(language: Language, es: string, en: string) { return language === 'es' ? es : en; }
function categoryLabel(value: string, language: Language) { const labels: Record<string, [string, string]> = { Todo: ['Todo', 'All'], Playa: ['Playa', 'Beach'], Naturaleza: ['Naturaleza', 'Nature'], Cultura: ['Cultura', 'Culture'], Comida: ['Comida', 'Food'], Aventura: ['Aventura', 'Adventure'] }; return copy(language, ...(labels[value] ?? [value, value])); }
