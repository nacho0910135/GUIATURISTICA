import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useScrollToTop } from 'expo-router/react-navigation';
import { useQuery } from '@tanstack/react-query';
import type { ComponentProps, ReactNode } from 'react';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { AppCard, PrimaryButton } from '@/components/ui';
import { buildOfflineTripPlan, buildTripPlan, openNavigation, TRIP_VEHICLES, type PlannerPreference, type TripPlan, type TripVehicle } from '@/lib/logistics';
import { getPlannerOptions } from '@/lib/app-options';
import { getPreciseCurrentLocation } from '@/lib/current-location';
import { getOfflineTripPack } from '../../lib/offline-trip-pack';
import { useApp } from '@/providers/app-provider';

export default function MyTripScreen() {
  const { exchangeRate, isDark, language, userLocation } = useApp();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const [time, setTime] = useState('8');
  const [timeUnit, setTimeUnit] = useState<'hours' | 'days'>('hours');
  const [budget, setBudget] = useState('25000');
  const [travelers, setTravelers] = useState('1');
  const [budgetCurrency, setBudgetCurrency] = useState<'CRC' | 'USD'>('CRC');
  const [vehicle, setVehicle] = useState<TripVehicle>('sedan');
  const [stylesSelected, setStylesSelected] = useState<PlannerPreference[]>([]);
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isSpanish = language === 'es';
  const plannerOptions = useQuery({ queryKey: ['planner-options'], queryFn: getPlannerOptions, staleTime: 60 * 60 * 1000 });
  const categories = plannerOptions.data?.categories ?? [];
  const provinces = useMemo(() => plannerOptions.data?.provinces ?? [], [plannerOptions.data?.provinces]);
  const formatCrc = (amount: number) => budgetCurrency === 'USD' ? `$${(amount / exchangeRate).toFixed(2)}` : `₡${Math.round(amount).toLocaleString('es-CR')}`;

  const createPlan = async () => {
    const availableHours = Number(time) * (timeUnit === 'days' ? 8 : 1);
    const maxBudget = Number(budget) * (budgetCurrency === 'USD' ? exchangeRate : 1);
    const travelerCount = Number(travelers);
    if (!Number.isFinite(availableHours) || availableHours < 2 || !Number.isFinite(maxBudget) || maxBudget <= 0 || !Number.isInteger(travelerCount) || travelerCount < 1 || travelerCount > 30) return setMessage(isSpanish ? 'Ingresá al menos 2 horas, un presupuesto válido y entre 1 y 30 personas.' : 'Enter at least 2 hours, a valid budget, and 1 to 30 travelers.');
    setBusy(true); setMessage(null);
    try {
      const origin = await getPreciseCurrentLocation(language);
      const input = { latitude: origin.latitude, longitude: origin.longitude, availableHours, maxBudget, travelers: travelerCount, vehicle, categories: stylesSelected, language };
      const nextPlan = await buildTripPlan(input);
      setPlan(nextPlan);
      setMessage(nextPlan ? (nextPlan.travelTimeSource === 'live-road' ? (isSpanish ? 'Ruta calculada desde tu ubicación actual con tiempos por carretera.' : 'Route calculated from your current location with road travel times.') : (isSpanish ? 'Ruta calculada desde tu ubicación actual con tiempos de traslado estimados.' : 'Route calculated from your current location with estimated travel times.')) : (isSpanish ? 'No encontré paradas que entren en ese tiempo y presupuesto, incluyendo comidas y regreso.' : 'No stops fit that time and budget, including meals and the return trip.'));
    } catch (error) {
      if (!userLocation) {
        setPlan(null);
        setMessage(error instanceof Error ? error.message : (isSpanish ? 'Necesito tu ubicación actual para crear una ruta realista.' : 'I need your current location to create a realistic route.'));
        return;
      }
      const input = { latitude: userLocation.latitude, longitude: userLocation.longitude, availableHours, maxBudget, travelers: travelerCount, vehicle, categories: stylesSelected, language };
      const packs = await Promise.all(provinces.map((province) => getOfflineTripPack(province)));
      const destinations = packs.flatMap((pack) => pack?.destinations ?? []);
      const nextPlan = buildOfflineTripPlan(input, destinations);
      setPlan(nextPlan);
      setMessage(nextPlan ? (isSpanish ? 'Sin conexión: ruta creada desde tu ubicación con datos guardados y tiempos estimados.' : 'Offline: route created from your location using saved data and estimated times.') : (isSpanish ? 'Sin conexión y todavía no hay datos guardados suficientes para esta ruta.' : 'Offline, and there is not enough saved data for this route yet.'));
    } finally { setBusy(false); }
  };

  return <ScrollView ref={scrollRef} className="flex-1 bg-ui-background dark:bg-ui-dark-background" contentContainerStyle={{ paddingBottom: 56 }} showsVerticalScrollIndicator={false}>
    <LinearGradient colors={isDark ? ['#102D24', '#102936'] : ['#E7F7EF', '#E5F3F8']} className="px-5 pb-5 pt-4">
      <Text className="text-xs font-black uppercase tracking-[2px] text-ui-primary dark:text-ui-dark-primary">{isSpanish ? 'Planificador inteligente' : 'Smart planner'}</Text>
      <View className="mt-1 flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white/60 dark:bg-white/10"><MaterialCommunityIcons name="map-marker-path" size={23} color="#0077A8" /></View>
        <View className="ml-3 flex-1"><Text className="text-2xl font-extrabold tracking-tight text-ui-text dark:text-ui-dark-text">{isSpanish ? 'Mi viaje' : 'My trip'}</Text><Text className="mt-0.5 text-xs leading-4 text-ui-text-muted dark:text-ui-dark-text-muted" numberOfLines={1}>{isSpanish ? 'Una ruta posible desde donde estás, con ida, visitas y regreso.' : 'A practical route from where you are, including travel, visits, and return.'}</Text></View>
      </View>
    </LinearGradient>

    <View className="gap-5 px-5 pt-5">
      <AppCard className="p-5">
        <Text className="text-xl font-black text-ui-text dark:text-ui-dark-text">{isSpanish ? 'Diseñá el día' : 'Shape your day'}</Text>
        <Text className="mt-1 text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'Completá cinco decisiones rápidas. Nosotros ordenamos el resto.' : 'Make five quick choices. We will organize the rest.'}</Text>

        <PlannerSection icon="clock-outline" label={isSpanish ? '01 · Tiempo disponible' : '01 · Available time'}>
          <View className="flex-row gap-2"><TextInput accessibilityLabel={isSpanish ? 'Tiempo disponible' : 'Available time'} className="min-h-12 flex-1 rounded-control bg-ui-muted px-4 text-base text-ui-text dark:bg-ui-dark-muted dark:text-ui-dark-text" keyboardType="decimal-pad" onChangeText={setTime} value={time} /><Choice active={timeUnit === 'hours'} label={isSpanish ? 'Horas' : 'Hours'} onPress={() => setTimeUnit('hours')} /><Choice active={timeUnit === 'days'} label={isSpanish ? 'Días' : 'Days'} onPress={() => setTimeUnit('days')} /></View>
          {timeUnit === 'days' ? <Text className="mt-2 text-xs leading-4 text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'Calculamos 8 horas de actividades por día.' : 'We calculate 8 activity hours per day.'}</Text> : null}
        </PlannerSection>

        <PlannerSection icon="wallet-outline" label={isSpanish ? '02 · Presupuesto' : '02 · Budget'}>
          <View className="flex-row gap-2"><TextInput accessibilityLabel={isSpanish ? 'Presupuesto' : 'Budget'} className="min-h-12 flex-1 rounded-control bg-ui-muted px-4 text-base text-ui-text dark:bg-ui-dark-muted dark:text-ui-dark-text" keyboardType="decimal-pad" onChangeText={setBudget} value={budget} /><Choice active={budgetCurrency === 'CRC'} label="CRC" onPress={() => setBudgetCurrency('CRC')} /><Choice active={budgetCurrency === 'USD'} label="USD" onPress={() => setBudgetCurrency('USD')} /></View>
          <Text className="mt-2 text-xs leading-4 text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'El presupuesto es para todo el grupo e incluye entradas y comidas estimadas.' : 'The budget covers the whole group, including admission and estimated meals.'}</Text>
        </PlannerSection>

        <PlannerSection icon="account-group-outline" label={isSpanish ? '03 · Cantidad de personas' : '03 · Number of travelers'}>
          <TextInput accessibilityLabel={isSpanish ? 'Cantidad de personas' : 'Number of travelers'} className="min-h-12 rounded-control bg-ui-muted px-4 text-base text-ui-text dark:bg-ui-dark-muted dark:text-ui-dark-text" keyboardType="number-pad" maxLength={2} onChangeText={setTravelers} value={travelers} />
          <Text className="mt-2 text-xs leading-4 text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'Aproximaciones por persona: almuerzo ₡7.000, café con acompañamiento ₡3.500 y cena ₡10.000. Los precios reales pueden variar según la zona y el establecimiento.' : 'Approximate amounts per person: lunch ₡7,000, coffee and a snack ₡3,500, and dinner ₡10,000. Actual prices vary by area and venue.'}</Text>
        </PlannerSection>

        <PlannerSection icon="car-outline" label={isSpanish ? '04 · Forma de viajar' : '04 · Way to travel'}>
          <View className="flex-row flex-wrap gap-2">{TRIP_VEHICLES.map((item) => <Choice active={vehicle === item.id} key={item.id} label={isSpanish ? item.es : item.en} onPress={() => setVehicle(item.id)} />)}</View>
        </PlannerSection>

        <PlannerSection icon="compass-outline" label={isSpanish ? '05 · Estilo del recorrido' : '05 · Travel style'}>
          <View className="mb-3 flex-row items-center justify-between"><Text className="flex-1 pr-3 text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'Elegí todas las experiencias que querás. Combinamos las coincidencias.' : 'Choose every experience you want. We combine the matches.'}</Text><View className="rounded-full bg-ui-primary-soft px-3 py-1.5 dark:bg-ui-dark-primary-soft"><Text className="text-xs font-black text-ui-primary dark:text-ui-dark-primary">{stylesSelected.length} {isSpanish ? 'elegidas' : 'selected'}</Text></View></View>
          {plannerOptions.isPending ? <Text className="text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'Cargando estilos…' : 'Loading styles…'}</Text> : plannerOptions.isError ? <Pressable accessibilityRole="button" className="min-h-11 justify-center rounded-control bg-ui-primary-soft px-4 dark:bg-ui-dark-primary-soft" onPress={() => void plannerOptions.refetch()}><Text className="font-bold text-ui-primary dark:text-ui-dark-primary">{isSpanish ? 'No se cargaron. Reintentar' : 'Could not load. Retry'}</Text></Pressable> : <View className="flex-row flex-wrap gap-2"><Choice active={!stylesSelected.length} key="Todo" label={isSpanish ? 'Cualquier estilo' : 'Any style'} onPress={() => setStylesSelected([])} />{categories.map((item) => <Choice active={stylesSelected.includes(item.label_es)} key={item.id} label={isSpanish ? item.label_es : item.label_en} onPress={() => setStylesSelected((current) => current.includes(item.label_es) ? current.filter((selected) => selected !== item.label_es) : [...current, item.label_es])} />)}</View>}
        </PlannerSection>

        <PrimaryButton className="mt-6" disabled={busy || plannerOptions.isPending} onPress={() => void createPlan()}>{busy ? (isSpanish ? 'Preparando ruta…' : 'Preparing route…') : (isSpanish ? 'Crear mi ruta' : 'Create my route')}</PrimaryButton>
      </AppCard>

      {message ? <View accessibilityRole="alert" className="flex-row items-start rounded-card border border-caribbean-200 bg-caribbean-50 p-4 dark:border-caribbean-800 dark:bg-caribbean-900/30"><MaterialCommunityIcons name="information-outline" size={21} color="#0077A8" /><Text className="ml-3 flex-1 font-semibold leading-5 text-caribbean-700 dark:text-caribbean-100">{message}</Text></View> : null}

      {plan ? <AppCard className="p-5">
        <View className="flex-row items-start justify-between"><View className="flex-1 pr-4"><Text className="text-xs font-black uppercase tracking-[1.5px] text-ui-primary dark:text-ui-dark-primary">{isSpanish ? 'Ruta recomendada' : 'Recommended route'}</Text><Text className="mt-1 text-2xl font-black text-ui-text dark:text-ui-dark-text">{isSpanish ? 'Tu día, en orden' : 'Your day, in order'}</Text></View><View className="h-11 w-11 items-center justify-center rounded-2xl bg-caribbean-50 dark:bg-caribbean-900"><MaterialCommunityIcons color="#0077A8" name="format-list-numbered" size={25} /></View></View>
        <View className="mt-5 flex-row overflow-hidden rounded-2xl bg-ui-muted dark:bg-ui-dark-muted"><PlanMetric label={isSpanish ? 'Paradas' : 'Stops'} value={String(plan.stops.length)} /><PlanMetric label={isSpanish ? 'Inversión' : 'Budget'} value={formatCrc(plan.estimatedTotalCrc)} /><PlanMetric label={isSpanish ? 'Finaliza' : 'Ends'} value={new Date(plan.endsAt).toLocaleTimeString(isSpanish ? 'es-CR' : 'en-US', { hour: '2-digit', minute: '2-digit' })} /></View>
        <View className="mt-4 rounded-control bg-ui-primary-soft p-4 dark:bg-ui-dark-primary-soft"><Text className="font-bold text-ui-text dark:text-ui-dark-text">{isSpanish ? `Comidas aproximadas para ${travelers} persona(s): ${formatCrc(plan.mealCostCrc)}; pueden variar según la zona. Traslados totales, incluido el regreso: ${plan.totalTravelMinutes} min (${plan.travelTimeSource === 'live-road' ? 'ruta por carretera' : 'estimación offline'}).` : `Approximate meals for ${travelers} traveler(s): ${formatCrc(plan.mealCostCrc)}; prices vary by area. Total travel, including return: ${plan.totalTravelMinutes} min (${plan.travelTimeSource === 'live-road' ? 'road routing' : 'offline estimate'}).`}</Text></View>
        <View className="mt-6">{plan.stops.map((stop, index) => <View className={index === plan.stops.length - 1 ? 'relative ml-4 pl-7 pb-1' : 'relative ml-4 border-l-2 border-caribbean-200 pb-6 pl-7 dark:border-caribbean-800'} key={stop.destination.id}><View className="absolute -left-[17px] top-0 h-8 w-8 items-center justify-center rounded-full border-4 border-ui-surface bg-caribbean-500 dark:border-ui-dark-surface"><Text className="text-xs font-black text-white">{stop.order}</Text></View><Text className="text-xs font-black uppercase tracking-wide text-ui-primary dark:text-ui-dark-primary">{new Date(stop.arrivalAt).toLocaleTimeString(isSpanish ? 'es-CR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</Text><Text className="mt-1 text-base font-black text-ui-text dark:text-ui-dark-text">{stop.destination.name}</Text><Text className="mt-1 text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{stop.travelMinutes} min {isSpanish ? 'de traslado' : 'travel'} · {Math.round(stop.visitMinutes / 60 * 10) / 10} h {isSpanish ? 'en el destino' : 'at the destination'}</Text><Pressable accessibilityRole="button" className="mt-2 min-h-11 flex-row items-center self-start" onPress={() => void openNavigation(stop.destination.latitude, stop.destination.longitude)}><MaterialCommunityIcons name="navigation-variant-outline" size={18} color="#0077A8" /><Text className="ml-2 font-black text-caribbean-700 dark:text-caribbean-100">{isSpanish ? 'Abrir navegación' : 'Open navigation'}</Text></Pressable></View>)}</View>
      </AppCard> : null}

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
