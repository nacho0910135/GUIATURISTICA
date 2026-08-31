import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useIsFocused } from '@react-navigation/native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Modal, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { ThemedNotice } from '@/components/themed-notice';
import { addFaunaSpecies, getFaunaHome, getVulnerabilityLabel, markFaunaSeen, type FaunaSanctuary } from '@/lib/fauna';
import { useApp } from '@/providers/app-provider';
import { useAppTheme } from '@/theme/theme-provider';

type FaunaHome = Awaited<ReturnType<typeof getFaunaHome>>;

function SanctuaryImage({ active, sanctuary }: { active: boolean; sanctuary: FaunaSanctuary }) {
  const photos = [...new Set([sanctuary.cover_image_url, ...sanctuary.photos].filter((url): url is string => Boolean(url)))];
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
    if (!active || photos.length < 2) return undefined;
    const interval = setInterval(() => setIndex((current) => (current + 1) % photos.length), 2000);
    return () => clearInterval(interval);
  }, [active, sanctuary.id, photos.length]);
  const source = photos[index];
  return source ? <Image cachePolicy="memory-disk" contentFit="cover" source={{ uri: source }} style={{ height: 146, width: '100%' }} transition={250} /> : <View className="h-[146px] items-center justify-center bg-ui-muted dark:bg-ui-dark-muted"><MaterialCommunityIcons name="image-off-outline" size={30} color="#68737A" /></View>;
}

