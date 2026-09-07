import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

export function RideDateFields({ language, value, onChange }: { language: 'es' | 'en'; value: Date; onChange: (value: Date) => void }) {
  const [picker, setPicker] = useState<'date' | 'time'>();
  const locale = language === 'es' ? 'es-CR' : 'en-US';
  return <View className="mt-4 flex-row gap-3">
    <Pressable accessibilityRole="button" className="min-h-12 flex-1 justify-center rounded-control border border-ui-border bg-ui-muted px-4 dark:border-ui-dark-border dark:bg-ui-dark-muted" onPress={() => setPicker('date')}><Text className="text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Fecha' : 'Date'}</Text><Text className="mt-1 font-black text-ui-text dark:text-ui-dark-text">{value.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}</Text></Pressable>
    <Pressable accessibilityRole="button" className="min-h-12 flex-1 justify-center rounded-control border border-ui-border bg-ui-muted px-4 dark:border-ui-dark-border dark:bg-ui-dark-muted" onPress={() => setPicker('time')}><Text className="text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Hora' : 'Time'}</Text><Text className="mt-1 font-black text-ui-text dark:text-ui-dark-text">{value.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}</Text></Pressable>
    {picker ? <DateTimePicker minimumDate={picker === 'date' ? new Date() : undefined} mode={picker} onChange={(_, selected) => {
      const activePicker = picker;
      setPicker(undefined);
      if (!selected) return;
      const next = new Date(value);
      if (activePicker === 'date') next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      else next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      onChange(next);
    }} value={value} /> : null}
  </View>;
}
