import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAudioPlaylist } from 'expo-audio';
import { ImageBackground } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import questionsEn from '@/data/trivia-cr.en.json';
import questionsEs from '@/data/trivia-cr.json';
import { haptic } from '@/lib/haptics';
import { useApp } from '@/providers/app-provider';
import { useAppTheme } from '@/theme/theme-provider';

const BACKGROUNDS = [
  require('../../../assets/imagenes para fondo de trivia/costarica10.jpg'), require('../../../assets/imagenes para fondo de trivia/depositphotos_593056978-stock-photo-vertical-shot-beautiful-waterfall-trees.jpg'),
  require('../../../assets/imagenes para fondo de trivia/images (1).jpeg'), require('../../../assets/imagenes para fondo de trivia/images (2).jpeg'), require('../../../assets/imagenes para fondo de trivia/images (3).jpeg'),
  require('../../../assets/imagenes para fondo de trivia/images (4).jpeg'), require('../../../assets/imagenes para fondo de trivia/images (5).jpeg'), require('../../../assets/imagenes para fondo de trivia/images (6).jpeg'), require('../../../assets/imagenes para fondo de trivia/images (7).jpeg'),
];

export default function TriviaScreen() {
  const router = useRouter();
  const { language } = useApp();
  const { colors } = useAppTheme();
  const questions = language === 'es' ? questionsEs : questionsEn;
  const text = (es: string, en: string) => language === 'es' ? es : en;
  const playlist = useAudioPlaylist({ sources: [require('../../../assets/musica de fondo para trivia/Punto Guanacasteco.mp3'), require('../../../assets/musica de fondo para trivia/El Torito.mp3')], loop: 'all' });
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number>();
  const [score, setScore] = useState(0);
  const finished = index === questions.length;
  const question = questions[index];

  useEffect(() => { playlist.volume = 0.18; playlist.play(); }, [playlist]);

  const choose = (option: number) => {
    if (selected !== undefined) return;
    setSelected(option);
    if (option === question.answer) setScore((current) => current + 1);
    void haptic(option === question.answer ? 'success' : 'error');
  };
  const next = () => { setSelected(undefined); setIndex((current) => current + 1); };
  const restart = () => { setIndex(0); setScore(0); setSelected(undefined); };

  return (
    <ImageBackground contentFit="cover" source={BACKGROUNDS[index % BACKGROUNDS.length]} style={{ flex: 1 }} transition={500}>
      <View className="absolute inset-0 bg-black/30" />
      <ScrollView className="flex-1" contentContainerStyle={{ alignItems: 'center', padding: 20, paddingBottom: 44 }}>
        <View className="w-full max-w-2xl">
          <View className="flex-row items-center rounded-[26px] border border-white/30 bg-black/45 p-4 shadow-xl">
            <Pressable accessibilityLabel={text('Volver', 'Back')} accessibilityRole="button" className="h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/40" onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={23} color="white" /></Pressable>
            <View className="ml-3 flex-1"><Text className="text-2xl font-black text-white">Trivia CR</Text><Text className="text-sm text-white/75">{text('Turismo, flora, fauna, cultura y música nacional', 'Tourism, flora, wildlife, culture and national music')}</Text></View>
            <MaterialCommunityIcons accessibilityLabel={text('Música de fondo activa', 'Background music playing')} name="music-note" size={22} color={colors.primary} />
          </View>

          {finished ? (
            <View className="mt-6 items-center rounded-[30px] border border-white/70 bg-white/60 p-7 shadow-2xl dark:border-white/15 dark:bg-ui-dark-surface/60">
              <Text className="text-5xl">🇨🇷</Text>
              <Text accessibilityLiveRegion="polite" className="mt-4 text-center text-2xl font-black text-ui-text dark:text-ui-dark-text">{text(`Obtuviste ${score} de ${questions.length}`, `You scored ${score} out of ${questions.length}`)}</Text>
              <Text className="mt-2 text-center text-ui-text-muted dark:text-ui-dark-text-muted">{score >= 24 ? text('¡Sos pura vida en conocimiento tico!', 'Your Costa Rican knowledge is pura vida!') : score >= 15 ? text('¡Vas muy bien! Costa Rica todavía guarda sorpresas.', 'Great job! Costa Rica still has a few surprises for you.') : text('Cada respuesta es una nueva parada del recorrido.', 'Every answer is another stop on the journey.')}</Text>
              <Pressable accessibilityRole="button" className="mt-6 min-h-12 w-full items-center justify-center rounded-control bg-ui-primary dark:bg-ui-dark-primary" onPress={restart}><Text className="font-black text-white">{text('Jugar de nuevo', 'Play again')}</Text></Pressable>
            </View>
          ) : (
            <View className="mt-6 px-1 py-2">
              <View className="flex-row items-center justify-between"><Text className="text-xs font-black uppercase tracking-wider text-white">{question.category}</Text><Text className="text-sm font-bold text-white/75">{index + 1} / {questions.length}</Text></View>
              <View className="mt-3 h-2 overflow-hidden rounded-full bg-white/30"><View className="h-full rounded-full bg-ui-dark-primary" style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></View>
              <Text className="mt-7 text-2xl font-black leading-8 text-white">{question.question}</Text>
              <View className="mt-6 gap-3">{question.options.map((option, optionIndex) => {
                const answered = selected !== undefined, correct = optionIndex === question.answer, chosen = optionIndex === selected;
                const style = answered && correct ? 'border-ui-dark-success bg-ui-dark-primary-soft/85' : chosen ? 'border-ui-dark-danger bg-ui-dark-surface/85' : 'border-white/35 bg-black/55';
                return <Pressable accessibilityRole="button" accessibilityState={{ disabled: answered, selected: chosen }} className={`min-h-14 flex-row items-center rounded-2xl border px-4 py-3 ${style}`} disabled={answered} key={option} onPress={() => choose(optionIndex)}><Text className="mr-3 font-black text-ui-dark-primary">{String.fromCharCode(65 + optionIndex)}</Text><Text className="flex-1 font-bold text-white">{option}</Text>{answered && correct ? <MaterialCommunityIcons name="check-circle" size={22} color={colors.success} /> : chosen ? <MaterialCommunityIcons name="close-circle" size={22} color={colors.danger} /> : null}</Pressable>;
              })}</View>
              {selected !== undefined ? <View className="mt-5 rounded-control border border-white/25 bg-black/60 p-4"><Text accessibilityLiveRegion="polite" className="font-black text-white">{selected === question.answer ? text('¡Correcto!', 'Correct!') : text('Respuesta correcta:', 'Correct answer:')}</Text><Text className="mt-1 leading-5 text-white/75">{question.fact}</Text></View> : null}
              {selected !== undefined ? <Pressable accessibilityRole="button" className="mt-5 min-h-12 items-center justify-center rounded-control bg-ui-primary dark:bg-ui-dark-primary" onPress={next}><Text className="font-black text-white">{index + 1 === questions.length ? text('Ver resultado', 'See results') : text('Siguiente pregunta', 'Next question')}</Text></Pressable> : null}
            </View>
          )}
        </View>
      </ScrollView>
    </ImageBackground>
  );
}