export default function FaunaScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { width } = useWindowDimensions();
  const { language, requireAuth, session } = useApp();
  const { colors } = useAppTheme();
  const userId = session?.user.id;
  const [home, setHome] = useState<FaunaHome>();
  const [error, setError] = useState<string>();
  const [markingId, setMarkingId] = useState<string>();
  const [seenNotice, setSeenNotice] = useState<string>();
  const [addedSpecies, setAddedSpecies] = useState<string>();
  const [proposalOpen, setProposalOpen] = useState(false);
  const columns = width >= 1200 ? 4 : width >= 700 ? 2 : 1;
  const leaveFauna = useCallback(() => {
    if (from === 'explore' || !router.canGoBack()) router.replace('/(tabs)/explore');
    else router.back();
  }, [from, router]);

  const load = useCallback(async () => {
    try {
      setError(undefined);
      setHome(await getFaunaHome(userId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo cargar Fauna CR.');
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { if (!home) void load(); }, [home, load]));
  useFocusEffect(useCallback(() => {
    if (Platform.OS !== 'android' || from !== 'explore') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      leaveFauna();
      return true;
    });
    return () => subscription.remove();
  }, [from, leaveFauna]));

  const markSeen = useCallback(async (speciesId: string) => {
    if (markingId) return;
    setMarkingId(speciesId);
    try {
      await markFaunaSeen(speciesId);
      const item = home?.species.find((species) => species.id === speciesId);
      setSeenNotice(language === 'es' ? item?.common_name_es : item?.common_name_en);
      setHome((current) => {
        if (!current) return current;
        const seenSpeciesIds = new Set(current.seenSpeciesIds);
        seenSpeciesIds.add(speciesId);
        return { ...current, seenSpeciesIds };
      });
    } catch (reason) {
      Alert.alert(
        language === 'es' ? 'No se pudo guardar' : 'Could not save',
        reason instanceof Error ? reason.message : (language === 'es' ? 'Intentá de nuevo.' : 'Please try again.'),
      );
    } finally {
      setMarkingId(undefined);
    }
  }, [home?.species, language, markingId]);

  return (
    <ScrollView className="flex-1 bg-ui-background dark:bg-ui-dark-background" contentContainerStyle={{ paddingBottom: 44 }} showsVerticalScrollIndicator={false}>
      <View className="border-b border-ui-border bg-ui-surface px-5 py-4 dark:border-ui-dark-border dark:bg-ui-dark-surface">
        <View className="flex-row items-center">
          <Pressable accessibilityLabel={language === 'es' ? 'Volver a Explorar' : 'Back to Explore'} accessibilityRole="button" className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-ui-muted dark:bg-ui-dark-muted" onPress={leaveFauna}>
            <MaterialCommunityIcons name="arrow-left" size={23} color={colors.text} />
          </Pressable>
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-ui-primary-soft dark:bg-ui-dark-primary-soft">
            <Text accessibilityLabel={language === 'es' ? 'Perezoso' : 'Sloth'} className="text-2xl">🦥</Text>
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-2xl font-extrabold tracking-tight text-ui-text dark:text-ui-dark-text">Fauna CR</Text>
            <Text className="text-xs leading-4 text-ui-text-muted dark:text-ui-dark-text-muted">
              {language === 'es' ? 'Conocé, observá y protegé nuestra biodiversidad.' : 'Discover, observe, and protect our biodiversity.'}
            </Text>
          </View>
        </View>
        <View className="mt-3 flex-row items-center rounded-card border border-ui-border bg-ui-primary-soft p-3 dark:border-ui-dark-border dark:bg-ui-dark-primary-soft">
          <MaterialCommunityIcons name="shield-lock-outline" size={20} color="#78dfa1" />
          <Text className="ml-2 flex-1 text-xs leading-4 text-ui-text dark:text-ui-dark-text">
            {language === 'es' ? 'Las ubicaciones sensibles se muestran sólo por provincia.' : 'Sensitive locations are shown only at province level.'}
          </Text>
        </View>
        <Pressable accessibilityRole="button" className="mt-3 flex-row items-center justify-center self-center rounded-control bg-ui-primary px-4 py-2.5 dark:bg-ui-dark-primary" onPress={() => { if (requireAuth(language === 'es' ? 'Agregar un animal' : 'Add an animal')) setProposalOpen(true); }}><MaterialCommunityIcons name="plus-circle-outline" size={18} color="white" /><Text className="ml-1.5 text-sm font-black text-white">{language === 'es' ? 'Agregar un animal' : 'Add an animal'}</Text></Pressable>
      </View>

      {!home && !error ? <ActivityIndicator className="mt-12" color="#13a95b" size="large" /> : null}
      {error ? (
        <View className="mx-5 mt-6 rounded-card border border-coral-200 bg-coral-50 p-5 dark:border-coral-500/40 dark:bg-ui-dark-surface">
          <Text className="font-bold text-coral-600">{error}</Text>
          <Pressable className="mt-4 self-start rounded-xl bg-coral-500 px-4 py-2" onPress={() => void load()}>
            <Text className="font-bold text-white">{language === 'es' ? 'Reintentar' : 'Retry'}</Text>
          </Pressable>
        </View>
      ) : null}

      {home ? <View className="px-5 pt-6">
        <View className="rounded-card border border-ui-border bg-ui-surface p-6 dark:border-ui-dark-border dark:bg-ui-dark-surface md:p-8">
          <View className="flex-row items-center justify-between"><View className="flex-1"><Text className="text-2xl font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Tu Life List de Costa Rica' : 'Your Costa Rica Life List'}</Text><Text className="mt-2 leading-6 text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? `Has registrado ${home.seenSpeciesIds.size} de ${home.species.length} especies del catálogo.` : `You have recorded ${home.seenSpeciesIds.size} of ${home.species.length} catalog species.`}</Text></View><View className="ml-4 rounded-control bg-ui-primary-soft px-5 py-4 dark:bg-ui-dark-primary-soft"><Text className="text-2xl font-black text-ui-primary dark:text-ui-dark-primary">{home.seenSpeciesIds.size} / {home.species.length}</Text></View></View>
          <View className="mt-5 h-2 overflow-hidden rounded-full bg-ui-muted dark:bg-ui-dark-muted"><View className="h-full rounded-full bg-ui-primary dark:bg-ui-dark-primary" style={{ width: `${home.species.length ? home.seenSpeciesIds.size / home.species.length * 100 : 0}%` }} /></View>
        </View>
        <View className="mt-5 flex-row flex-wrap gap-3">{home.species.map((item) => {
          const seen = home.seenSpeciesIds.has(item.id);
          const marking = markingId === item.id;
          return <View className={seen ? 'flex-row items-center rounded-card border-2 border-ui-primary bg-ui-primary-soft p-3 dark:border-ui-dark-primary dark:bg-ui-dark-primary-soft' : 'flex-row items-center rounded-card border border-ui-border bg-ui-surface p-3 dark:border-ui-dark-border dark:bg-ui-dark-surface'} key={item.id} style={{ width: columns === 1 ? '100%' : columns === 2 ? '49%' : '24%' }}>
            <Pressable accessibilityRole="button" className="min-w-0 flex-1 flex-row items-center" onPress={() => router.push({ pathname: '/(aux)/species', params: { id: item.id } })}>
              {item.image_url ? <Image source={{ uri: item.image_url }} contentFit="cover" style={{ borderRadius: 12, height: 56, width: 56 }} transition={180} /> : <View className="h-14 w-14 items-center justify-center rounded-xl bg-ui-muted dark:bg-ui-dark-muted"><MaterialCommunityIcons name="paw" size={26} color={colors.primary} /></View>}
              <View className="ml-3 min-w-0 flex-1">
                <Text className={seen ? 'font-bold text-ui-primary dark:text-ui-dark-primary' : 'font-bold text-ui-text dark:text-ui-dark-text'} numberOfLines={1}>{language === 'es' ? item.common_name_es : item.common_name_en}</Text>
                <Text className="mt-0.5 text-xs italic text-ui-text-muted dark:text-ui-dark-text-muted" numberOfLines={1}>{item.scientific_name}</Text>
                <Text className="mt-1 text-[9px] font-black uppercase text-ui-primary dark:text-ui-dark-primary" numberOfLines={1}>{item.is_national_symbol ? 'CR Símbolo' : item.tour_observable ? (language === 'es' ? 'Observable en tour' : 'Tour observable') : getVulnerabilityLabel(item.vulnerability_status, language)}</Text>
              </View>
            </Pressable>
            <View className="ml-2 gap-2">
              <Pressable
                accessibilityLabel={seen ? (language === 'es' ? `${item.common_name_es} ya está en tu colección` : `${item.common_name_en} is in your collection`) : (language === 'es' ? `Marcar ${item.common_name_es} como visto` : `Mark ${item.common_name_en} as seen`)}
                accessibilityRole="checkbox"
                accessibilityState={{ busy: marking, checked: seen, disabled: seen }}
                className={seen ? 'h-10 w-10 items-center justify-center rounded-full bg-ui-primary dark:bg-ui-dark-primary' : 'h-10 w-10 items-center justify-center rounded-full border-2 border-ui-primary bg-ui-primary-soft dark:border-ui-dark-primary dark:bg-ui-dark-primary-soft'}
                disabled={seen || Boolean(markingId)}
                hitSlop={6}
                onPress={() => void markSeen(item.id)}
              >
                {marking ? <ActivityIndicator color={colors.primary} size="small" /> : <MaterialCommunityIcons name={seen ? 'check' : 'plus'} size={22} color={seen ? 'white' : colors.primary} />}
              </Pressable>
              <Pressable accessibilityLabel={language === 'es' ? `Compartir foto de ${item.common_name_es}` : `Share a photo of ${item.common_name_en}`} accessibilityRole="button" className="h-10 w-10 items-center justify-center rounded-full bg-ui-muted dark:bg-ui-dark-muted" hitSlop={6} onPress={() => router.push({ pathname: '/(aux)/species', params: { id: item.id, share: '1' } })}>
                <MaterialCommunityIcons name="camera-plus-outline" size={20} color={colors.primary} />
              </Pressable>
            </View>
          </View>;
        })}</View>
      </View> : null}

      {home ? (
        <View className="mt-8">
          <View className="flex-row items-center px-5">
            <MaterialCommunityIcons name="hospital-building" size={25} color="#087443" />
            <Text className="ml-3 text-xl font-black text-ui-text dark:text-ui-dark-text">
              {language === 'es' ? 'Santuarios verificados' : 'Verified sanctuaries'}
            </Text>
          </View>
          <ScrollView horizontal className="mt-4" contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }} showsHorizontalScrollIndicator={false}>
            {home.sanctuaries.map((sanctuary) => (
              <View className="w-64 overflow-hidden rounded-card border border-ui-border bg-ui-surface dark:border-ui-dark-border dark:bg-ui-dark-surface" key={sanctuary.id}>
                <SanctuaryImage active={isFocused} sanctuary={sanctuary} />
                <View className="p-5">
                <View className="flex-row items-center">
                  <MaterialCommunityIcons name="check-decagram" size={22} color="#78dfa1" />
                  <Text className="ml-2 text-xs font-black uppercase tracking-wider text-frog-300">{language === 'es' ? 'Verificado' : 'Verified'}</Text>
                </View>
                <Text className="mt-4 text-lg font-bold text-ui-text dark:text-ui-dark-text">{sanctuary.name}</Text>
                <Text className="mt-2 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{sanctuary.location_name} · {sanctuary.province}</Text>
                <Text className="mt-3 text-sm leading-5 text-ui-text dark:text-ui-dark-text">{language === 'es' ? sanctuary.description_es : sanctuary.description_en}</Text>
                {sanctuary.photos.length > 1 ? <View className="mt-3 flex-row"><MaterialCommunityIcons name="image-multiple-outline" size={16} color="#087443" /><Text className="ml-1 text-xs font-bold text-ui-primary">{sanctuary.photos.length} {language === 'es' ? 'fotos libres' : 'free photos'}</Text></View> : null}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <ThemedNotice button={language === 'es' ? 'Entendido' : 'Got it'} message={language === 'es' ? `Añadiste ${seenNotice ?? 'este animal'} como avistado a tu colección.` : `You added ${seenNotice ?? 'this animal'} as a sighting to your collection.`} onClose={() => setSeenNotice(undefined)} title={language === 'es' ? '¡Nuevo avistamiento!' : 'New sighting!'} visible={Boolean(seenNotice)} />
      <ThemedNotice button={language === 'es' ? 'Entendido' : 'Got it'} message={language === 'es' ? `${addedSpecies ?? 'El animal'} ya está disponible para toda la comunidad.` : `${addedSpecies ?? 'The animal'} is now available to everyone.`} onClose={() => setAddedSpecies(undefined)} title={language === 'es' ? '¡Animal agregado!' : 'Animal added!'} visible={Boolean(addedSpecies)} />
      <FaunaProposalModal language={language} onClose={() => setProposalOpen(false)} onPublished={(name) => { setProposalOpen(false); setAddedSpecies(name); void load(); }} open={proposalOpen} userId={session?.user.id} />

    </ScrollView>
  );
}

function FaunaProposalModal({ language, onClose, onPublished, open, userId }: { language: 'es' | 'en'; onClose: () => void; onPublished: (name: string) => void; open: boolean; userId?: string }) {
  const [commonName, setCommonName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [habitat, setHabitat] = useState('');
  const [province, setProvince] = useState('');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset>();
  const [sending, setSending] = useState(false);
  const submit = async () => {
    if (!userId || commonName.trim().length < 2 || scientificName.trim().length < 3 || category.trim().length < 2) return Alert.alert('Fauna CR', language === 'es' ? 'Completá el nombre común, nombre científico y categoría.' : 'Complete the common name, scientific name, and category.');
    setSending(true);
    try {
      await addFaunaSpecies({ commonName, scientificName, category, description, habitat, province, userId, image });
      onPublished(commonName.trim());
      setCommonName(''); setScientificName(''); setCategory(''); setDescription(''); setHabitat(''); setProvince(''); setImage(undefined);
    } catch (reason) {
      Alert.alert('Fauna CR', reason instanceof Error ? reason.message : (language === 'es' ? 'No se pudo agregar el animal.' : 'Could not add the animal.'));
    } finally { setSending(false); }
  };
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Fauna CR', language === 'es' ? 'Permití el acceso a tus fotos para elegir una imagen.' : 'Allow photo access to choose an image.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.9, exif: false });
    if (!result.canceled) setImage(result.assets[0]);
  };
  const fields = [
    { label: language === 'es' ? 'Nombre común' : 'Common name', value: commonName, onChangeText: setCommonName, placeholder: language === 'es' ? 'Ej: Zorro gris' : 'Example: Gray fox' },
    { label: language === 'es' ? 'Nombre científico' : 'Scientific name', value: scientificName, onChangeText: setScientificName, placeholder: 'Ej: Urocyon cinereoargenteus' },
    { label: language === 'es' ? 'Categoría' : 'Category', value: category, onChangeText: setCategory, placeholder: language === 'es' ? 'Ej: Mamífero' : 'Example: Mammal' },
    { label: language === 'es' ? 'Provincia donde se observa' : 'Province where observed', value: province, onChangeText: setProvince, placeholder: language === 'es' ? 'Ej: Guanacaste' : 'Example: Guanacaste' },
    { label: language === 'es' ? 'Hábitat' : 'Habitat', value: habitat, onChangeText: setHabitat, placeholder: language === 'es' ? 'Bosque seco, humedal…' : 'Dry forest, wetland…' },
    { label: language === 'es' ? 'Descripción' : 'Description', value: description, onChangeText: setDescription, placeholder: language === 'es' ? 'Cómo reconocerlo…' : 'How to identify it…', multiline: true },
  ];
  return <Modal animationType="slide" onRequestClose={onClose} transparent visible={open}><View className="flex-1 items-center justify-center bg-black/60 p-4"><View className="max-h-[92%] w-full max-w-2xl overflow-hidden rounded-modal bg-ui-surface dark:bg-ui-dark-surface"><View className="flex-row items-center border-b border-ui-border p-5 dark:border-ui-dark-border"><MaterialCommunityIcons name="paw" size={27} color="#0B6B4F" /><Text className="ml-3 flex-1 text-xl font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Agregar un animal' : 'Add an animal'}</Text><Pressable accessibilityLabel={language === 'es' ? 'Cerrar' : 'Close'} accessibilityRole="button" onPress={onClose}><MaterialCommunityIcons name="close" size={26} color="#68737A" /></Pressable></View><ScrollView contentContainerStyle={{ gap: 15, padding: 20 }}>{fields.map((field) => <View key={field.label}><Text className="mb-2 font-black text-ui-text dark:text-ui-dark-text">{field.label}</Text><TextInput className="rounded-control border border-ui-border bg-ui-muted px-4 py-3 text-ui-text dark:border-ui-dark-border dark:bg-ui-dark-muted dark:text-ui-dark-text" multiline={field.multiline} onChangeText={field.onChangeText} placeholder={field.placeholder} placeholderTextColor="#68737A" style={field.multiline ? { minHeight: 90, textAlignVertical: 'top' } : undefined} value={field.value} /></View>)}<Pressable className="overflow-hidden rounded-control border border-dashed border-ui-border p-3 dark:border-ui-dark-border" onPress={() => void pickImage()}>{image ? <Image source={{ uri: image.uri }} contentFit="cover" style={{ borderRadius: 12, height: 170, width: '100%' }} /> : <View className="flex-row items-center justify-center py-4"><MaterialCommunityIcons name="image-plus" size={24} color="#0B6B4F" /><Text className="ml-2 font-black text-ui-primary">{language === 'es' ? 'Agregar foto del animal' : 'Add animal photo'}</Text></View>}</Pressable><View className="rounded-control bg-ui-primary-soft p-4 dark:bg-ui-dark-primary-soft"><Text className="text-sm font-bold leading-5 text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'El animal se publicará para todos. Después podrás abrir su ficha y compartir fotografías reales.' : 'The animal will be published for everyone. You can then open its profile and share real photos.'}</Text></View><Pressable className="items-center rounded-control bg-ui-primary p-4 dark:bg-ui-dark-primary" disabled={sending} onPress={() => void submit()}>{sending ? <ActivityIndicator color="white" /> : <Text className="font-black text-white">{language === 'es' ? 'Publicar para todos' : 'Publish for everyone'}</Text>}</Pressable></ScrollView></View></View></Modal>;
}
