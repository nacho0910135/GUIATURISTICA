import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { emergencyContacts } from '@/lib/logistics';

export function AppFooter({ language }: { language: 'es' | 'en' }) {
  const router = useRouter();
  const text = (es: string, en: string) => language === 'es' ? es : en;

  return (
    <View className="mt-8 w-full border-t border-[#244B44] bg-[#133C33] px-5 py-8 dark:border-[#2A554A] dark:bg-[#0A1E19]">
      <View className="mx-auto w-full" style={{ maxWidth: 760 }}>
        <View className="flex-row items-center">
          <View className="h-11 w-11 overflow-hidden rounded-2xl bg-[#0A3B2E]"><Image accessibilityLabel="Descubriendo CR" contentFit="contain" source={require('@/assets/brand/frog-logo-open.png')} style={{ height: '100%', width: '100%' }} /></View>
          <Text className="ml-3 text-xl font-black text-[#E7FFF7]">Descubriendo <Text style={{ color: '#58C3DF', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 23, fontWeight: '800' }}>C</Text><Text style={{ color: '#F07171', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 23, fontWeight: '800' }}>R</Text></Text>
        </View>
        <Text className="mt-4 text-sm leading-6 text-[#C1D8D0]">{text('Plataforma turística y ecológica comunitaria para explorar Costa Rica de forma informada.', 'A community tourism and ecology platform for informed travel across Costa Rica.')}</Text>

        <View className="mt-5 flex-row items-center rounded-2xl bg-white/10 px-3 py-3">
          <MaterialCommunityIcons name="shield-check-outline" color="#45DBAD" size={22} />
          <Text className="ml-2 flex-1 text-xs font-bold leading-5 text-[#D9F7ED]">{text('Datos de referencia; confirmá horarios, tarifas y disponibilidad con el operador.', 'Reference data only; confirm schedules, fares, and availability with the operator.')}</Text>
        </View>

        <Text className="mt-7 text-xs font-black uppercase tracking-[1.5px] text-[#9CC6B9]">{text('Servicios de emergencia', 'Emergency services')}</Text>
        <View className="mt-3 gap-1">
          {emergencyContacts.map((contact) => (
            <Pressable accessibilityRole="link" className="min-h-9 flex-row items-center self-start" key={contact.phone} onPress={() => void Linking.openURL(`tel:${contact.phone}`)}>
              <Text className="text-sm text-[#D9E9E4]">{contact.label}: </Text>
              <Text className={contact.phone === '911' ? 'text-sm font-black text-[#FF8A8A]' : 'text-sm font-black text-[#45DBAD]'}>{contact.phone}</Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-7 flex-row flex-wrap gap-x-5 gap-y-1 border-t border-white/15 pt-4">
          <Pressable accessibilityRole="link" className="min-h-10 justify-center" onPress={() => router.push('/terms')}><Text className="text-xs font-bold text-[#C1D8D0] underline">{text('Términos y condiciones', 'Terms and conditions')}</Text></Pressable>
          <Pressable accessibilityRole="link" className="min-h-10 justify-center" onPress={() => router.push('/privacy')}><Text className="text-xs font-bold text-[#C1D8D0] underline">{text('Política de privacidad', 'Privacy policy')}</Text></Pressable>
        </View>

        <View className="mt-5 border-t border-white/15 pt-5">
          <Text className="text-center text-xs leading-5 text-[#B5CCC4]">© {new Date().getFullYear()} Descubriendo CR · {text('Hecho con ❤️ por la conservación de Costa Rica.', 'Made with ❤️ for Costa Rica’s conservation.')}</Text>
          <Text className="mt-2 text-center text-sm font-bold text-[#D9F7ED]">¡Pura Vida! · CR 🇨🇷</Text>
        </View>
      </View>
    </View>
  );
}
