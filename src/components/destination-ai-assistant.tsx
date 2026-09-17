import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FrogLoader } from '@/components/frog-loader';
import { askDestinationAI, type DestinationAIMessage } from '@/lib/destination-ai';

export function DestinationAIAssistant({ canUse, context, language, name, onSubscribe }: { canUse: boolean; context: string; language: 'es' | 'en'; name: string; onSubscribe: () => void }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DestinationAIMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ask = async (prompt: string, previous = messages) => {
    if (!prompt.trim() || busy) return;
    setBusy(true); setError('');
    try {
      const answer = await askDestinationAI(context, prompt, language, previous);
      setMessages([...previous, ...(previous.length ? [{ role: 'user' as const, text: prompt.trim() }] : []), { role: 'assistant', text: answer }]);
      setQuestion('');
    } catch (error) {
      console.warn('Firebase AI Logic request failed', error);
      setError(language === 'es' ? 'No se pudo consultar la IA. Revisá la conexión y reintentá.' : 'AI could not be reached. Check your connection and retry.');
    } finally { setBusy(false); }
  };

  const launch = () => {
    if (!canUse) return onSubscribe();
    setOpen(true);
    if (!messages.length) void ask(language === 'es' ? `Ampliá la información útil para conocer y visitar ${name}.` : `Expand the useful information for learning about and visiting ${name}.`, []);
  };

  return <>
    <Pressable accessibilityRole="button" className="mt-3 min-h-12 flex-row items-center justify-center rounded-control bg-ui-primary px-4 active:bg-ui-primary-pressed dark:bg-ui-dark-primary" onPress={launch}><MaterialCommunityIcons name="creation" size={19} color="white" /><Text className="ml-2 font-black text-white">{language === 'es' ? 'Conocé más con IA' : 'Learn more with AI'}</Text>{!canUse ? <Text className="ml-2 rounded-full bg-white/20 px-2 py-1 text-[10px] font-black text-white">PRO</Text> : null}</Pressable>
    <Modal animationType="slide" onRequestClose={() => setOpen(false)} presentationStyle="fullScreen" visible={open}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-ui-background dark:bg-ui-dark-background" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View className="flex-row items-center border-b border-ui-border bg-ui-surface px-4 py-3 dark:border-ui-dark-border dark:bg-ui-dark-surface"><View className="h-10 w-10 items-center justify-center rounded-2xl bg-ui-primary-soft"><MaterialCommunityIcons name="creation" size={23} color="#0B6B4F" /></View><View className="ml-3 flex-1"><Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Conocé más con IA' : 'Learn more with AI'}</Text><Text className="text-xs text-ui-text-muted dark:text-ui-dark-text-muted" numberOfLines={1}>{name}</Text></View><Pressable accessibilityLabel={language === 'es' ? 'Cerrar asistente' : 'Close assistant'} accessibilityRole="button" className="h-11 w-11 items-center justify-center" onPress={() => setOpen(false)}><MaterialCommunityIcons name="close" size={27} color="#68737A" /></Pressable></View>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
          {messages.map((message, index) => <View className={message.role === 'user' ? 'self-end rounded-3xl rounded-br-md bg-ui-primary px-4 py-3' : 'self-stretch rounded-3xl rounded-bl-md border border-ui-border bg-ui-surface px-4 py-4 dark:border-ui-dark-border dark:bg-ui-dark-surface'} key={`${message.role}-${index}`} style={message.role === 'user' ? { maxWidth: '86%' } : undefined}><Text className={message.role === 'user' ? 'leading-6 text-white' : 'text-base leading-7 text-ui-text dark:text-ui-dark-text'}>{message.text}</Text></View>)}
          {busy ? <View className="self-start flex-row items-center rounded-3xl bg-ui-surface px-5 py-4 dark:bg-ui-dark-surface"><FrogLoader color="#0B6B4F" size="small" /><Text className="ml-3 font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Consultando…' : 'Asking…'}</Text></View> : null}
          {error ? <View accessibilityRole="alert" className="rounded-2xl bg-red-50 p-4 dark:bg-red-950"><Text className="font-bold text-ui-danger dark:text-ui-dark-danger">{error}</Text><Pressable accessibilityRole="button" className="mt-3 min-h-11 items-center justify-center rounded-control border border-ui-danger px-4" onPress={() => void ask(question || (language === 'es' ? `Ampliá la información útil para conocer y visitar ${name}.` : `Expand the useful information for learning about and visiting ${name}.`), messages)}><Text className="font-black text-ui-danger dark:text-ui-dark-danger">{language === 'es' ? 'Reintentar' : 'Retry'}</Text></Pressable></View> : null}
          <Text className="text-xs leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'La IA amplía la información del lugar; no modifica la ruta ni sus cálculos. Confirmá horarios, precios y seguridad con fuentes oficiales.' : 'AI expands information about the place; it does not change the route or its calculations. Confirm hours, prices, and safety with official sources.'}</Text>
        </ScrollView>
        <View className="flex-row items-end gap-2 border-t border-ui-border bg-ui-surface p-4 dark:border-ui-dark-border dark:bg-ui-dark-surface"><TextInput accessibilityLabel={language === 'es' ? 'Pregunta sobre el lugar' : 'Question about the place'} className="max-h-28 min-h-12 flex-1 rounded-2xl bg-ui-muted px-4 py-3 text-ui-text dark:bg-ui-dark-muted dark:text-ui-dark-text" editable={!busy} maxLength={300} multiline onChangeText={setQuestion} placeholder={language === 'es' ? 'Preguntá sobre este lugar…' : 'Ask about this place…'} placeholderTextColor="#68737A" value={question} /><Pressable accessibilityLabel={language === 'es' ? 'Preguntar' : 'Ask'} accessibilityRole="button" className="h-12 w-12 items-center justify-center rounded-2xl bg-ui-primary disabled:opacity-40 dark:bg-ui-dark-primary" disabled={busy || !question.trim()} onPress={() => void ask(question)}><MaterialCommunityIcons name="send" size={20} color="white" /></Pressable></View>
      </KeyboardAvoidingView>
    </Modal>
  </>;
}
