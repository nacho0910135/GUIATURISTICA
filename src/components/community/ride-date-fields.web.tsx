import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';

const pad = (value: number) => String(value).padStart(2, '0');

export function RideDateFields({ language, value, onChange }: { language: 'es' | 'en'; value: Date; onChange: (value: Date) => void }) {
  const formattedDate = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  const formattedTime = `${pad(value.getHours())}:${pad(value.getMinutes())}`;
  const [date, setDate] = useState(formattedDate);
  const [time, setTime] = useState(formattedTime);
  useEffect(() => setDate(formattedDate), [formattedDate]);
  useEffect(() => setTime(formattedTime), [formattedTime]);
  const update = (nextDate: string, nextTime: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate) || !/^\d{2}:\d{2}$/.test(nextTime)) return;
    const next = new Date(`${nextDate}T${nextTime}:00`);
    if (!Number.isNaN(next.getTime())) onChange(next);
  };
  return <View className="mt-4 flex-row gap-3">
    <TextInput accessibilityLabel={language === 'es' ? 'Fecha de la rodada' : 'Ride date'} className="min-h-12 flex-1 rounded-control border border-ui-border bg-ui-muted px-4 text-ui-text dark:border-ui-dark-border dark:bg-ui-dark-muted dark:text-ui-dark-text" onChangeText={(next) => { setDate(next); update(next, time); }} placeholder="AAAA-MM-DD" value={date} />
    <TextInput accessibilityLabel={language === 'es' ? 'Hora de la rodada' : 'Ride time'} className="min-h-12 flex-1 rounded-control border border-ui-border bg-ui-muted px-4 text-ui-text dark:border-ui-dark-border dark:bg-ui-dark-muted dark:text-ui-dark-text" onChangeText={(next) => { setTime(next); update(date, next); }} placeholder="HH:MM" value={time} />
  </View>;
}
