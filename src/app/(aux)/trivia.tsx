import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import questions from '@/data/trivia-cr.json';
import { haptic } from '@/lib/haptics';
import { useAppTheme } from '@/theme/theme-provider';

export default function TriviaScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number>();
  const [score, setScore] = useState(0);
  const finished = index === questions.length;
  const question = questions[index];

  const choose = (option: number) => {
    if (selected !== undefined) return;
    setSelected(option);
    if (option === question.answer) setScore((current) => current + 1);
    void haptic(option === question.answer ? 'success' : 'error');
  };

  const next = () => {
    setSelected(undefined);
    setIndex((current) => current + 1);
  };

  const restart = () => {
    setIndex(0);
    setScore(0);
    setSelected(undefined);
  };

  return (
    <ScrollView className="flex-1 bg-ui-background dark:bg-ui-dark-background" contentContainerStyle={{ alignItems: 'center', padding: 20, paddingBottom: 44 }}>
      <View className="w-full max-w-2xl">
        <View className="flex-row items-center">
          <Pressable accessibilityLabel="Volver a Fauna CR" accessibilityRole="button" className="h-11 w-11 items-center justify-center rounded-full bg-ui-muted dark:bg-ui-dark-muted" onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={23} color={colors.text} />
          </Pressable>
          <View className="ml-3 flex-1">
            <Text className="text-2xl font-black text-ui-text dark:text-ui-dark-text">Trivia CR</Text>
            <Text className="text-sm text-ui-text-muted dark:text-ui-dark-text-muted">Turismo, flora, fauna, cultura y música nacional</Text>
          </View>
        </View>

        {finished ? (
          <View className="mt-8 items-center rounded-card border border-ui-border bg-ui-surface p-7 dark:border-ui-dark-border dark:bg-ui-dark-surface">
            <Text className="text-5xl">🇨🇷</Text>
            <Text accessibilityLiveRegion="polite" className="mt-4 text-center text-2xl font-black text-ui-text dark:text-ui-dark-text">Obtuviste {score} de {questions.length}</Text>
            <Text className="mt-2 text-center text-ui-text-muted dark:text-ui-dark-text-muted">{score >= 8 ? '¡Sos pura vida en conocimiento tico!' : score >= 5 ? '¡Vas muy bien! Costa Rica todavía guarda sorpresas.' : 'Cada respuesta es una nueva parada del recorrido.'}</Text>
            <Pressable accessibilityRole="button" className="mt-6 min-h-12 w-full items-center justify-center rounded-control bg-ui-primary dark:bg-ui-dark-primary" onPress={restart}><Text className="font-black text-white">Jugar de nuevo</Text></Pressable>
          </View>
        ) : (
          <View className="mt-8">
            <View className="flex-row items-center justify-between"><Text className="text-xs font-black uppercase tracking-wider text-ui-primary dark:text-ui-dark-primary">{question.category}</Text><Text className="text-sm font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{index + 1} / {questions.length}</Text></View>
            <View className="mt-3 h-2 overflow-hidden rounded-full bg-ui-muted dark:bg-ui-dark-muted"><View className="h-full rounded-full bg-ui-primary dark:bg-ui-dark-primary" style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></View>
            <Text className="mt-7 text-2xl font-black leading-8 text-ui-text dark:text-ui-dark-text">{question.question}</Text>
            <View className="mt-6 gap-3">{question.options.map((option, optionIndex) => {
              const answered = selected !== undefined;
              const correct = optionIndex === question.answer;
              const chosen = optionIndex === selected;
              const style = answered && correct ? 'border-ui-success bg-ui-primary-soft dark:border-ui-dark-success dark:bg-ui-dark-primary-soft' : chosen ? 'border-ui-danger bg-coral-50 dark:border-ui-dark-danger dark:bg-ui-dark-surface' : 'border-ui-border bg-ui-surface dark:border-ui-dark-border dark:bg-ui-dark-surface';
              return <Pressable accessibilityRole="button" accessibilityState={{ disabled: answered, selected: chosen }} className={`min-h-14 flex-row items-center rounded-control border-2 px-4 py-3 ${style}`} disabled={answered} key={option} onPress={() => choose(optionIndex)}><Text className="mr-3 font-black text-ui-primary dark:text-ui-dark-primary">{String.fromCharCode(65 + optionIndex)}</Text><Text className="flex-1 font-bold text-ui-text dark:text-ui-dark-text">{option}</Text>{answered && correct ? <MaterialCommunityIcons name="check-circle" size={22} color={colors.success} /> : chosen ? <MaterialCommunityIcons name="close-circle" size={22} color={colors.danger} /> : null}</Pressable>;
            })}</View>
            {selected !== undefined ? <View className="mt-5 rounded-control bg-ui-muted p-4 dark:bg-ui-dark-muted"><Text accessibilityLiveRegion="polite" className="font-black text-ui-text dark:text-ui-dark-text">{selected === question.answer ? '¡Correcto!' : 'Respuesta correcta:'}</Text><Text className="mt-1 leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{question.fact}</Text></View> : null}
            {selected !== undefined ? <Pressable accessibilityRole="button" className="mt-5 min-h-12 items-center justify-center rounded-control bg-ui-primary dark:bg-ui-dark-primary" onPress={next}><Text className="font-black text-white">{index + 1 === questions.length ? 'Ver resultado' : 'Siguiente pregunta'}</Text></Pressable> : null}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
