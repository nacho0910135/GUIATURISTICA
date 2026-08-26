import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/providers/app-provider';

export function GlobalHeader() {
  const { currency, exchangeRate, language, setCurrency, setLanguage } = useApp();

  return (
    <SafeAreaView edges={['top']} className="overflow-hidden bg-forest-800">
      <MaterialCommunityIcons name="leaf" color="#37c774" size={92} style={{ opacity: 0.12, position: 'absolute', right: -18, top: -20, transform: [{ rotate: '-25deg' }] }} />
      <View className="w-full self-center px-5 pb-4 pt-3" style={{ maxWidth: 1180 }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-frog-400">
              <MaterialCommunityIcons name="compass" size={23} color="#063b2c" />
            </View>
            <Text className="text-xl font-black tracking-tight text-white">Descubriendo CR</Text>
          </View>
          <View className="flex-row overflow-hidden rounded-xl border border-white/40">
            {(['es', 'en'] as const).map((item) => (
              <Pressable
                accessibilityLabel={`${language === 'es' ? 'Cambiar idioma a' : 'Switch language to'} ${item.toUpperCase()}`}
                accessibilityRole="button"
                className={language === item ? 'bg-white px-3 py-2' : 'px-3 py-2'}
                key={item}
                onPress={() => setLanguage(item)}
              >
                <Text className={language === item ? 'text-xs font-extrabold text-forest-900' : 'text-xs font-bold text-white'}>{item.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm">
            <MaterialCommunityIcons name="swap-horizontal" size={18} color="#087443" />
            <Text className="text-sm font-semibold text-forest-700">1 USD = ₡{exchangeRate.toFixed(2)}</Text>
          </View>
          <View className="flex-row overflow-hidden rounded-xl border border-white/40">
            {(['USD', 'CRC'] as const).map((item) => (
              <Pressable
                accessibilityLabel={`${language === 'es' ? 'Usar moneda' : 'Use currency'} ${item}`}
                accessibilityRole="button"
                className={currency === item ? 'bg-white px-4 py-2' : 'px-4 py-2'}
                key={item}
                onPress={() => setCurrency(item)}
              >
                <Text className={currency === item ? 'font-black text-forest-900' : 'font-bold text-mint-100'}>
                  {item === 'USD' ? '$' : '₡'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
