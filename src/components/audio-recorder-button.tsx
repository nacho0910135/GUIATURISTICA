import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useRef, useState } from 'react';
import { Pressable } from 'react-native';

import { ThemedAlert as Alert } from '@/components/themed-alert';

export function AudioRecorderButton({ busy, language, onRecorded }: { busy: boolean; language: 'es' | 'en'; onRecorded: (audio: { uri: string; type: 'audio'; durationMs: number }) => void | Promise<void> }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const recordingRef = useRef(false);
  const startedThisPress = useRef(false);
  const held = useRef(false);
  const startedAt = useRef(0);
  const text = (es: string, en: string) => language === 'es' ? es : en;

  const start = async () => {
    if (busy || recordingRef.current) return;
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) return Alert.alert('Descubriendo CR', text('Permití el micrófono para grabar un audio.', 'Allow microphone access to record audio.'));
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      recordingRef.current = true;
      startedThisPress.current = true;
      startedAt.current = Date.now();
      setRecording(true);
    } catch (reason) {
      Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : text('No se pudo iniciar la grabación.', 'Could not start recording.'));
    }
  };

  const stopAndSend = async () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setRecording(false);
    const durationMs = Date.now() - startedAt.current;
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (recorder.uri) await onRecorded({ uri: recorder.uri, type: 'audio', durationMs });
    } catch (reason) {
      Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : text('No se pudo enviar el audio.', 'Could not send the audio.'));
    }
  };

  return <Pressable
    accessibilityHint={text('Tocá para iniciar o detener. También podés mantener presionado para grabar.', 'Tap to start or stop. You can also hold to record.')}
    accessibilityLabel={recording ? text('Detener y enviar audio', 'Stop and send audio') : text('Grabar audio', 'Record audio')}
    accessibilityRole="button"
    className={recording ? 'min-h-12 min-w-12 items-center justify-center rounded-full bg-red-500' : 'min-h-12 min-w-12 items-center justify-center rounded-full bg-ui-primary'}
    delayLongPress={350}
    disabled={busy}
    onLongPress={() => { if (startedThisPress.current) held.current = true; }}
    onPress={() => {
      if (held.current) { held.current = false; startedThisPress.current = false; return; }
      if (startedThisPress.current) { startedThisPress.current = false; return; }
      void stopAndSend();
    }}
    onPressIn={() => { startedThisPress.current = false; held.current = false; void start(); }}
    onPressOut={() => { if (held.current) void stopAndSend(); }}
  ><MaterialCommunityIcons name={recording ? 'stop' : 'microphone'} size={24} color="white" /></Pressable>;
}
