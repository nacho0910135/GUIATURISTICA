import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View, type GestureResponderEvent } from 'react-native';

import { ThemedAlert as Alert } from '@/components/themed-alert';

const CANCEL_DISTANCE = 112;

function formatDuration(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function AudioRecorderButton({ busy, language, onRecorded }: { busy: boolean; language: 'es' | 'en'; onRecorded: (audio: { uri: string; type: 'audio'; durationMs: number }) => void | Promise<void> }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startingRef = useRef(false);
  const recordingRef = useRef(false);
  const pressedRef = useRef(false);
  const cancelRef = useRef(false);
  const startXRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const translateX = useRef(new Animated.Value(0)).current;
  const text = (es: string, en: string) => language === 'es' ? es : en;

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const reset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    recordingRef.current = false;
    cancelRef.current = false;
    setRecording(false);
    setCancelling(false);
    setElapsedMs(0);
    translateX.setValue(0);
  };

  const start = async () => {
    if (busy || startingRef.current || recordingRef.current) return;
    startingRef.current = true;
    setRecording(true);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        reset();
        return Alert.alert('Descubriendo CR', text('Permití el micrófono para grabar un audio.', 'Allow microphone access to record audio.'));
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      recordingRef.current = true;
      timerRef.current = setInterval(() => setElapsedMs((value) => value + 250), 250);
      if (!pressedRef.current) await finish(cancelRef.current);
    } catch (reason) {
      reset();
      Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : text('No se pudo iniciar la grabación.', 'Could not start recording.'));
    } finally {
      startingRef.current = false;
    }
  };

  const finish = async (cancel = cancelRef.current) => {
    if (!recordingRef.current) return;
    const durationMs = recorder.getStatus().durationMillis;
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = recorder.uri;
      reset();
      if (!cancel && uri) await onRecorded({ uri, type: 'audio', durationMs });
    } catch (reason) {
      reset();
      Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : text('No se pudo finalizar el audio.', 'Could not finish the recording.'));
    }
  };

  const toggleAccessibleRecording = () => {
    if (recordingRef.current) return void finish(false);
    pressedRef.current = true;
    void start().finally(() => { pressedRef.current = false; });
  };

  const move = ({ nativeEvent }: GestureResponderEvent) => {
    if (!recordingRef.current) return;
    const distance = Math.min(0, Math.max(-CANCEL_DISTANCE, nativeEvent.pageX - startXRef.current));
    const shouldCancel = distance <= -CANCEL_DISTANCE;
    translateX.setValue(distance);
    if (shouldCancel !== cancelRef.current) {
      cancelRef.current = shouldCancel;
      setCancelling(shouldCancel);
    }
  };

  return <View className={recording ? 'absolute inset-x-0 bottom-0 z-10 h-12 flex-row items-center rounded-2xl bg-ui-surface px-2 dark:bg-ui-dark-surface' : 'h-12 w-12'}>
    {recording ? <>
      <Animated.View className={cancelling ? 'h-11 w-11 items-center justify-center rounded-full bg-ui-danger' : 'h-11 w-11 items-center justify-center rounded-full bg-ui-primary-soft'} style={{ transform: [{ scale: cancelling ? 1.18 : 1 }] }}>
        <MaterialCommunityIcons name="delete" size={24} color={cancelling ? 'white' : '#D64545'} />
      </Animated.View>
      <View className="flex-1 items-center"><Text className={cancelling ? 'text-sm font-semibold text-ui-danger' : 'text-sm text-ui-text-muted dark:text-ui-dark-text-muted'}>{cancelling ? text('Soltá para borrar', 'Release to delete') : text('Deslizá para borrar', 'Slide to delete')}</Text><Text className="text-xs font-semibold tabular-nums text-ui-text dark:text-ui-dark-text">{formatDuration(elapsedMs)}</Text></View>
    </> : null}
    <Animated.View style={recording ? { transform: [{ translateX }, { scale: 1.18 }] } : undefined}>
      <Pressable
        accessibilityActions={[{ name: 'activate', label: recording ? text('Enviar audio', 'Send recording') : text('Grabar audio', 'Record audio') }, { name: 'escape', label: text('Cancelar audio', 'Cancel recording') }]}
        accessibilityHint={text('Mantené presionado para grabar y soltá para enviar. Deslizá a la izquierda para borrar.', 'Hold to record and release to send. Slide left to delete.')}
        accessibilityLabel={recording ? text('Grabando audio', 'Recording audio') : text('Grabar audio', 'Record audio')}
        accessibilityRole="button"
        className={recording ? 'h-12 w-12 items-center justify-center rounded-full bg-ui-danger' : 'h-12 w-12 items-center justify-center rounded-full bg-ui-primary'}
        disabled={busy}
        onAccessibilityAction={({ nativeEvent }) => nativeEvent.actionName === 'escape' ? void finish(true) : toggleAccessibleRecording()}
        onPressIn={({ nativeEvent }) => { pressedRef.current = true; cancelRef.current = false; startXRef.current = nativeEvent.pageX; void start(); }}
        onPressOut={() => { pressedRef.current = false; void finish(); }}
        onTouchMove={move}
      ><MaterialCommunityIcons name="microphone" size={24} color="white" /></Pressable>
    </Animated.View>
  </View>;
}
