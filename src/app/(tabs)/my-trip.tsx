import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useScrollToTop } from 'expo-router/react-navigation';
import { useQuery } from '@tanstack/react-query';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';

import { LocationPickerModal } from '@/components/location-picker-modal';
import { RideDateFields } from '@/components/community/ride-date-fields';
import { AppCard, PrimaryButton } from '@/components/ui';
import { buildTripPlan, openNavigation, rebuildTripPlan, TRIP_VEHICLES, type PlannerPreference, type TripPlan, type TripPlanInput, type TripVehicle } from '@/lib/logistics';
import { getPlannerOptions } from '@/lib/app-options';
import { getPreciseCurrentLocation } from '@/lib/current-location';
import { trackConversion } from '@/lib/conversion-analytics';
import { offlineStorage } from '@/lib/query-storage';
import { useApp } from '@/providers/app-provider';

const SAVED_TRIP_KEY = 'SAVED_TRIP_PLAN';
type SavedTrip = { id: string; name: string; notes: string; plan: TripPlan; input?: TripPlanInput; savedAt: string };

export default function MyTripScreen() {
  const { exchangeRate, isDark, language, userLocation, visitorType, setVisitorType } = useApp();
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
  const [lastInput, setLastInput] = useState<TripPlanInput>();
  const [origin, setOrigin] = useState<{ latitude: number; longitude: number; label: string }>();
  const [originPickerOpen, setOriginPickerOpen] = useState(false);
  const [startsAt, setStartsAt] = useState(() => { const date = new Date(); date.setDate(date.getDate() + 1); date.setHours(8, 0, 0, 0); return date; });
  const [savedAt, setSavedAt] = useState<string>();
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isSpanish = language === 'es';
  const plannerOptions = useQuery({ queryKey: ['planner-options'], queryFn: getPlannerOptions, staleTime: 60 * 60 * 1000 });
  const categories = plannerOptions.data?.categories ?? [];
  const formatCrc = (amount: number) => budgetCurrency === 'USD' ? `$${(amount / exchangeRate).toFixed(2)}` : `₡${Math.round(amount).toLocaleString('es-CR')}`;

  useEffect(() => {
    void Promise.resolve(offlineStorage.getItem(SAVED_TRIP_KEY)).then((value) => {
      if (!value) return;
      try {
        const saved = JSON.parse(value) as SavedTrip[] | { plan: TripPlan; savedAt: string };
        const trips = Array.isArray(saved) ? saved : [{ id: saved.savedAt, name: isSpanish ? 'Viaje guardado' : 'Saved trip', notes: '', ...saved }];
        setSavedTrips(trips); setPlan(trips[0]?.plan ?? null); setLastInput(trips[0]?.input); setSavedAt(trips[0]?.savedAt); setNotes(trips[0]?.notes ?? '');
      } catch { /* Ignorar un guardado local dañado. */ }
    });
  }, [isSpanish]);

  const createPlan = async () => {
    const availableHours = Number(time) * (timeUnit === 'days' ? 8 : 1);
    const maxBudget = Number(budget) * (budgetCurrency === 'USD' ? exchangeRate : 1);
    const travelerCount = Number(travelers);
    if (!Number.isFinite(availableHours) || availableHours < 2 || !Number.isFinite(maxBudget) || maxBudget <= 0 || !Number.isInteger(travelerCount) || travelerCount < 1 || travelerCount > 30) return setMessage(isSpanish ? 'Ingresá al menos 2 horas, un presupuesto válido y entre 1 y 30 personas.' : 'Enter at least 2 hours, a valid budget, and 1 to 30 travelers.');
    setBusy(true); setMessage(null);
    try {
      const startingPoint = origin ?? await getPreciseCurrentLocation(language);
      const input = { latitude: startingPoint.latitude, longitude: startingPoint.longitude, availableHours, maxBudget, travelers: travelerCount, vehicle, categories: stylesSelected, language, startsAt: startsAt.toISOString(), visitorType, exchangeRate };
      const nextPlan = await buildTripPlan(input);
      setLastInput(input);
      setPlan(nextPlan);
      if (nextPlan) void trackConversion('trip_created', { stops: nextPlan.stops.length, vehicle, price_unknown: nextPlan.stops.some((stop) => stop.estimatedCostCrc == null) });
      setSavedAt(undefined);
      setMessage(nextPlan ? (nextPlan.travelTimeSource === 'live-road' ? (isSpanish ? 'Ruta calculada con tiempos por carretera.' : 'Route calculated with road travel times.') : (isSpanish ? 'Ruta calculada con tiempos de traslado estimados.' : 'Route calculated with estimated travel times.')) : (isSpanish ? 'No encontré paradas que entren en ese tiempo y presupuesto, incluyendo comidas y regreso.' : 'No stops fit that time and budget, including meals and the return trip.'));
    } catch (error) {
      if (!userLocation) {
        setPlan(null);
        setMessage(error instanceof Error ? error.message : (isSpanish ? 'Necesito tu ubicación actual para crear una ruta realista.' : 'I need your current location to create a realistic route.'));
        return;
      }
      setPlan(null);
      setMessage(isSpanish ? 'No se puede calcular el itinerario sin Mapbox Directions. Revisá la conexión e intentá de nuevo.' : 'The itinerary cannot be calculated without Mapbox Directions. Check your connection and try again.');
    } finally { setBusy(false); }
  };

  const savePlan = async () => {
    if (!plan) return;
    const timestamp = new Date().toISOString();
    const saved: SavedTrip = { id: timestamp, name: `${plan.stops[0]?.destination.name ?? (isSpanish ? 'Escapada' : 'Trip')} · ${new Date(plan.startsAt).toLocaleDateString(isSpanish ? 'es-CR' : 'en-US', { day: 'numeric', month: 'short' })}`, notes: notes.trim(), plan, input: lastInput, savedAt: timestamp };
    const next = [saved, ...savedTrips];
    await offlineStorage.setItem(SAVED_TRIP_KEY, JSON.stringify(next));
    setSavedTrips(next);
    void trackConversion('trip_saved', { stops: plan.stops.length });
    setSavedAt(timestamp);
    setMessage(isSpanish ? 'Viaje guardado en este dispositivo para consultarlo sin conexión.' : 'Trip saved on this device for offline access.');
  };

  const removeSavedTrip = async (id: string) => {
    const next = savedTrips.filter((trip) => trip.id !== id);
    setSavedTrips(next);
    await offlineStorage.setItem(SAVED_TRIP_KEY, JSON.stringify(next));
  };

  const sharePlan = () => plan && Share.share({ message: [isSpanish ? 'Mi escapada en Descubriendo CR' : 'My Descubriendo CR trip', ...plan.stops.map((stop) => [
    `${stop.order}. ${stop.destination.name} · ${new Date(stop.arrivalAt).toLocaleTimeString(isSpanish ? 'es-CR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}`,
    stop.destination.schedule ? `${isSpanish ? 'Horario' : 'Hours'}: ${stop.destination.schedule}` : (isSpanish ? 'Horario por confirmar' : 'Hours to confirm'),
    stop.destination.closed_day ? `${isSpanish ? 'Cierre indicado' : 'Listed closure'}: ${stop.destination.closed_day}` : '',
    stop.destination.sinac_booking_url ?? '',
  ].filter(Boolean).join('\n')), notes.trim() ? `${isSpanish ? 'Notas' : 'Notes'}: ${notes.trim()}` : ''].filter(Boolean).join('\n\n') }).then(() => trackConversion('trip_shared', { stops: plan.stops.length }));

  const updateStops = async (stops: TripPlan['stops']) => {
    if (!lastInput) return setMessage(isSpanish ? 'Creá la ruta de nuevo para poder editarla.' : 'Create the route again before editing it.');
    setBusy(true); setMessage(null);
    try {
      const next = await rebuildTripPlan(lastInput, stops);
      if (!next) return setMessage(isSpanish ? 'Ese orden no cabe en el tiempo o presupuesto indicado.' : 'That order does not fit the selected time or budget.');
      setPlan(next); setSavedAt(undefined);
    } finally { setBusy(false); }
  };

  const moveStop = (index: number, direction: -1 | 1) => {
    if (!plan || !plan.stops[index + direction]) return;
    const stops = [...plan.stops];
    [stops[index], stops[index + direction]] = [stops[index + direction], stops[index]];
    void updateStops(stops);
  };

  const replaceStop = async (index: number) => {
    if (!plan || !lastInput) return;
    setBusy(true); setMessage(null);
    try {
      const alternatives = await buildTripPlan({ ...lastInput, excludedDestinationIds: plan.stops.map((stop) => stop.destination.id) });
      const replacement = alternatives?.stops[0];
      if (!replacement) return setMessage(isSpanish ? 'No encontré otra parada que cumpla tus filtros.' : 'No other stop matches your filters.');
      const stops = [...plan.stops]; stops[index] = replacement;
      const next = await rebuildTripPlan(lastInput, stops);
      if (!next) return setMessage(isSpanish ? 'La alternativa disponible no cabe en tu tiempo o presupuesto.' : 'The available alternative does not fit your time or budget.');
      setPlan(next); setSavedAt(undefined);
    } finally { setBusy(false); }
  };

  return <><ScrollView ref={scrollRef} className="flex-1 bg-ui-background dark:bg-ui-dark-background" contentContainerStyle={{ paddingBottom: 56 }} showsVerticalScrollIndicator={false}>
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
        <Text className="mt-1 text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'Completá siete decisiones rápidas. Nosotros ordenamos el resto.' : 'Make seven quick choices. We will organize the rest.'}</Text>

        <PlannerSection icon="map-marker-outline" label={isSpanish ? '01 · Punto de salida' : '01 · Starting point'}>
          <Pressable accessibilityRole="button" className="min-h-12 flex-row items-center rounded-control bg-ui-muted px-4 dark:bg-ui-dark-muted" onPress={() => setOriginPickerOpen(true)}><MaterialCommunityIcons name="map-search-outline" size={20} color="#087443" /><Text className="ml-3 flex-1 font-bold text-ui-text dark:text-ui-dark-text">{origin?.label ?? (isSpanish ? 'Mi ubicación actual' : 'My current location')}</Text><MaterialCommunityIcons name="chevron-right" size={22} color="#68737A" /></Pressable>
        </PlannerSection>

        <PlannerSection icon="calendar-clock" label={isSpanish ? '02 · Fecha y hora' : '02 · Date and time'}>
          <RideDateFields language={language} onChange={setStartsAt} value={startsAt} />
        </PlannerSection>

        <PlannerSection icon="clock-outline" label={isSpanish ? '03 · Tiempo disponible' : '03 · Available time'}>
          <View className="flex-row gap-2"><TextInput accessibilityLabel={isSpanish ? 'Tiempo disponible' : 'Available time'} className="min-h-12 flex-1 rounded-control bg-ui-muted px-4 text-base text-ui-text dark:bg-ui-dark-muted dark:text-ui-dark-text" keyboardType="decimal-pad" onChangeText={setTime} value={time} /><Choice active={timeUnit === 'hours'} label={isSpanish ? 'Horas' : 'Hours'} onPress={() => setTimeUnit('hours')} /><Choice active={timeUnit === 'days'} label={isSpanish ? 'Días' : 'Days'} onPress={() => setTimeUnit('days')} /></View>
          {timeUnit === 'days' ? <Text className="mt-2 text-xs leading-4 text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'Calculamos 8 horas de actividades por día.' : 'We calculate 8 activity hours per day.'}</Text> : null}
        </PlannerSection>

        <PlannerSection icon="wallet-outline" label={isSpanish ? '04 · Presupuesto' : '04 · Budget'}>
          <View className="flex-row gap-2"><TextInput accessibilityLabel={isSpanish ? 'Presupuesto' : 'Budget'} className="min-h-12 flex-1 rounded-control bg-ui-muted px-4 text-base text-ui-text dark:bg-ui-dark-muted dark:text-ui-dark-text" keyboardType="decimal-pad" onChangeText={setBudget} value={budget} /><Choice active={budgetCurrency === 'CRC'} label="CRC" onPress={() => setBudgetCurrency('CRC')} /><Choice active={budgetCurrency === 'USD'} label="USD" onPress={() => setBudgetCurrency('USD')} /></View>
          <Text className="mt-2 text-xs leading-4 text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'El presupuesto es para todo el grupo e incluye entradas y comidas estimadas.' : 'The budget covers the whole group, including admission and estimated meals.'}</Text>
          <Text className="mb-2 mt-4 text-xs font-black uppercase tracking-wide text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'Tarifa de entrada' : 'Admission rate'}</Text><View className="flex-row gap-2"><Choice active={visitorType === 'tico'} label={isSpanish ? 'Nacional / residente' : 'National / resident'} onPress={() => setVisitorType('tico')} /><Choice active={visitorType === 'foreigner'} label={isSpanish ? 'Visitante extranjero' : 'Foreign visitor'} onPress={() => setVisitorType('foreigner')} /></View>
        </PlannerSection>

        <PlannerSection icon="account-group-outline" label={isSpanish ? '05 · Cantidad de personas' : '05 · Number of travelers'}>
          <TextInput accessibilityLabel={isSpanish ? 'Cantidad de personas' : 'Number of travelers'} className="min-h-12 rounded-control bg-ui-muted px-4 text-base text-ui-text dark:bg-ui-dark-muted dark:text-ui-dark-text" keyboardType="number-pad" maxLength={2} onChangeText={setTravelers} value={travelers} />
          <Text className="mt-2 text-xs leading-4 text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'Aproximaciones por persona: almuerzo ₡7.000, café con acompañamiento ₡3.500 y cena ₡10.000. Los precios reales pueden variar según la zona y el establecimiento.' : 'Approximate amounts per person: lunch ₡7,000, coffee and a snack ₡3,500, and dinner ₡10,000. Actual prices vary by area and venue.'}</Text>
        </PlannerSection>

        <PlannerSection icon="car-outline" label={isSpanish ? '06 · Forma de viajar' : '06 · Way to travel'}>
          <View className="flex-row flex-wrap gap-2">{TRIP_VEHICLES.map((item) => <Choice active={vehicle === item.id} key={item.id} label={isSpanish ? item.es : item.en} onPress={() => setVehicle(item.id)} />)}</View>
        </PlannerSection>

        <PlannerSection icon="compass-outline" label={isSpanish ? '07 · Estilo del recorrido' : '07 · Travel style'}>
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
        {vehicle === 'bus' ? <View accessibilityRole="alert" className="mt-3 rounded-control border border-caribbean-200 p-4 dark:border-caribbean-800"><Text className="font-bold text-ui-text dark:text-ui-dark-text">{isSpanish ? 'Los tiempos en bus son estimados: confirmá horarios y conexiones antes de salir.' : 'Bus times are estimates: confirm schedules and connections before leaving.'}</Text></View> : null}
        {plan.stops.some((stop) => stop.estimatedCostCrc == null) ? <View accessibilityRole="alert" className="mt-3 rounded-control border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950"><Text className="font-bold text-amber-900 dark:text-amber-100">{isSpanish ? 'Total confirmado: no incluye las entradas marcadas como precio por confirmar.' : 'Confirmed total: admission marked as price to confirm is not included.'}</Text></View> : null}
        <View className="mt-6">{plan.stops.map((stop, index) => <View className={index === plan.stops.length - 1 ? 'relative ml-4 pl-7 pb-1' : 'relative ml-4 border-l-2 border-caribbean-200 pb-6 pl-7 dark:border-caribbean-800'} key={stop.destination.id}><View className="absolute -left-[17px] top-0 h-8 w-8 items-center justify-center rounded-full border-4 border-ui-surface bg-caribbean-500 dark:border-ui-dark-surface"><Text className="text-xs font-black text-white">{stop.order}</Text></View><Text className="text-xs font-black uppercase tracking-wide text-ui-primary dark:text-ui-dark-primary">{new Date(stop.arrivalAt).toLocaleTimeString(isSpanish ? 'es-CR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</Text><Text className="mt-1 text-base font-black text-ui-text dark:text-ui-dark-text">{stop.destination.name}</Text><Text className="mt-1 text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{stop.travelMinutes} min {isSpanish ? 'de traslado' : 'travel'} · {Math.round(stop.visitMinutes / 60 * 10) / 10} h {isSpanish ? 'en el destino' : 'at the destination'} · {stop.estimatedCostCrc == null ? (isSpanish ? 'precio por confirmar' : 'price to confirm') : formatCrc(stop.estimatedCostCrc)}</Text><Text className="mt-1 text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{stop.destination.schedule ? `${isSpanish ? 'Horario' : 'Hours'}: ${stop.destination.schedule}` : (isSpanish ? 'Horario por confirmar' : 'Hours to confirm')}{stop.destination.closed_day ? ` · ${isSpanish ? 'Cierre' : 'Closed'}: ${stop.destination.closed_day}` : ''}</Text><View className="mt-2 flex-row flex-wrap gap-3"><Pressable accessibilityRole="button" className="min-h-11 flex-row items-center" onPress={() => void openNavigation(stop.destination.latitude, stop.destination.longitude)}><MaterialCommunityIcons name="navigation-variant-outline" size={18} color="#0077A8" /><Text className="ml-2 font-black text-caribbean-700 dark:text-caribbean-100">{isSpanish ? 'Abrir navegación' : 'Open navigation'}</Text></Pressable>{stop.destination.requires_sinac_booking && stop.destination.sinac_booking_url ? <Pressable accessibilityRole="link" className="min-h-11 flex-row items-center" onPress={() => void Linking.openURL(stop.destination.sinac_booking_url!)}><MaterialCommunityIcons name="ticket-confirmation-outline" size={18} color="#087443" /><Text className="ml-2 font-black text-ui-primary dark:text-ui-dark-primary">{isSpanish ? 'Reservar entrada' : 'Book admission'}</Text></Pressable> : null}</View><View className="mt-1 flex-row flex-wrap gap-1"><Pressable accessibilityLabel={isSpanish ? 'Subir parada' : 'Move stop up'} disabled={busy || index === 0} className="h-11 w-11 items-center justify-center disabled:opacity-30" onPress={() => moveStop(index, -1)}><MaterialCommunityIcons name="arrow-up" size={20} color="#087443" /></Pressable><Pressable accessibilityLabel={isSpanish ? 'Bajar parada' : 'Move stop down'} disabled={busy || index === plan.stops.length - 1} className="h-11 w-11 items-center justify-center disabled:opacity-30" onPress={() => moveStop(index, 1)}><MaterialCommunityIcons name="arrow-down" size={20} color="#087443" /></Pressable><Pressable accessibilityRole="button" disabled={busy} className="min-h-11 flex-row items-center px-2 disabled:opacity-30" onPress={() => void replaceStop(index)}><MaterialCommunityIcons name="swap-horizontal" size={20} color="#0077A8" /><Text className="ml-1 font-bold text-caribbean-700 dark:text-caribbean-100">{isSpanish ? 'Cambiar' : 'Replace'}</Text></Pressable><Pressable accessibilityRole="button" disabled={busy || plan.stops.length === 1} className="min-h-11 flex-row items-center px-2 disabled:opacity-30" onPress={() => void updateStops(plan.stops.filter((_, stopIndex) => stopIndex !== index))}><MaterialCommunityIcons name="close" size={20} color="#C33B3B" /><Text className="ml-1 font-bold text-red-700 dark:text-red-300">{isSpanish ? 'Quitar' : 'Remove'}</Text></Pressable></View></View>)}</View>
        <View className="mt-5 flex-row gap-3"><PrimaryButton className="flex-1" onPress={() => void savePlan()}>{savedAt ? (isSpanish ? 'Guardado sin conexión' : 'Saved offline') : (isSpanish ? 'Guardar sin conexión' : 'Save offline')}</PrimaryButton><Pressable accessibilityRole="button" className="min-h-12 min-w-12 items-center justify-center rounded-control border border-ui-primary" onPress={() => void sharePlan()}><MaterialCommunityIcons name="share-variant-outline" size={23} color="#087443" /></Pressable></View>
        <TextInput accessibilityLabel={isSpanish ? 'Notas y comprobantes de reserva' : 'Reservation notes and confirmations'} className="mt-4 min-h-24 rounded-control border border-ui-border bg-ui-muted p-4 text-ui-text dark:border-ui-dark-border dark:bg-ui-dark-muted dark:text-ui-dark-text" multiline onChangeText={setNotes} placeholder={isSpanish ? 'Notas, números de confirmación, parqueo o pendientes…' : 'Notes, confirmation numbers, parking, or to-dos…'} placeholderTextColor="#73807b" textAlignVertical="top" value={notes} />
        {savedAt ? <Text className="mt-2 text-center text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'Disponible sin conexión desde' : 'Available offline since'} {new Date(savedAt).toLocaleString(isSpanish ? 'es-CR' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}</Text> : null}
      </AppCard> : null}

      {savedTrips.length ? <AppCard className="p-5"><Text className="text-xl font-black text-ui-text dark:text-ui-dark-text">{isSpanish ? 'Mis viajes guardados' : 'My saved trips'}</Text><Text className="mt-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'Abrilos o duplicalos incluso sin señal.' : 'Open or duplicate them even offline.'}</Text><View className="mt-3 gap-2">{savedTrips.map((trip) => <View className="flex-row items-center rounded-control bg-ui-muted p-3 dark:bg-ui-dark-muted" key={trip.id}><Pressable accessibilityRole="button" className="min-h-11 flex-1 justify-center" onPress={() => { setPlan(trip.plan); setLastInput(trip.input); setSavedAt(trip.savedAt); setNotes(trip.notes); }}><Text className="font-black text-ui-text dark:text-ui-dark-text">{trip.name}</Text><Text className="text-xs text-ui-text-muted dark:text-ui-dark-text-muted">{trip.plan.stops.length} {isSpanish ? 'paradas' : 'stops'}</Text></Pressable><Pressable accessibilityLabel={isSpanish ? 'Duplicar viaje' : 'Duplicate trip'} className="h-11 w-11 items-center justify-center" onPress={() => { setPlan(trip.plan); setLastInput(trip.input); setSavedAt(undefined); setNotes(trip.notes); }}><MaterialCommunityIcons name="content-copy" size={20} color="#087443" /></Pressable><Pressable accessibilityLabel={isSpanish ? 'Eliminar viaje guardado' : 'Delete saved trip'} className="h-11 w-11 items-center justify-center" onPress={() => void removeSavedTrip(trip.id)}><MaterialCommunityIcons name="delete-outline" size={21} color="#C33B3B" /></Pressable></View>)}</View></AppCard> : null}

    </View>
  </ScrollView><LocationPickerModal initialLocation={origin} language={language} onClose={() => setOriginPickerOpen(false)} onConfirm={(coordinate, label) => setOrigin({ ...coordinate, label: label || `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}` })} open={originPickerOpen} title={isSpanish ? 'Elegí el punto de salida' : 'Choose the starting point'} /></>;
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
