import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/providers/app-provider';

export function GlobalHeader() {
  const { currency, exchangeRate, language, setCurrency, setLanguage } = useApp();

  return (
    <SafeAreaView edges={['top']} className="bg-forest-900 dark:bg-forest-950">
      <View className="px-4 pb-3 pt-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="h-9 w-9 items-center justify-center rounded-2xl bg-frog-400">
              <MaterialCommunityIcons name="leaf" size={23} color="#063b2c" />
            </View>
            <Text className="text-lg font-black tracking-tight text-white">Descubriendo CR</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="flex-row overflow-hidden rounded-xl border border-white/30">
              {(['es', 'en'] as const).map((item) => (
                <Pressable
                  accessibilityLabel={`${language === 'es' ? 'Cambiar idioma a' : 'Switch language to'} ${item.toUpperCase()}`}
                  accessibilityRole="button"
                  className={language === item ? 'bg-white px-3 py-2' : 'px-3 py-2'}
                  key={item}
                  onPress={() => setLanguage(item)}
                >
                  <Text className={language === item ? 'font-extrabold text-forest-900' : 'font-bold text-white'}>{item.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <MaterialCommunityIcons name="swap-horizontal" size={18} color="#b9f3d0" />
            <Text className="text-sm font-semibold text-mint-100">1 USD = ₡{exchangeRate.toFixed(2)}</Text>
          </View>
          <View className="flex-row rounded-xl bg-forest-700 p-1">
            {(['USD', 'CRC'] as const).map((item) => (
              <Pressable
                accessibilityLabel={`${language === 'es' ? 'Usar moneda' : 'Use currency'} ${item}`}
                accessibilityRole="button"
                className={currency === item ? 'rounded-lg bg-white px-3 py-1.5' : 'px-3 py-1.5'}
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
