import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AerialMap } from './aerial-map';

export type AerialPlace = { latitude: number; longitude: number; name: string };

export function AerialMapModal({ language, onClose, place }: { language: 'es' | 'en'; onClose: () => void; place?: AerialPlace }) {
  const insets = useSafeAreaInsets();
  return <Modal animationType="fade" onRequestClose={onClose} presentationStyle="fullScreen" visible={Boolean(place)}>
    <View className="flex-1 bg-black">
      {place ? <AerialMap latitude={place.latitude} longitude={place.longitude} /> : null}
      <View className="absolute left-4 right-4 flex-row items-center" style={{ top: insets.top + 12 }}>
        <Pressable accessibilityLabel={language === 'es' ? 'Volver' : 'Back'} accessibilityRole="button" className="h-11 w-11 items-center justify-center rounded-full bg-black/75" onPress={onClose}><MaterialCommunityIcons name="arrow-left" size={25} color="white" /></Pressable>
        <Text className="ml-3 flex-1 rounded-full bg-black/75 px-3 py-2 font-black text-white" numberOfLines={1}>{place?.name}</Text>
      </View>
    </View>
  </Modal>;
}

export function AerialButton({ language, onPress, small = false }: { language: 'es' | 'en'; onPress: () => void; small?: boolean }) {
  const label = language === 'es' ? 'Vista aérea' : 'Aerial view';
  return <Pressable accessibilityLabel={label} accessibilityRole="button" className={small ? 'min-h-11 flex-row items-center self-start rounded-full bg-black/70 px-3' : 'min-h-11 flex-row items-center self-start rounded-xl bg-ui-primary px-4 dark:bg-ui-dark-primary'} onPress={(event) => { event.stopPropagation(); onPress(); }}>
    <MaterialCommunityIcons name="satellite-variant" size={small ? 16 : 19} color="white" />
    <Text className={small ? 'ml-1 text-xs font-black text-white' : 'ml-2 font-black text-white'}>{label}</Text>
  </Pressable>;
}
