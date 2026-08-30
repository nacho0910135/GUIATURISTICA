import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { AppCard, PrimaryButton } from '@/components/ui';
import { ferryRoutes, buildOfflineTripPlan, buildTripPlan, openNavigation, type PlannerPreference, type TripPlan, type TripVehicle } from '@/lib/logistics';
import { getOfflineTripPack, syncOfflineTripPack } from '../../lib/offline-trip-pack';
import { scheduleTripReminders } from '../../lib/trip-notifications';
import { useApp } from '@/providers/app-provider';

const PROVINCES = ['San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste', 'Puntarenas', 'Limón'];
const STYLES: PlannerPreference[] = ['Todo', 'Playa', 'Naturaleza', 'Cultura', 'Comida', 'Aventura'];

export default function MyTripScreen() {
  const { exchangeRate, language, userLocation } = useApp();
  const [time, setTime] = useState('8');
  const [timeUnit, setTimeUnit] = useState<'hours' | 'days'>('hours');
  const [budget, setBudget] = useState('25000');
  const [budgetCurrency, setBudgetCurrency] = useState<'CRC' | 'USD'>('CRC');
  const [vehicle, setVehicle] = useState<TripVehicle>('sedan');
  const [style, setStyle] = useState<PlannerPreference>('Todo');
  const [zone, setZone] = useState('San José');
  const [ferryId, setFerryId] = useState('');
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isSpanish = language === 'es';
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
    } catch (error) { setMessage(error instanceof Error && error.message === 'NATIVE_ONLY' ? (isSpanish ? 'Los recordatorios están disponibles en iOS o Android.' : 'Reminders are available on iOS or Android.') : (isSpanish ? 'Permití las notificaciones para activar los recordatorios.' : 'Allow notifications to enable reminders.')); }
    finally { setBusy(false); }
  };

  return <ScrollView className="flex-1 bg-ui-background dark:bg-ui-dark-background" contentContainerStyle={{ paddingBottom: 44 }} showsVerticalScrollIndicator={false}>
    <View className="border-b border-ui-border bg-ui-surface px-5 pb-6 pt-7 dark:border-ui-dark-border dark:bg-ui-dark-surface"><View className="flex-row items-center"><View className="h-14 w-14 items-center justify-center rounded-2xl bg-caribbean-50 dark:bg-caribbean-900"><MaterialCommunityIcons name="map-marker-path" size={31} color="#0077A8" /></View><View className="ml-4 flex-1"><Text className="text-3xl font-extrabold tracking-tight text-ui-text dark:text-ui-dark-text">{isSpanish ? 'Mi viaje' : 'My trip'}</Text><Text className="mt-1 text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'Plan para hoy, listo para seguir paso a paso.' : 'Your step-by-step plan for today.'}</Text></View></View></View>
    <View className="gap-5 px-5 pt-5">
      <AppCard><Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{isSpanish ? 'Plan para hoy' : 'Plan for today'}</Text><Text className="mt-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'Elegí tu tiempo, presupuesto y forma de viajar.' : 'Choose your time, budget, and way to travel.'}</Text>
        <Text className="mt-5 font-bold text-ui-text dark:text-ui-dark-text">{isSpanish ? 'Tiempo disponible' : 'Available time'}</Text><View className="mt-2 flex-row gap-2"><TextInput accessibilityLabel={isSpanish ? 'Tiempo disponible' : 'Available time'} className="flex-1 rounded-control bg-ui-muted px-4 py-3 text-ui-text dark:bg-ui-dark-muted dark:text-ui-dark-text" keyboardType="decimal-pad" onChangeText={setTime} value={time} /><Choice active={timeUnit === 'hours'} label={isSpanish ? 'Horas' : 'Hours'} onPress={() => setTimeUnit('hours')} /><Choice active={timeUnit === 'days'} label={isSpanish ? 'Días' : 'Days'} onPress={() => setTimeUnit('days')} /></View>{timeUnit === 'days' ? <Text className="mt-2 text-xs text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'Un día equivale a 8 horas de actividades.' : 'One day equals 8 activity hours.'}</Text> : null}
        <Text className="mt-5 font-bold text-ui-text dark:text-ui-dark-text">{isSpanish ? 'Presupuesto' : 'Budget'}</Text><View className="mt-2 flex-row gap-2"><TextInput accessibilityLabel={isSpanish ? 'Presupuesto' : 'Budget'} className="flex-1 rounded-control bg-ui-muted px-4 py-3 text-ui-text dark:bg-ui-dark-muted dark:text-ui-dark-text" keyboardType="decimal-pad" onChangeText={setBudget} value={budget} /><Choice active={budgetCurrency === 'CRC'} label="CRC" onPress={() => setBudgetCurrency('CRC')} /><Choice active={budgetCurrency === 'USD'} label="USD" onPress={() => setBudgetCurrency('USD')} /></View>
        <Text className="mt-5 font-bold text-ui-text dark:text-ui-dark-text">{isSpanish ? 'Vehículo' : 'Vehicle'}</Text><View className="mt-2 flex-row flex-wrap gap-2">{([['sedan', 'Sedán'], ['4x4', '4x4'], ['bus', 'Bus']] as const).map(([value, label]) => <Choice active={vehicle === value} key={value} label={label} onPress={() => setVehicle(value)} />)}</View>
        <Text className="mt-5 font-bold text-ui-text dark:text-ui-dark-text">{isSpanish ? 'Estilo de viaje' : 'Travel style'}</Text><View className="mt-2 flex-row flex-wrap gap-2">{STYLES.map((item) => <Choice active={style === item} key={item} label={item} onPress={() => setStyle(item)} />)}</View>
        <PrimaryButton className="mt-6" disabled={busy} onPress={() => void createPlan()}>{busy ? (isSpanish ? 'Preparando…' : 'Preparing…') : (isSpanish ? 'Generar ruta' : 'Generate route')}</PrimaryButton>
      </AppCard>

      {plan ? <AppCard><View className="flex-row items-center justify-between"><View><Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{isSpanish ? 'Tu ruta' : 'Your route'}</Text><Text className="mt-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{plan.stops.length} {isSpanish ? 'paradas ·' : 'stops ·'} {formatCrc(plan.estimatedTotalCrc)}</Text></View><MaterialCommunityIcons color="#0077A8" name="format-list-numbered" size={28} /></View>{plan.stops.map((stop) => <View className="mt-4 flex-row" key={stop.destination.id}><View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-caribbean-500"><Text className="font-black text-white">{stop.order}</Text></View><View className="flex-1 border-b border-ui-border pb-4 dark:border-ui-dark-border"><Text className="text-base font-black text-ui-text dark:text-ui-dark-text">{stop.destination.name}</Text><Text className="mt-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{new Date(stop.arrivalAt).toLocaleTimeString(isSpanish ? 'es-CR' : 'en-US', { hour: '2-digit', minute: '2-digit' })} · {stop.travelMinutes} min {isSpanish ? 'de traslado' : 'travel'} · {Math.round(stop.visitMinutes / 60 * 10) / 10} h</Text><Pressable accessibilityRole="button" className="mt-2 self-start" onPress={() => void openNavigation(stop.destination.latitude, stop.destination.longitude)}><Text className="font-black text-caribbean-700 dark:text-caribbean-100">{isSpanish ? 'Abrir navegación' : 'Open navigation'}</Text></Pressable></View></View>)}
        <Text className="mt-4 font-bold text-ui-text dark:text-ui-dark-text">{isSpanish ? 'Ferri (opcional)' : 'Ferry (optional)'}</Text><View className="mt-2 flex-row flex-wrap gap-2"><Choice active={!ferryId} label={isSpanish ? 'Sin ferri' : 'No ferry'} onPress={() => setFerryId('')} />{ferryRoutes.map((route) => <Choice active={ferryId === route.id} key={route.id} label={route.route} onPress={() => setFerryId(route.id)} />)}</View><PrimaryButton className="mt-5" disabled={busy} onPress={() => void reminders()}>{isSpanish ? 'Activar recordatorios' : 'Enable reminders'}</PrimaryButton>
      </AppCard> : null}

      <AppCard><Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{isSpanish ? 'Paquete offline' : 'Offline package'}</Text><Text className="mt-1 text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{isSpanish ? 'Guarda destinos, buses, ferris, emergencias y comercios de la zona.' : 'Stores the zone’s destinations, buses, ferries, emergency contacts, and businesses.'}</Text><View className="mt-4 flex-row flex-wrap gap-2">{PROVINCES.map((province) => <Choice active={zone === province} key={province} label={province} onPress={() => setZone(province)} />)}</View><PrimaryButton className="mt-5" disabled={busy} onPress={() => void download()}>{isSpanish ? `Descargar ${zone}` : `Download ${zone}`}</PrimaryButton></AppCard>
      {message ? <View className="rounded-xl bg-caribbean-50 p-4 dark:bg-caribbean-900/30"><Text className="font-semibold text-caribbean-700 dark:text-caribbean-100">{message}</Text></View> : null}
    </View>
  </ScrollView>;
}

function Choice({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} className={active ? 'rounded-full bg-caribbean-500 px-3 py-2' : 'rounded-full bg-ui-muted px-3 py-2 dark:bg-ui-dark-muted'} onPress={onPress}><Text className={active ? 'font-bold text-white' : 'font-bold text-ui-text dark:text-ui-dark-text'}>{label}</Text></Pressable>;
}
