import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useScrollToTop } from 'expo-router/react-navigation';
import { useQuery } from '@tanstack/react-query';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { AppCard, PrimaryButton } from '@/components/ui';
import { ferryRoutes, buildOfflineTripPlan, buildTripPlan, openNavigation, TRIP_VEHICLES, type PlannerPreference, type TripPlan, type TripVehicle } from '@/lib/logistics';
import { getPlannerOptions } from '@/lib/app-options';
import { getOfflineTripPack, syncOfflineTripPack } from '../../lib/offline-trip-pack';
import { scheduleTripReminders } from '../../lib/trip-notifications';
import { useApp } from '@/providers/app-provider';

export default function MyTripScreen() {
  const { exchangeRate, language, userLocation } = useApp();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const [time, setTime] = useState('8');
  const [timeUnit, setTimeUnit] = useState<'hours' | 'days'>('hours');
  const [budget, setBudget] = useState('25000');
  const [budgetCurrency, setBudgetCurrency] = useState<'CRC' | 'USD'>('CRC');
  const [vehicle, setVehicle] = useState<TripVehicle>('sedan');
  const [style, setStyle] = useState<PlannerPreference>('Todo');
  const [zone, setZone] = useState('');
  const [ferryId, setFerryId] = useState('');
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isSpanish = language === 'es';
  const plannerOptions = useQuery({ queryKey: ['planner-options'], queryFn: getPlannerOptions, staleTime: 60 * 60 * 1000 });
  const styles = plannerOptions.data?.styles ?? [];
  const provinces = useMemo(() => plannerOptions.data?.provinces ?? [], [plannerOptions.data?.provinces]);
  useEffect(() => { if (!zone && provinces[0]) setZone(provinces[0]); }, [provinces, zone]);
  const formatCrc = (amount: number) => budgetCurrency === 'USD' ? `$${(amount / exchangeRate).toFixed(2)}` : `₡${Math.round(amount).toLocaleString('es-CR')}`;

  const createPlan = async () => {
    const availableHours = Number(time) * (timeUnit === 'days' ? 8 : 1);
    const maxBudget = Number(budget) * (budgetCurrency === 'USD' ? exchangeRate : 1);
    if (!Number.isFinite(availableHours) || availableHours < 2 || !Number.isFinite(maxBudget) || maxBudget <= 0) return setMessage(isSpanish ? 'Ingresá al menos 2 horas y un presupuesto válido.' : 'Enter at least 2 hours and a valid budget.');
    const input = { latitude: userLocation?.latitude ?? 9.9326, longitude: userLocation?.longitude ?? -84.0805, availableHours, maxBudget, vehicle, category: style, language };
    setBusy(true); setMessage(null);
    try {
      const nextPlan = await buildTripPlan(input);
      setPlan(nextPlan);
      setMessage(nextPlan ? (userLocation ? (isSpanish ? 'Ruta lista para hoy.' : 'Today’s route is ready.') : (isSpanish ? 'Ruta estimada desde San José; activá ubicación para ajustarla.' : 'Route estimated from San José; enable location to refine it.')) : (isSpanish ? 'No encontré paradas que entren en ese tiempo y presupuesto.' : 'No stops fit that time and budget.'));
    } catch {
      const pack = await getOfflineTripPack(zone);
      const nextPlan = pack ? buildOfflineTripPlan(input, pack.destinations) : null;
      setPlan(nextPlan);
      setMessage(nextPlan ? (isSpanish ? `Ruta creada con el paquete offline de ${zone}.` : `Route created from the ${zone} offline package.`) : (isSpanish ? 'No hay un paquete offline útil para esta ruta. Conectate y descargá la zona.' : 'There is no usable offline package for this route. Connect and download the zone.'));
    } finally { setBusy(false); }
  };

  const download = async () => {
    setBusy(true); setMessage(null);
    try {
      const pack = await syncOfflineTripPack(zone);
      setMessage(isSpanish ? `${zone} disponible sin conexión: ${pack.destinations.length} destinos, ${pack.commerces.length} comercios y ${pack.buses.length} rutas.` : `${zone} is available offline: ${pack.destinations.length} destinations, ${pack.commerces.length} businesses, and ${pack.buses.length} routes.`);
    } catch (error) { setMessage(error instanceof Error && error.message === 'NATIVE_ONLY' ? (isSpanish ? 'Las descargas offline se habilitan en la app iOS o Android.' : 'Offline downloads are available in the iOS or Android app.') : (isSpanish ? 'No se pudo descargar el paquete.' : 'The package could not be downloaded.')); }
    finally { setBusy(false); }
  };

  const reminders = async () => {
    if (!plan) return;
    setBusy(true); setMessage(null);
    try {
      await scheduleTripReminders(plan, ferryRoutes.find((route) => route.id === ferryId) ?? null);
      setMessage(isSpanish ? 'Recordatorios locales programados.' : 'Local reminders scheduled.');
    } catch (error) {
      const unavailable = error instanceof Error && ['NATIVE_ONLY', 'EXPO_GO_NOTIFICATIONS_UNAVAILABLE'].includes(error.message);
      setMessage(unavailable
        ? (isSpanish ? 'Los recordatorios requieren la aplicación instalada; Expo Go no admite notificaciones remotas.' : 'Reminders require the installed app; Expo Go does not support remote notifications.')
        : (isSpanish ? 'Permití las notificaciones para activar los recordatorios.' : 'Allow notifications to enable reminders.'));
    }
    finally { setBusy(false); }
  };

  return <ScrollView ref={scrollRef} className="flex-1 bg-ui-background dark:bg-ui-dark-background" contentContainerStyle={{ paddingBottom: 56 }} showsVerticalScrollIndicator={false}>
    <View className="border-b border-ui-border bg-ui-surface px-5 py-2 dark:border-ui-dark-border dark:bg-ui-dark-surface">
      <Text className="text-xs font-black uppercase tracking-[2px] text-ui-primary dark:text-ui-dark-primary">{isSpanish ? 'Planificador inteligente' : 'Smart planner'}</Text>
      <View className="mt-1 flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-caribbean-50 dark:bg-caribbean-900"><MaterialCommunityIcons name="map-marker-path" size={23} color="#0077A8" /></View>
        <View className="ml-3 flex-1"><Text className="text-2xl font-extrabold tracking-tight text-ui-text dark:text-ui-dark-text">{isSpanish ? 'Mi viaje' : 'My trip'}</Text><Text className="mt-0.5 text-xs leading-4 text-ui-text-muted dark:text-ui-dark-text-muted" numberOfLines={1}>{isSpanish ? 'De una idea a una ruta clara, parada por parada.' : 'From an idea to a clear, stop-by-stop route.'}</Text></View>
      </View>
    </View>

    <View className="gap-5 px-5 pt-5">
      <AppCard className="p-5">
        <Text className="text-xl font-black text-ui-text dark:text-ui-dark-text">{isSpanish ? 'Diseñá el día' : 'Shape your day'}</Text>
        <Text className="mt-1 text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'Completá cuatro decisiones rápidas. Nosotros ordenamos el resto.' : 'Make four quick choices. We will organize the rest.'}</Text>

        <PlannerSection icon="clock-outline" label={isSpanish ? '01 · Tiempo disponible' : '01 · Available time'}>
          <View className="flex-row gap-2"><TextInput accessibilityLabel={isSpanish ? 'Tiempo disponible' : 'Available time'} className="min-h-12 flex-1 rounded-control bg-ui-muted px-4 text-base text-ui-text dark:bg-ui-dark-muted dark:text-ui-dark-text" keyboardType="decimal-pad" onChangeText={setTime} value={time} /><Choice active={timeUnit === 'hours'} label={isSpanish ? 'Horas' : 'Hours'} onPress={() => setTimeUnit('hours')} /><Choice active={timeUnit === 'days'} label={isSpanish ? 'Días' : 'Days'} onPress={() => setTimeUnit('days')} /></View>
          {timeUnit === 'days' ? <Text className="mt-2 text-xs leading-4 text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'Calculamos 8 horas de actividades por día.' : 'We calculate 8 activity hours per day.'}</Text> : null}
        </PlannerSection>

        <PlannerSection icon="wallet-outline" label={isSpanish ? '02 · Presupuesto' : '02 · Budget'}>
          <View className="flex-row gap-2"><TextInput accessibilityLabel={isSpanish ? 'Presupuesto' : 'Budget'} className="min-h-12 flex-1 rounded-control bg-ui-muted px-4 text-base text-ui-text dark:bg-ui-dark-muted dark:text-ui-dark-text" keyboardType="decimal-pad" onChangeText={setBudget} value={budget} /><Choice active={budgetCurrency === 'CRC'} label="CRC" onPress={() => setBudgetCurrency('CRC')} /><Choice active={budgetCurrency === 'USD'} label="USD" onPress={() => setBudgetCurrency('USD')} /></View>
        </PlannerSection>

        <PlannerSection icon="car-outline" label={isSpanish ? '03 · Forma de viajar' : '03 · Way to travel'}>
          <View className="flex-row flex-wrap gap-2">{TRIP_VEHICLES.map((item) => <Choice active={vehicle === item.id} key={item.id} label={isSpanish ? item.es : item.en} onPress={() => setVehicle(item.id)} />)}</View>
        </PlannerSection>

        <PlannerSection icon="compass-outline" label={isSpanish ? '04 · Estilo del recorrido' : '04 · Travel style'}>
          {plannerOptions.isPending ? <Text className="text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'Cargando estilos…' : 'Loading styles…'}</Text> : plannerOptions.isError ? <Pressable accessibilityRole="button" className="min-h-11 justify-center rounded-control bg-ui-primary-soft px-4 dark:bg-ui-dark-primary-soft" onPress={() => void plannerOptions.refetch()}><Text className="font-bold text-ui-primary dark:text-ui-dark-primary">{isSpanish ? 'No se cargaron. Reintentar' : 'Could not load. Retry'}</Text></Pressable> : <View className="flex-row flex-wrap gap-2">{styles.map((item) => <Choice active={style === item} key={item} label={item} onPress={() => setStyle(item)} />)}</View>}
        </PlannerSection>

        <PrimaryButton className="mt-6" disabled={busy || plannerOptions.isPending} onPress={() => void createPlan()}>{busy ? (isSpanish ? 'Preparando ruta…' : 'Preparing route…') : (isSpanish ? 'Crear mi ruta' : 'Create my route')}</PrimaryButton>
      </AppCard>

      {message ? <View accessibilityRole="alert" className="flex-row items-start rounded-card border border-caribbean-200 bg-caribbean-50 p-4 dark:border-caribbean-800 dark:bg-caribbean-900/30"><MaterialCommunityIcons name="information-outline" size={21} color="#0077A8" /><Text className="ml-3 flex-1 font-semibold leading-5 text-caribbean-700 dark:text-caribbean-100">{message}</Text></View> : null}

      {plan ? <AppCard className="p-5">
        <View className="flex-row items-start justify-between"><View className="flex-1 pr-4"><Text className="text-xs font-black uppercase tracking-[1.5px] text-ui-primary dark:text-ui-dark-primary">{isSpanish ? 'Ruta recomendada' : 'Recommended route'}</Text><Text className="mt-1 text-2xl font-black text-ui-text dark:text-ui-dark-text">{isSpanish ? 'Tu día, en orden' : 'Your day, in order'}</Text></View><View className="h-11 w-11 items-center justify-center rounded-2xl bg-caribbean-50 dark:bg-caribbean-900"><MaterialCommunityIcons color="#0077A8" name="format-list-numbered" size={25} /></View></View>
        <View className="mt-5 flex-row overflow-hidden rounded-2xl bg-ui-muted dark:bg-ui-dark-muted"><PlanMetric label={isSpanish ? 'Paradas' : 'Stops'} value={String(plan.stops.length)} /><PlanMetric label={isSpanish ? 'Inversión' : 'Budget'} value={formatCrc(plan.estimatedTotalCrc)} /><PlanMetric label={isSpanish ? 'Estilo' : 'Style'} value={style} /></View>
        <View className="mt-6">{plan.stops.map((stop, index) => <View className={index === plan.stops.length - 1 ? 'relative ml-4 pl-7 pb-1' : 'relative ml-4 border-l-2 border-caribbean-200 pb-6 pl-7 dark:border-caribbean-800'} key={stop.destination.id}><View className="absolute -left-[17px] top-0 h-8 w-8 items-center justify-center rounded-full border-4 border-ui-surface bg-caribbean-500 dark:border-ui-dark-surface"><Text className="text-xs font-black text-white">{stop.order}</Text></View><Text className="text-xs font-black uppercase tracking-wide text-ui-primary dark:text-ui-dark-primary">{new Date(stop.arrivalAt).toLocaleTimeString(isSpanish ? 'es-CR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</Text><Text className="mt-1 text-base font-black text-ui-text dark:text-ui-dark-text">{stop.destination.name}</Text><Text className="mt-1 text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{stop.travelMinutes} min {isSpanish ? 'de traslado' : 'travel'} · {Math.round(stop.visitMinutes / 60 * 10) / 10} h {isSpanish ? 'en el destino' : 'at the destination'}</Text><Pressable accessibilityRole="button" className="mt-2 min-h-11 flex-row items-center self-start" onPress={() => void openNavigation(stop.destination.latitude, stop.destination.longitude)}><MaterialCommunityIcons name="navigation-variant-outline" size={18} color="#0077A8" /><Text className="ml-2 font-black text-caribbean-700 dark:text-caribbean-100">{isSpanish ? 'Abrir navegación' : 'Open navigation'}</Text></Pressable></View>)}</View>
        <View className="mt-5 border-t border-ui-border pt-5 dark:border-ui-dark-border"><Text className="font-bold text-ui-text dark:text-ui-dark-text">{isSpanish ? '¿Tu ruta incluye ferri?' : 'Does your route include a ferry?'}</Text><ScrollView horizontal className="mt-3" contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}><Choice active={!ferryId} label={isSpanish ? 'Sin ferri' : 'No ferry'} onPress={() => setFerryId('')} />{ferryRoutes.map((route) => <Choice active={ferryId === route.id} key={route.id} label={route.route} onPress={() => setFerryId(route.id)} />)}</ScrollView><PrimaryButton className="mt-4" disabled={busy} onPress={() => void reminders()}>{isSpanish ? 'Activar recordatorios' : 'Enable reminders'}</PrimaryButton></View>
      </AppCard> : null}

      <AppCard className="p-5"><View className="flex-row items-start"><View className="h-11 w-11 items-center justify-center rounded-2xl bg-ui-primary-soft dark:bg-ui-dark-primary-soft"><MaterialCommunityIcons name="download-circle-outline" size={25} color="#087443" /></View><View className="ml-3 flex-1"><Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{isSpanish ? 'Prepará la zona sin conexión' : 'Prepare the area offline'}</Text><Text className="mt-1 text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'Destinos, transporte, emergencias y comercios, aunque perdás señal.' : 'Destinations, transport, emergencies, and businesses even without signal.'}</Text></View></View>{plannerOptions.isError ? <Pressable accessibilityRole="button" className="mt-4 min-h-11 justify-center rounded-control bg-ui-primary-soft px-4 dark:bg-ui-dark-primary-soft" onPress={() => void plannerOptions.refetch()}><Text className="font-bold text-ui-primary dark:text-ui-dark-primary">{isSpanish ? 'Reintentar cargar zonas' : 'Retry loading areas'}</Text></Pressable> : <ScrollView horizontal className="mt-4" contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}>{provinces.map((province) => <Choice active={zone === province} key={province} label={province} onPress={() => setZone(province)} />)}</ScrollView>}<PrimaryButton className="mt-4" disabled={busy || !zone} onPress={() => void download()}>{isSpanish ? `Descargar ${zone || 'zona'}` : `Download ${zone || 'area'}`}</PrimaryButton></AppCard>
    </View>
  </ScrollView>;
}

function Choice({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} className={active ? 'min-h-11 justify-center rounded-full bg-ui-primary px-4 active:bg-ui-primary-pressed dark:bg-ui-dark-primary' : 'min-h-11 justify-center rounded-full border border-transparent bg-ui-muted px-4 active:border-ui-border dark:bg-ui-dark-muted'} onPress={onPress}><Text className={active ? 'font-bold text-white' : 'font-bold text-ui-text dark:text-ui-dark-text'}>{label}</Text></Pressable>;
}

function PlannerSection({ children, icon, label }: { children: ReactNode; icon: ComponentProps<typeof MaterialCommunityIcons>['name']; label: string }) {
  return <View className="mt-5 border-t border-ui-border pt-5 dark:border-ui-dark-border"><View className="mb-3 flex-row items-center"><MaterialCommunityIcons name={icon} size={18} color="#087443" /><Text className="ml-2 text-xs font-black uppercase tracking-wide text-ui-text-muted dark:text-ui-dark-text-muted">{label}</Text></View>{children}</View>;
}

function PlanMetric({ label, value }: { label: string; value: string }) {
  return <View className="min-w-0 flex-1 items-center border-r border-ui-border px-2 py-3 last:border-r-0 dark:border-ui-dark-border"><Text className="text-center text-base font-black text-ui-text dark:text-ui-dark-text" numberOfLines={1}>{value}</Text><Text className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-ui-text-muted dark:text-ui-dark-text-muted">{label}</Text></View>;
}
