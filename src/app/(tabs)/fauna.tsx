import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { getFaunaHome, getVulnerabilityLabel, markFaunaSeen } from '@/lib/fauna';
import { useApp } from '@/providers/app-provider';
import { useAppTheme } from '@/theme/theme-provider';

type FaunaHome = Awaited<ReturnType<typeof getFaunaHome>>;

export default function FaunaScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { language, session } = useApp();
  const { colors } = useAppTheme();
  const userId = session?.user.id;
  const [home, setHome] = useState<FaunaHome>();
  const [error, setError] = useState<string>();
  const [markingId, setMarkingId] = useState<string>();
  const columns = width >= 1200 ? 4 : width >= 700 ? 2 : 1;

  const load = useCallback(async () => {
    try {
      setError(undefined);
      setHome(await getFaunaHome(userId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo cargar Fauna CR.');
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const markSeen = useCallback(async (speciesId: string) => {
    if (markingId) return;
    setMarkingId(speciesId);
    try {
      await markFaunaSeen(speciesId);
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
  }, [language, markingId]);

  return (
    <ScrollView className="flex-1 bg-ui-background dark:bg-ui-dark-background" contentContainerStyle={{ paddingBottom: 44 }} showsVerticalScrollIndicator={false}>
      <View className="border-b border-ui-border bg-ui-surface px-5 pb-7 pt-7 dark:border-ui-dark-border dark:bg-ui-dark-surface">
        <View className="hidden" />
        <View className="flex-row items-center">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-ui-primary-soft dark:bg-ui-dark-primary-soft">
            <MaterialCommunityIcons name="butterfly-outline" size={32} color="#0B6B4F" />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-3xl font-extrabold tracking-tight text-ui-text dark:text-ui-dark-text">Fauna CR</Text>
            <Text className="mt-1 text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">
              {language === 'es' ? 'Conocé, observá y protegé nuestra biodiversidad.' : 'Discover, observe, and protect our biodiversity.'}
            </Text>
          </View>
        </View>
        <View className="mt-5 flex-row items-center rounded-card border border-ui-border bg-ui-primary-soft p-4 dark:border-ui-dark-border dark:bg-ui-dark-primary-soft">
          <MaterialCommunityIcons name="shield-lock-outline" size={24} color="#78dfa1" />
          <Text className="ml-3 flex-1 text-sm leading-5 text-ui-text dark:text-ui-dark-text">
            {language === 'es' ? 'Las ubicaciones sensibles se muestran sólo por provincia.' : 'Sensitive locations are shown only at province level.'}
          </Text>
        </View>
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
              <View className="w-64 rounded-card border border-ui-border bg-ui-surface p-5 dark:border-ui-dark-border dark:bg-ui-dark-surface" key={sanctuary.id}>
                <View className="flex-row items-center">
                  <MaterialCommunityIcons name="check-decagram" size={22} color="#78dfa1" />
                  <Text className="ml-2 text-xs font-black uppercase tracking-wider text-frog-300">{language === 'es' ? 'Verificado' : 'Verified'}</Text>
                </View>
                <Text className="mt-4 text-lg font-bold text-ui-text dark:text-ui-dark-text">{sanctuary.name}</Text>
                <Text className="mt-2 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{sanctuary.location_name} · {sanctuary.province}</Text>
                <Text className="mt-3 text-sm leading-5 text-ui-text dark:text-ui-dark-text">{language === 'es' ? sanctuary.description_es : sanctuary.description_en}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

    </ScrollView>
  );
}
