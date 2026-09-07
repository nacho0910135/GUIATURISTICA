import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';

import { MapCanvas } from '@/components/explore/map-canvas';
import { FrogLoader } from '@/components/frog-loader';
import { RideDateFields } from './ride-date-fields';
import { haptic } from '@/lib/haptics';
import { createGroupRide, getGroupRides, setGroupRideAttendance, type GroupRide, type TravelerTopic } from '@/lib/travelers';

const RIDE_TOPICS = new Set(['moteros', 'enduro', 'convoy_4x4']);

function initialRideDate() {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  value.setHours(8, 0, 0, 0);
  return value;
}

function organizerName(ride: GroupRide, language: 'es' | 'en') {
  return ride.organizer?.username || ride.organizer?.full_name || `${language === 'es' ? 'Viajero' : 'Traveler'} ${ride.organizer_id.slice(0, 5)}`;
}

export function GroupRides({ language, topic, userId, requireAuth }: { language: 'es' | 'en'; topic: TravelerTopic; userId?: string; requireAuth: (intent: string) => boolean }) {
  const enabled = RIDE_TOPICS.has(topic);
  const rides = useQuery({ queryKey: ['group-rides', topic, userId], queryFn: () => getGroupRides(topic, userId), enabled });
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [startsAt, setStartsAt] = useState(initialRideDate);
  const [location, setLocation] = useState<{ latitude: number; longitude: number }>();
  const [busy, setBusy] = useState(false);
  const [attendanceBusyId, setAttendanceBusyId] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => { setCreating(false); setError(undefined); }, [topic]);
  if (!enabled) return null;

  const publish = async () => {
    if (!userId || !requireAuth(language === 'es' ? 'programar una rodada' : 'schedule a ride')) return;
    if (!title.trim() || !placeName.trim() || !location) {
      setError(language === 'es' ? 'Completá el nombre, punto de encuentro y elegí la ubicación en el mapa.' : 'Complete the name, meeting point, and choose the location on the map.');
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await createGroupRide({ organizerId: userId, topic, title, placeName, latitude: location.latitude, longitude: location.longitude, startsAt });
      setTitle(''); setPlaceName(''); setStartsAt(initialRideDate()); setLocation(undefined); setCreating(false);
      await rides.refetch();
      void haptic('success');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : (language === 'es' ? 'No se pudo programar la rodada.' : 'Could not schedule the ride.'));
      void haptic('error');
    } finally { setBusy(false); }
  };

  const toggleAttendance = async (ride: GroupRide) => {
    if (!userId || !requireAuth(language === 'es' ? 'confirmar asistencia' : 'confirm attendance') || attendanceBusyId) return;
    setAttendanceBusyId(ride.id);
    setError(undefined);
    try {
      await setGroupRideAttendance(ride.id, userId, !ride.attending);
      await rides.refetch();
      void haptic('success');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : (language === 'es' ? 'No se pudo actualizar tu asistencia.' : 'Could not update your attendance.'));
    } finally { setAttendanceBusyId(undefined); }
  };

  return <View className="mb-5">
    <View className="flex-row items-center justify-between">
      <View className="flex-1"><Text className="text-xl font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Próximas rodadas' : 'Upcoming rides'}</Text><Text className="mt-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Coordiná el punto de encuentro con tu grupo.' : 'Coordinate a meeting point with your group.'}</Text></View>
      <Pressable accessibilityRole="button" className="ml-3 min-h-11 flex-row items-center rounded-control bg-ui-primary px-3 dark:bg-ui-dark-primary" onPress={() => { if (requireAuth(language === 'es' ? 'programar una rodada' : 'schedule a ride')) { setCreating((value) => !value); setError(undefined); } }}><MaterialCommunityIcons name={creating ? 'close' : 'calendar-plus'} size={19} color="white" /><Text className="ml-1 font-black text-white">{creating ? (language === 'es' ? 'Cerrar' : 'Close') : (language === 'es' ? 'Programar' : 'Schedule')}</Text></Pressable>
    </View>

    {creating ? <View className="mt-4 rounded-card border border-ui-primary bg-ui-surface p-4 dark:border-ui-dark-primary dark:bg-ui-dark-surface">
      <Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Nueva rodada' : 'New ride'}</Text>
      <TextInput accessibilityLabel={language === 'es' ? 'Nombre de la rodada' : 'Ride name'} className="mt-4 min-h-12 rounded-control border border-ui-border bg-ui-muted px-4 text-ui-text dark:border-ui-dark-border dark:bg-ui-dark-muted dark:text-ui-dark-text" maxLength={100} onChangeText={setTitle} placeholder={language === 'es' ? 'Ej: Ruta al volcán' : 'Example: Volcano route'} placeholderTextColor="#68737A" value={title} />
      <TextInput accessibilityLabel={language === 'es' ? 'Nombre del punto de encuentro' : 'Meeting point name'} className="mt-3 min-h-12 rounded-control border border-ui-border bg-ui-muted px-4 text-ui-text dark:border-ui-dark-border dark:bg-ui-dark-muted dark:text-ui-dark-text" maxLength={160} onChangeText={setPlaceName} placeholder={language === 'es' ? 'Ej: Parque de La Fortuna' : 'Example: La Fortuna Park'} placeholderTextColor="#68737A" value={placeName} />
      <RideDateFields language={language} onChange={setStartsAt} value={startsAt} />
      <Text className="mt-4 font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Ubicación del punto de encuentro' : 'Meeting point location'}</Text>
      <Text className="mb-3 mt-1 text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Navegá por el mapa y tocá el lugar donde iniciará la rodada.' : 'Navigate the map and tap where the ride will start.'}</Text>
      <View className="overflow-hidden rounded-card"><MapCanvas onLocationPick={setLocation} selectedLocation={location} /></View>
      <Text accessibilityRole={location ? 'text' : 'alert'} className="mt-2 text-center text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : (language === 'es' ? 'Tocá el mapa para elegir la ubicación.' : 'Tap the map to choose the location.')}</Text>
      {error ? <Text accessibilityRole="alert" className="mt-3 rounded-control bg-red-50 p-3 font-bold text-ui-danger dark:bg-red-950 dark:text-ui-dark-danger">{error}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ busy, disabled: busy }} className="mt-4 min-h-12 items-center justify-center rounded-control bg-ui-primary px-4 disabled:opacity-50 dark:bg-ui-dark-primary" disabled={busy} onPress={() => void publish()}>{busy ? <FrogLoader color="white" /> : <Text className="font-black text-white">{language === 'es' ? 'Publicar rodada' : 'Publish ride'}</Text>}</Pressable>
    </View> : null}

    {!creating && error ? <Text accessibilityRole="alert" className="mt-3 rounded-control bg-red-50 p-3 font-bold text-ui-danger dark:bg-red-950 dark:text-ui-dark-danger">{error}</Text> : null}
    {rides.isPending ? <View className="mt-4 min-h-24 items-center justify-center"><FrogLoader color="#0B6B4F" /></View> : null}
    {rides.isError ? <Pressable accessibilityRole="button" className="mt-4 min-h-12 items-center justify-center rounded-control border border-ui-border" onPress={() => void rides.refetch()}><Text className="font-black text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Reintentar cargar rodadas' : 'Retry loading rides'}</Text></Pressable> : null}
    {!rides.isPending && !rides.isError && !rides.data?.length ? <View className="mt-4 rounded-card border border-dashed border-ui-border bg-ui-surface p-5 dark:border-ui-dark-border dark:bg-ui-dark-surface"><Text className="text-center font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Todavía no hay rodadas programadas en este grupo.' : 'There are no scheduled rides in this group yet.'}</Text></View> : null}
    {rides.data?.map((ride) => <View className="mt-4 overflow-hidden rounded-card border border-ui-border bg-ui-surface dark:border-ui-dark-border dark:bg-ui-dark-surface" key={ride.id}>
      <View className="border-l-4 border-ui-secondary p-4">
        <View className="flex-row items-start"><View className="h-12 w-12 items-center justify-center rounded-control bg-ui-primary-soft dark:bg-ui-dark-primary-soft"><MaterialCommunityIcons name="calendar-star" size={25} color="#0B6B4F" /></View><View className="ml-3 flex-1"><Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{ride.title}</Text><Text className="mt-1 text-sm font-bold text-ui-secondary dark:text-ui-dark-secondary">{new Date(ride.starts_at).toLocaleString(language === 'es' ? 'es-CR' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}</Text></View></View>
        <View className="mt-4 gap-2"><View className="flex-row items-center"><MaterialCommunityIcons name="account-star-outline" size={20} color="#68737A" /><Text className="ml-2 flex-1 text-sm text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Organiza' : 'Organized by'}: <Text className="font-black">{organizerName(ride, language)}</Text></Text></View><Pressable accessibilityRole="link" className="min-h-11 flex-row items-center" onPress={() => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${ride.latitude},${ride.longitude}`)}><MaterialCommunityIcons name="map-marker-radius" size={20} color="#0077A8" /><View className="ml-2 flex-1"><Text className="font-black text-ui-text dark:text-ui-dark-text">{ride.place_name}</Text><Text className="text-xs text-ui-text-muted dark:text-ui-dark-text-muted">GPS: {ride.latitude.toFixed(6)}, {ride.longitude.toFixed(6)}</Text></View><MaterialCommunityIcons name="open-in-new" size={18} color="#0077A8" /></Pressable></View>
        <View className="mt-4 flex-row items-center justify-between border-t border-ui-border pt-3 dark:border-ui-dark-border"><View className="flex-row items-center"><MaterialCommunityIcons name="account-group" size={22} color="#0B6B4F" /><Text className="ml-2 font-black text-ui-text dark:text-ui-dark-text">{ride.attendee_count} {language === 'es' ? (ride.attendee_count === 1 ? 'persona asistirá' : 'personas asistirán') : (ride.attendee_count === 1 ? 'person attending' : 'people attending')}</Text></View><Pressable accessibilityRole="checkbox" accessibilityState={{ busy: attendanceBusyId === ride.id, checked: ride.attending, disabled: Boolean(attendanceBusyId) }} className={ride.attending ? 'ml-3 min-h-11 flex-row items-center rounded-control bg-ui-primary px-4 dark:bg-ui-dark-primary' : 'ml-3 min-h-11 flex-row items-center rounded-control border border-ui-primary bg-ui-primary-soft px-4 dark:border-ui-dark-primary dark:bg-ui-dark-primary-soft'} disabled={Boolean(attendanceBusyId)} onPress={() => void toggleAttendance(ride)}>{attendanceBusyId === ride.id ? <FrogLoader color={ride.attending ? 'white' : '#0B6B4F'} size="small" /> : <MaterialCommunityIcons name={ride.attending ? 'check-circle' : 'calendar-check'} size={19} color={ride.attending ? 'white' : '#0B6B4F'} />}<Text className={ride.attending ? 'ml-1 font-black text-white' : 'ml-1 font-black text-ui-primary dark:text-ui-dark-primary'}>{ride.attending ? (language === 'es' ? 'Asistiré' : 'Going') : (language === 'es' ? 'Asistiré' : 'I’m going')}</Text></Pressable></View>
      </View>
    </View>)}
  </View>;
}
