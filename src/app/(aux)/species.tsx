import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { ThemedNotice } from '@/components/themed-notice';
import { getFaunaPhotos, getFaunaSpecies, getVulnerabilityLabel, type FaunaPhoto, type FaunaSpecies, uploadFaunaPhoto } from '@/lib/fauna';
import { useApp } from '@/providers/app-provider';

export default function SpeciesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { language, requireAuth, session } = useApp();
  const [species, setSpecies] = useState<FaunaSpecies>();
  const [photos, setPhotos] = useState<FaunaPhoto[]>([]);
  const [busy, setBusy] = useState<'camera' | 'library'>();
  const [error, setError] = useState<string>();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>();
  const [photoPublished, setPhotoPublished] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    Promise.all([
      getFaunaSpecies(id),
      getFaunaPhotos(id),
    ]).then(([nextSpecies, nextPhotos]) => {
      if (!active) return;
      setSpecies(nextSpecies);
      setPhotos(nextPhotos);
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : 'No se pudo cargar la especie.');
    });
    return () => { active = false; };
  }, [id]);

  const choosePhoto = async (source: 'camera' | 'library') => {
    if (!species || !requireAuth(language === 'es' ? 'Compartir foto de fauna' : 'Share wildlife photo') || !session) return;
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Fauna CR', language === 'es' ? 'Se necesita permiso para usar la cámara.' : 'Camera permission is required.');
        return;
      }
    }
    setBusy(source);
    try {
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 1, exif: false })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 1, exif: false });
      if (result.canceled || !result.assets[0]) return;
      await uploadFaunaPhoto(species.id, session.user.id, result.assets[0]);
      setPhotos(await getFaunaPhotos(species.id));
      setPhotoPublished(true);
    } catch (reason) {
      Alert.alert('Fauna CR', reason instanceof Error ? reason.message : 'No se pudo subir la foto.');
    } finally {
      setBusy(undefined);
    }
  };

  if (!species && !error) {
    return <View className="flex-1 items-center justify-center bg-mint-50 dark:bg-forest-950"><ActivityIndicator color="#13a95b" size="large" /></View>;
  }

  if (!species) {
    return (
      <View className="flex-1 items-center justify-center bg-mint-50 px-6 dark:bg-forest-950">
        <Text className="text-center font-bold text-coral-600">{error}</Text>
        <Pressable className="mt-5 rounded-2xl bg-forest-900 px-5 py-3" onPress={() => router.back()}><Text className="font-bold text-white">{language === 'es' ? 'Volver' : 'Back'}</Text></Pressable>
      </View>
    );
  }

  const name = language === 'es' ? species.common_name_es : species.common_name_en;
  const description = language === 'es' ? species.description : species.description_en;
  const habitat = language === 'es' ? species.habitat : species.habitat_en;

  return (
    <ScrollView className="flex-1 bg-mint-50 dark:bg-forest-950" contentContainerStyle={{ paddingBottom: 44 }} showsVerticalScrollIndicator={false}>
      <View className="relative h-80 bg-forest-900">
        {species.image_url ? <Image source={{ uri: species.image_url }} contentFit="cover" style={{ height: '100%', width: '100%' }} transition={180} /> : null}
        <View className="absolute inset-0 bg-black/25" />
        <Pressable accessibilityLabel={language === 'es' ? 'Volver' : 'Back'} className="absolute left-5 top-6 h-12 w-12 items-center justify-center rounded-full bg-forest-950/80" onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={25} color="white" />
        </Pressable>
        <View className="absolute bottom-0 left-0 right-0 px-5 pb-6">
          <View className="self-start rounded-full bg-frog-500 px-3 py-1.5"><Text className="text-xs font-black uppercase tracking-wider text-white">{species.category}</Text></View>
          <Text className="mt-3 text-3xl font-black leading-9 text-white">{name}</Text>
          <Text className="mt-1 italic text-mint-100">{species.scientific_name}</Text>
        </View>
      </View>

      {photos.length ? <View className="px-5 pt-6"><Text className="text-xl font-black text-forest-950 dark:text-white">{language === 'es' ? 'Fotos compartidas por nuestros usuarios' : 'Photos shared by our users'}</Text><ScrollView horizontal className="mt-4" contentContainerStyle={{ gap: 12 }} showsHorizontalScrollIndicator={false}>{photos.map((photo, index) => <Pressable accessibilityLabel={language === 'es' ? `Abrir foto ${index + 1} de ${name}` : `Open photo ${index + 1} of ${name}`} key={photo.id} onPress={() => setSelectedPhotoIndex(index)}><Image contentFit="cover" source={{ uri: photo.image_url }} style={{ borderRadius: 16, height: 140, width: 180 }} transition={180} /></Pressable>)}</ScrollView></View> : null}

      <View className="px-5 pt-6">
        <View className="flex-row items-center justify-between rounded-3xl bg-white p-5 dark:bg-forest-900">
          <View className="flex-1">
            <Text className="text-xs font-black uppercase tracking-wider text-forest-500 dark:text-mint-300">{language === 'es' ? 'Estado de conservación' : 'Conservation status'}</Text>
            <Text className="mt-2 text-lg font-black text-forest-950 dark:text-white">{getVulnerabilityLabel(species.vulnerability_status, language)}</Text>
          </View>
          <MaterialCommunityIcons name={species.location_protected ? 'shield-lock' : 'shield-check'} size={34} color={species.location_protected ? '#ff5d52' : '#13a95b'} />
        </View>

        <Text className="mt-7 text-xl font-black text-forest-950 dark:text-white">{language === 'es' ? 'Acerca de esta especie' : 'About this species'}</Text>
        <Text className="mt-3 text-base leading-7 text-forest-700 dark:text-mint-200">{description}</Text>
        <View className="mt-5 flex-row rounded-3xl bg-frog-100 p-5 dark:bg-forest-900">
          <MaterialCommunityIcons name="forest" size={27} color="#087443" />
          <View className="ml-4 flex-1">
            <Text className="font-black text-forest-950 dark:text-white">{language === 'es' ? 'Hábitat' : 'Habitat'}</Text>
            <Text className="mt-1 text-sm leading-5 text-forest-600 dark:text-mint-200">{habitat}</Text>
          </View>
        </View>

        <View className={`mt-5 overflow-hidden rounded-3xl border p-5 ${species.location_protected ? 'border-coral-200 bg-coral-50 dark:border-coral-500/40 dark:bg-forest-900' : 'border-mint-200 bg-white dark:border-forest-700 dark:bg-forest-900'}`}>
          <View className="flex-row items-center">
            <View className={`h-16 w-16 items-center justify-center rounded-full ${species.location_protected ? 'bg-coral-200/60' : 'bg-frog-100 dark:bg-forest-700'}`}>
              <View className={`h-10 w-10 items-center justify-center rounded-full ${species.location_protected ? 'bg-coral-500/30' : 'bg-frog-300'}`}>
                <MaterialCommunityIcons name={species.location_protected ? 'map-marker-off' : 'map-marker-radius'} size={24} color={species.location_protected ? '#d94c43' : '#087443'} />
              </View>
            </View>
            <View className="ml-4 flex-1">
              <Text className="font-black text-forest-950 dark:text-white">{species.location_protected ? (language === 'es' ? 'Ubicación protegida' : 'Protected location') : (language === 'es' ? 'Distribución aproximada' : 'Approximate range')}</Text>
              <Text className="mt-1 text-sm leading-5 text-forest-600 dark:text-mint-200">
                {species.location_protected
                  ? (language === 'es' ? `Sólo se muestra ${species.province ?? 'la provincia'}; nunca coordenadas exactas.` : `Only ${species.province ?? 'the province'} is shown; never exact coordinates.`)
                  : `${species.province ?? 'Costa Rica'} · ${language === 'es' ? 'referencia regional' : 'regional reference'}`}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-8">
          <Text className="text-xl font-black text-forest-950 dark:text-white">{language === 'es' ? 'Compartí tu foto' : 'Share your photo'}</Text>
          <Text className="mt-2 text-sm leading-5 text-forest-500 dark:text-mint-300">{language === 'es' ? 'La imagen se optimiza y elimina metadatos antes de publicarse.' : 'The image is optimized and metadata is removed before publishing.'}</Text>
          <View className="mt-4 flex-row gap-3">
            <PhotoButton busy={busy === 'camera'} icon="camera" label={language === 'es' ? 'Cámara' : 'Camera'} onPress={() => void choosePhoto('camera')} />
            <PhotoButton busy={busy === 'library'} icon="image-multiple" label={language === 'es' ? 'Galería' : 'Library'} onPress={() => void choosePhoto('library')} />
          </View>
        </View>

      </View>

      <ThemedNotice button={language === 'es' ? 'Entendido' : 'Got it'} message={language === 'es' ? `Tu foto de ${name} ya está disponible para la comunidad.` : `Your ${name} photo is now available to the community.`} onClose={() => setPhotoPublished(false)} title={language === 'es' ? '¡Foto compartida!' : 'Photo shared!'} visible={photoPublished} />

      <Modal animationType="fade" onRequestClose={() => setSelectedPhotoIndex(undefined)} statusBarTranslucent visible={selectedPhotoIndex !== undefined}>
        <View className="flex-1 bg-black">
          <ScrollView contentOffset={{ x: (selectedPhotoIndex ?? 0) * width, y: 0 }} horizontal key={selectedPhotoIndex} pagingEnabled showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>{photos.map((photo, index) => <View className="flex-1 items-center justify-center" key={photo.id} style={{ width }}><Image accessibilityLabel={language === 'es' ? `Foto ${index + 1} de ${name}` : `Photo ${index + 1} of ${name}`} contentFit="contain" source={{ uri: photo.image_url }} style={{ height: '100%', width: '100%' }} /></View>)}</ScrollView>
          <Pressable accessibilityLabel={language === 'es' ? 'Cerrar foto' : 'Close photo'} className="absolute right-5 top-12 h-12 w-12 items-center justify-center rounded-full bg-black/70" onPress={() => setSelectedPhotoIndex(undefined)}><MaterialCommunityIcons name="close" size={28} color="white" /></Pressable>
        </View>
      </Modal>
    </ScrollView>
  );
}

function PhotoButton({ busy, icon, label, onPress }: { busy: boolean; icon: 'camera' | 'image-multiple'; label: string; onPress: () => void }) {
  return (
    <Pressable className="flex-1 flex-row items-center justify-center rounded-2xl border border-mint-200 bg-white px-4 py-4 dark:border-forest-700 dark:bg-forest-900" disabled={busy} onPress={onPress}>
      {busy ? <ActivityIndicator color="#13a95b" /> : <MaterialCommunityIcons name={icon} size={23} color="#087443" />}
      <Text className="ml-2 font-black text-forest-800 dark:text-white">{label}</Text>
    </Pressable>
  );
}
