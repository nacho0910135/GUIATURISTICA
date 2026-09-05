import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import type { PrivateMessage } from '@/lib/social-profile';

function ChatAvatar({ url, name }: { url: string | null; name: string }) {
  return url ? <Image cachePolicy="none" source={{ uri: url }} style={{ borderRadius: 22, height: 44, width: 44 }} /> : <View className="h-11 w-11 items-center justify-center rounded-full bg-ui-primary"><Text className="font-black text-white">{name.slice(0, 1).toUpperCase()}</Text></View>;
}

function AudioMessage({ url, mine, language }: { url: string; mine: boolean; language: 'es' | 'en' }) {
  const player = useAudioPlayer({ uri: url });
  const status = useAudioPlayerStatus(player);
  const togglePlayback = async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration - 0.1)) await player.seekTo(0);
    player.play();
  };
  return (
    <Pressable accessibilityLabel={status.playing ? (language === 'es' ? 'Pausar audio' : 'Pause audio') : (language === 'es' ? 'Reproducir audio' : 'Play audio')} accessibilityRole="button" className="mt-1 min-h-11 flex-row items-center" onPress={() => void togglePlayback()}>
      <MaterialCommunityIcons name={status.playing ? 'pause-circle' : 'play-circle'} size={32} color={mine ? 'white' : '#0B6B4F'} />
      <Text className={mine ? 'ml-1 text-white' : 'ml-1 text-ui-primary dark:text-ui-dark-primary'}>{status.duration ? `${Math.ceil(status.duration)} s` : (language === 'es' ? 'Audio' : 'Audio')}</Text>
    </Pressable>
  );
}

export function TravelerMessage({ message: item, mine, language, avatarUrl, senderName, onReact }: { message: PrivateMessage; mine: boolean; language: 'es' | 'en'; avatarUrl: string | null; senderName: string; onReact?: (emoji: string) => void }) {
  const mediaOnly = item.body === '📷 Foto' || item.body === '🎙️ Audio';
  const reactions = [...new Set(item.reactions.map((reaction) => reaction.emoji))];
  return (
    <View className={mine ? 'mb-3 flex-row self-end' : 'mb-3 flex-row self-start'} style={{ maxWidth: '92%' }}>
      {!mine ? <View className="mr-2 self-end"><ChatAvatar url={avatarUrl} name={senderName} /></View> : null}
      <View className={mine ? 'rounded-2xl rounded-br-sm bg-ui-primary px-4 py-3' : 'rounded-2xl rounded-bl-sm bg-ui-surface px-4 py-3 dark:bg-ui-dark-surface'} style={{ maxWidth: '85%' }}>
        {item.media_type === 'image' && item.media_url ? <Image source={{ uri: item.media_url }} contentFit="cover" style={{ borderRadius: 12, height: 210, width: 240 }} /> : null}
        {item.media_type === 'audio' && item.media_url ? <AudioMessage language={language} url={item.media_url} mine={mine} /> : null}
        {!mediaOnly ? <Text className={mine ? 'mt-1 text-white' : 'mt-1 text-ui-text dark:text-ui-dark-text'}>{item.body}</Text> : null}
        {item.media_type === 'image' && onReact ? <View className="mt-2 flex-row items-center gap-2"><Pressable accessibilityLabel={language === 'es' ? 'Reaccionar a la foto' : 'React to photo'} onPress={() => onReact('❤️')}><Text className="text-lg">❤️</Text></Pressable>{reactions.map((emoji) => <Pressable className="rounded-full bg-black/10 px-2 py-1" key={emoji} onPress={() => onReact(emoji)}><Text>{emoji} {item.reactions.filter((reaction) => reaction.emoji === emoji).length}</Text></Pressable>)}</View> : null}
        <Text className={mine ? 'mt-1 text-right text-[10px] text-white/70' : 'mt-1 text-[10px] text-ui-text-muted dark:text-ui-dark-text-muted'}>{new Date(item.created_at).toLocaleString(language === 'es' ? 'es-CR' : 'en-US')}</Text>
      </View>
      {mine ? <View className="ml-2 self-end"><ChatAvatar url={avatarUrl} name={senderName} /></View> : null}
    </View>
  );
}

export { ChatAvatar };
