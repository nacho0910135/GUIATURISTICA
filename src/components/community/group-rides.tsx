import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { LocationPickerModal } from '@/components/location-picker-modal';
import { FrogLoader } from '@/components/frog-loader';
import { ThemedAlert } from '@/components/themed-alert';
import { RideDateFields } from './ride-date-fields';
import { haptic } from '@/lib/haptics';
import { openNavigation } from '@/lib/logistics';
import { addGroupRideComment, cancelGroupRide, createGroupRide, getGroupRides, setGroupRideAttendance, type GroupRide, type TravelerTopic } from '@/lib/travelers';

const RIDE_TOPICS = new Set(['moteros', 'enduro', 'convoy_4x4']);

function errorMessage(reason: unknown, fallback: string) {
  if (reason instanceof Error) return reason.message;
  if (reason && typeof reason === 'object' && 'message' in reason && typeof reason.message === 'string') return reason.message;
  return fallback;
}

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
  const [destinationName, setDestinationName] = useState('');
  const [startsAt, setStartsAt] = useState(initialRideDate);
  const [location, setLocation] = useState<{ latitude: number; longitude: number }>();
  const [destination, setDestination] = useState<{ latitude: number; longitude: number }>();
  const [picker, setPicker] = useState<'meeting' | 'destination'>();
  const [busy, setBusy] = useState(false);
  const [attendanceBusyId, setAttendanceBusyId] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => { setCreating(false); setError(undefined); }, [topic]);
  if (!enabled) return null;

  const publish = async () => {
    if (!userId || !requireAuth(language === 'es' ? 'programar una rodada' : 'schedule a ride')) return;
    if (!title.trim() || !placeName.trim() || !location || !destinationName.trim() || !destination) {
      setError(language === 'es' ? 'Completá el nombre y elegí el punto de reunión y el destino.' : 'Complete the name and choose the meeting point and destination.');
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await createGroupRide({ organizerId: userId, topic, title, placeName, latitude: location.latitude, longitude: location.longitude, destinationName, destinationLatitude: destination.latitude, destinationLongitude: destination.longitude, startsAt });
      setTitle(''); setPlaceName(''); setDestinationName(''); setStartsAt(initialRideDate()); setLocation(undefined); setDestination(undefined); setCreating(false);
      await rides.refetch();
      void haptic('success');
    } catch (reason) {
      setError(errorMessage(reason, language === 'es' ? 'No se pudo programar la rodada.' : 'Could not schedule the ride.'));
      void haptic('error');
    } finally { setBusy(false); }
  };

  const toggleAttendance = async (ride: GroupRide) => {
    if (ride.status === 'cancelled' || !userId || !requireAuth(language === 'es' ? 'confirmar asistencia' : 'confirm attendance') || attendanceBusyId) return;
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
      <RideDateFields language={language} onChange={setStartsAt} value={startsAt} />
      <Text className="mt-4 font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Ruta de la rodada' : 'Ride route'}</Text>
      <Pressable accessibilityRole="button" className="mt-3 min-h-16 flex-row items-center rounded-control border border-ui-border bg-ui-muted px-4 dark:border-ui-dark-border dark:bg-ui-dark-muted" onPress={() => setPicker('meeting')}><View className="h-9 w-9 items-center justify-center rounded-full bg-ui-primary"><MaterialCommunityIcons name="circle-outline" size={20} color="white" /></View><View className="ml-3 flex-1"><Text className="text-xs font-black uppercase tracking-wide text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Punto de reunión' : 'Meeting point'}</Text><Text className="mt-1 font-bold text-ui-text dark:text-ui-dark-text" numberOfLines={1}>{placeName || (language === 'es' ? 'Seleccionar ubicación' : 'Select location')}</Text></View><MaterialCommunityIcons name="chevron-right" size={24} color="#68737A" /></Pressable>
      <View className="ml-[33px] h-4 w-0.5 bg-ui-border dark:bg-ui-dark-border" />
      <Pressable accessibilityRole="button" className="min-h-16 flex-row items-center rounded-control border border-ui-border bg-ui-muted px-4 dark:border-ui-dark-border dark:bg-ui-dark-muted" onPress={() => setPicker('destination')}><View className="h-9 w-9 items-center justify-center rounded-full bg-ui-secondary"><MaterialCommunityIcons name="map-marker" size={21} color="white" /></View><View className="ml-3 flex-1"><Text className="text-xs font-black uppercase tracking-wide text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Destino' : 'Destination'}</Text><Text className="mt-1 font-bold text-ui-text dark:text-ui-dark-text" numberOfLines={1}>{destinationName || (language === 'es' ? 'Seleccionar ubicación' : 'Select location')}</Text></View><MaterialCommunityIcons name="chevron-right" size={24} color="#68737A" /></Pressable>
      <LocationPickerModal initialLocation={picker === 'meeting' ? location : destination} language={language} onClose={() => setPicker(undefined)} onConfirm={(coordinate, label) => { const fallback = `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`; if (picker === 'meeting') { setLocation(coordinate); setPlaceName(label || fallback); } else { setDestination(coordinate); setDestinationName(label || fallback); } }} open={Boolean(picker)} title={picker === 'meeting' ? (language === 'es' ? 'Punto de reunión' : 'Meeting point') : (language === 'es' ? 'Destino' : 'Destination')} />
      {error ? <Text accessibilityRole="alert" className="mt-3 rounded-control bg-red-50 p-3 font-bold text-ui-danger dark:bg-red-950 dark:text-ui-dark-danger">{error}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ busy, disabled: busy }} className="mt-4 min-h-12 items-center justify-center rounded-control bg-ui-primary px-4 disabled:opacity-50 dark:bg-ui-dark-primary" disabled={busy} onPress={() => void publish()}>{busy ? <FrogLoader color="white" /> : <Text className="font-black text-white">{language === 'es' ? 'Publicar rodada' : 'Publish ride'}</Text>}</Pressable>
    </View> : null}

    {!creating && error ? <Text accessibilityRole="alert" className="mt-3 rounded-control bg-red-50 p-3 font-bold text-ui-danger dark:bg-red-950 dark:text-ui-dark-danger">{error}</Text> : null}
    {rides.isPending ? <View className="mt-4 min-h-24 items-center justify-center"><FrogLoader color="#0B6B4F" /></View> : null}
    {rides.isError ? <Pressable accessibilityRole="button" className="mt-4 min-h-12 items-center justify-center rounded-control border border-ui-border" onPress={() => void rides.refetch()}><Text className="font-black text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Reintentar cargar rodadas' : 'Retry loading rides'}</Text></Pressable> : null}
    {!rides.isPending && !rides.isError && !rides.data?.length ? <View className="mt-4 rounded-card border border-dashed border-ui-border bg-ui-surface p-5 dark:border-ui-dark-border dark:bg-ui-dark-surface"><Text className="text-center font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Todavía no hay rodadas programadas en este grupo.' : 'There are no scheduled rides in this group yet.'}</Text></View> : null}
    {rides.data?.map((ride) => <RideCard attendanceBusy={attendanceBusyId === ride.id} attendanceLocked={Boolean(attendanceBusyId)} key={ride.id} language={language} onAttendance={() => void toggleAttendance(ride)} onChanged={() => void rides.refetch()} requireAuth={requireAuth} ride={ride} userId={userId} />)}
  </View>;
}

function RideCard({ attendanceBusy, attendanceLocked, language, onAttendance, onChanged, requireAuth, ride, userId }: { attendanceBusy: boolean; attendanceLocked: boolean; language: 'es' | 'en'; onAttendance: () => void; onChanged: () => void; requireAuth: (intent: string) => boolean; ride: GroupRide; userId?: string }) {
  const [comment, setComment] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [localError, setLocalError] = useState<string>();
  const cancelled = ride.status === 'cancelled';
  const isOrganizer = userId === ride.organizer_id;

  const submitComment = async () => {
    if (!userId || !requireAuth(language === 'es' ? 'comentar una rodada' : 'comment on a ride')) return;
    if (!comment.trim() || commentBusy) return;
    setCommentBusy(true); setLocalError(undefined);
    try {
      await addGroupRideComment(ride.id, userId, comment);
      setComment(''); onChanged(); void haptic('success');
    } catch (reason) {
      setLocalError(reason instanceof Error ? reason.message : (language === 'es' ? 'No se pudo publicar el comentario.' : 'The comment could not be posted.'));
    } finally { setCommentBusy(false); }
  };

  const confirmCancellation = () => ThemedAlert.alert(
    language === 'es' ? 'Cancelar rodada' : 'Cancel ride',
    language === 'es' ? 'La rodada quedará marcada como cancelada para todas las personas. Esta acción no se puede deshacer.' : 'The ride will be marked as cancelled for everyone. This action cannot be undone.',
    [{ text: language === 'es' ? 'Volver' : 'Go back', style: 'cancel' }, { text: language === 'es' ? 'Sí, cancelar' : 'Yes, cancel', style: 'destructive', onPress: async () => {
      if (!userId || cancelBusy) return;
      setCancelBusy(true); setLocalError(undefined);
      try { await cancelGroupRide(ride.id, userId); onChanged(); void haptic('success'); }
      catch (reason) { setLocalError(reason instanceof Error ? reason.message : (language === 'es' ? 'No se pudo cancelar la rodada.' : 'The ride could not be cancelled.')); }
      finally { setCancelBusy(false); }
    } }],
  );

  return <View className={`mt-4 overflow-hidden rounded-card border bg-ui-surface dark:bg-ui-dark-surface ${cancelled ? 'border-ui-danger dark:border-ui-dark-danger' : 'border-ui-border dark:border-ui-dark-border'}`}>
    {cancelled ? <View className="flex-row items-center bg-red-50 px-4 py-3 dark:bg-red-950"><MaterialCommunityIcons name="calendar-remove" size={20} color="#B42318" /><Text className="ml-2 font-black uppercase tracking-wide text-ui-danger dark:text-ui-dark-danger">{language === 'es' ? 'Rodada cancelada' : 'Cancelled ride'}</Text></View> : null}
    <View className="p-4">
      <View className="flex-row items-start"><View className="h-12 w-12 items-center justify-center rounded-control bg-ui-primary-soft dark:bg-ui-dark-primary-soft"><MaterialCommunityIcons name="calendar-star" size={25} color="#0B6B4F" /></View><View className="ml-3 flex-1"><Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{ride.title}</Text><Text className="mt-1 text-sm font-bold text-ui-secondary dark:text-ui-dark-secondary">{new Date(ride.starts_at).toLocaleString(language === 'es' ? 'es-CR' : 'en-US', { dateStyle: 'full', timeStyle: 'short' })}</Text><Text className="mt-2 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Organiza' : 'Organized by'}: <Text className="font-black">{organizerName(ride, language)}</Text></Text></View></View>

      <View className="mt-4 rounded-control bg-ui-muted p-4 dark:bg-ui-dark-muted">
        <View className="flex-row items-start"><View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-ui-primary"><MaterialCommunityIcons name="circle-outline" size={18} color="white" /></View><View className="ml-3 flex-1"><Text className="text-xs font-black uppercase tracking-wide text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Punto de reunión' : 'Meeting point'}</Text><Text className="mt-1 text-base font-black text-ui-text dark:text-ui-dark-text">{ride.place_name}</Text><Pressable accessibilityRole="link" className="mt-2 min-h-11 flex-row items-center self-start rounded-control bg-ui-secondary px-3" onPress={() => void openNavigation(ride.latitude, ride.longitude)}><MaterialCommunityIcons name="waze" size={20} color="white" /><Text className="ml-2 font-black text-white">{language === 'es' ? 'Cómo llegar con Waze' : 'Directions with Waze'}</Text></Pressable></View></View>
        <View className="ml-[15px] h-5 w-0.5 bg-ui-border dark:bg-ui-dark-border" />
        <View className="flex-row items-start"><View className="h-8 w-8 items-center justify-center rounded-full bg-ui-secondary"><MaterialCommunityIcons name="map-marker" size={19} color="white" /></View><View className="ml-3 flex-1"><Text className="text-xs font-black uppercase tracking-wide text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Destino' : 'Destination'}</Text><Text className="mt-1 text-base font-black text-ui-text dark:text-ui-dark-text">{ride.destination_name || (language === 'es' ? 'Destino no especificado' : 'Destination not specified')}</Text></View></View>
      </View>

      <View className="mt-4 flex-row flex-wrap items-center justify-between gap-3 border-t border-ui-border pt-4 dark:border-ui-dark-border"><View className="flex-row items-center"><MaterialCommunityIcons name="account-group" size={22} color="#0B6B4F" /><Text className="ml-2 font-black text-ui-text dark:text-ui-dark-text">{ride.attendee_count} {language === 'es' ? (ride.attendee_count === 1 ? 'persona asistirá' : 'personas asistirán') : (ride.attendee_count === 1 ? 'person attending' : 'people attending')}</Text></View>{cancelled ? <Text className="font-black text-ui-danger dark:text-ui-dark-danger">{language === 'es' ? 'No admite nuevas confirmaciones' : 'No new confirmations'}</Text> : <Pressable accessibilityRole="checkbox" accessibilityState={{ busy: attendanceBusy, checked: ride.attending, disabled: attendanceLocked }} className={ride.attending ? 'min-h-11 flex-row items-center rounded-control bg-ui-primary px-4 dark:bg-ui-dark-primary' : 'min-h-11 flex-row items-center rounded-control border border-ui-primary bg-ui-primary-soft px-4 dark:border-ui-dark-primary dark:bg-ui-dark-primary-soft'} disabled={attendanceLocked} onPress={onAttendance}>{attendanceBusy ? <FrogLoader color={ride.attending ? 'white' : '#0B6B4F'} size="small" /> : <MaterialCommunityIcons name={ride.attending ? 'check-circle' : 'calendar-check'} size={19} color={ride.attending ? 'white' : '#0B6B4F'} />}<Text className={ride.attending ? 'ml-1 font-black text-white' : 'ml-1 font-black text-ui-primary dark:text-ui-dark-primary'}>{ride.attending ? (language === 'es' ? 'Asistiré' : 'Going') : (language === 'es' ? 'Confirmar asistencia' : 'I’m going')}</Text></Pressable>}</View>

      {isOrganizer && !cancelled ? <Pressable accessibilityRole="button" accessibilityState={{ busy: cancelBusy, disabled: cancelBusy }} className="mt-3 min-h-11 flex-row items-center justify-center rounded-control border border-ui-danger px-4 disabled:opacity-50 dark:border-ui-dark-danger" disabled={cancelBusy} onPress={confirmCancellation}>{cancelBusy ? <FrogLoader color="#B42318" size="small" /> : <MaterialCommunityIcons name="calendar-remove-outline" size={20} color="#B42318" />}<Text className="ml-2 font-black text-ui-danger dark:text-ui-dark-danger">{language === 'es' ? 'Cancelar esta rodada' : 'Cancel this ride'}</Text></Pressable> : null}

      <View className="mt-5 border-t border-ui-border pt-4 dark:border-ui-dark-border"><View className="flex-row items-center"><MaterialCommunityIcons name="comment-text-multiple-outline" size={21} color="#0B6B4F" /><Text className="ml-2 text-base font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? `Comentarios (${ride.comments.length})` : `Comments (${ride.comments.length})`}</Text></View>
        {ride.comments.length ? <View className="mt-3 gap-3">{ride.comments.map((item) => <View className="rounded-control bg-ui-muted p-3 dark:bg-ui-dark-muted" key={item.id}><Text className="text-xs font-black text-ui-primary dark:text-ui-dark-primary">{item.user?.username || item.user?.full_name || (language === 'es' ? 'Viajero' : 'Traveler')} · {new Date(item.created_at).toLocaleDateString(language === 'es' ? 'es-CR' : 'en-US')}</Text><Text className="mt-1 leading-5 text-ui-text dark:text-ui-dark-text">{item.body}</Text></View>)}</View> : <Text className="mt-2 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Todavía no hay preguntas. Sé la primera persona en comentar.' : 'There are no questions yet. Be the first to comment.'}</Text>}
        <TextInput accessibilityLabel={language === 'es' ? 'Comentario sobre la rodada' : 'Ride comment'} className="mt-3 min-h-20 rounded-control border border-ui-border bg-ui-muted px-4 py-3 text-ui-text dark:border-ui-dark-border dark:bg-ui-dark-muted dark:text-ui-dark-text" editable={!commentBusy} maxLength={1000} multiline onChangeText={setComment} placeholder={language === 'es' ? 'Escribí una duda o comentario…' : 'Write a question or comment…'} placeholderTextColor="#68737A" textAlignVertical="top" value={comment} />
        {localError ? <Text accessibilityRole="alert" className="mt-2 font-bold text-ui-danger dark:text-ui-dark-danger">{localError}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityState={{ busy: commentBusy, disabled: commentBusy || !comment.trim() }} className="mt-3 min-h-11 flex-row items-center justify-center rounded-control bg-ui-primary px-4 disabled:opacity-50 dark:bg-ui-dark-primary" disabled={commentBusy || !comment.trim()} onPress={() => void submitComment()}>{commentBusy ? <FrogLoader color="white" size="small" /> : <MaterialCommunityIcons name="send" size={18} color="white" />}<Text className="ml-2 font-black text-white">{language === 'es' ? 'Publicar comentario' : 'Post comment'}</Text></Pressable>
      </View>
    </View>
  </View>;
}
