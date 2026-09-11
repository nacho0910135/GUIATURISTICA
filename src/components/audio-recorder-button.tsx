import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ThemedAlert as Alert } from '@/components/themed-alert';

function formatDuration(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
}

type RecordedAudio = { uri: string; type: 'audio'; durationMs: number };

export function AudioRecorderButton({ busy, language, onRecorded }: { busy: boolean; language: 'es' | 'en'; onRecorded: (audio: RecordedAudio) => void | Promise<void> }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [draft, setDraft] = useState<RecordedAudio>();
  const [elapsedMs, setElapsedMs] = useState(0);
  const startingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const text = (es: string, en: string) => language === 'es' ? es : en;

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const start = async () => {
    if (busy || startingRef.current || recording || draft) return;
    startingRef.current = true;
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) return Alert.alert('Descubriendo CR', text('Permití el micrófono para grabar un audio.', 'Allow microphone access to record audio.'));
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setElapsedMs(0);
      setRecording(true);
      timerRef.current = setInterval(() => setElapsedMs((value) => value + 250), 250);
    } catch (reason) {
      Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : text('No se pudo iniciar la grabación.', 'Could not start recording.'));
    } finally {
      startingRef.current = false;
    }
  };

  const stop = async () => {
    if (!recording) return;
    const durationMs = recorder.getStatus().durationMillis;
    stopTimer();
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (recorder.uri) setDraft({ uri: recorder.uri, type: 'audio', durationMs });
      setRecording(false);
    } catch (reason) {
      setRecording(false);
      Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : text('No se pudo finalizar el audio.', 'Could not finish the recording.'));
    }
  };

  const discard = () => {
    setDraft(undefined);
    setElapsedMs(0);
  };

  const send = async () => {
    if (!draft || busy) return;
    await onRecorded(draft);
    setDraft(undefined);
    setElapsedMs(0);
  };

  if (recording) return <View className="absolute inset-x-0 bottom-0 z-10 h-14 flex-row items-center rounded-2xl border border-ui-danger bg-ui-surface px-2 shadow-floating dark:bg-ui-dark-surface">
    <View className="ml-2 flex-1 flex-row items-center gap-2">
      <View className="h-2.5 w-2.5 rounded-full bg-ui-danger" />
      <Text accessibilityLiveRegion="polite" className="font-semibold tabular-nums text-ui-text dark:text-ui-dark-text">{text('Grabando', 'Recording')} · {formatDuration(elapsedMs)}</Text>
    </View>
    <Pressable accessibilityLabel={text('Detener grabación', 'Stop recording')} accessibilityRole="button" className="h-12 w-12 items-center justify-center rounded-full bg-ui-danger focus-visible:ring-2 focus-visible:ring-ui-focus" disabled={busy} onPress={() => void stop()}>
      <MaterialCommunityIcons name="stop" size={24} color="white" />
    </Pressable>
  </View>;

  if (draft) return <View className="absolute inset-x-0 bottom-0 z-10 h-14 flex-row items-center gap-1 rounded-2xl border border-ui-border bg-ui-surface px-1 shadow-floating dark:border-ui-dark-border dark:bg-ui-dark-surface">
    <View className="h-12 w-12 items-center justify-center rounded-full bg-ui-primary-soft dark:bg-ui-dark-primary-soft"><MaterialCommunityIcons name="waveform" size={24} color="#0B6B4F" /></View>
    <View className="min-w-0 flex-1 px-2"><Text className="font-semibold text-ui-text dark:text-ui-dark-text">{text('Audio listo', 'Audio ready')}</Text><Text className="text-xs tabular-nums text-ui-text-muted dark:text-ui-dark-text-muted">{formatDuration(draft.durationMs)}</Text></View>
    <Pressable accessibilityLabel={text('Borrar audio', 'Delete audio')} accessibilityRole="button" className="h-12 w-12 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-ui-focus" disabled={busy} onPress={discard}>
      <MaterialCommunityIcons name="delete-outline" size={24} color="#C33B3B" />
    </Pressable>
    <Pressable accessibilityLabel={text('Enviar audio', 'Send audio')} accessibilityRole="button" className="h-12 w-12 items-center justify-center rounded-full bg-ui-primary focus-visible:ring-2 focus-visible:ring-ui-focus" disabled={busy} onPress={() => void send()}>
      <MaterialCommunityIcons name="send" size={22} color="white" />
    </Pressable>
  </View>;

  return <View className="h-12 w-12">
    <Pressable accessibilityHint={text('Tocá una vez para empezar a grabar.', 'Tap once to start recording.')} accessibilityLabel={text('Grabar audio', 'Record audio')} accessibilityRole="button" className="h-12 w-12 items-center justify-center rounded-full bg-ui-primary focus-visible:ring-2 focus-visible:ring-ui-focus disabled:opacity-45" disabled={busy} onPress={() => void start()}>
      <MaterialCommunityIcons name="microphone" size={24} color="white" />
    </Pressable>
  </View>;
}
