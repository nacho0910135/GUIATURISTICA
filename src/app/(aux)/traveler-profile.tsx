import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { getPublicTravelerProfile, sendTravelerMessage } from '@/lib/social-profile';
import { toggleTravelerFollow } from '@/lib/travelers';
import { useApp } from '@/providers/app-provider';

type PublicProfile = Awaited<ReturnType<typeof getPublicTravelerProfile>>;
export default function TravelerProfileScreen() {
  const router = useRouter(); const { id } = useLocalSearchParams<{ id: string }>(); const { session } = useApp();
  const [data,setData] = useState<PublicProfile>(); const [message,setMessage] = useState(''); const [busy,setBusy] = useState(false);
  const viewerId = session!.user.id;
  const load = useCallback(async () => { if (id) setData(await getPublicTravelerProfile(id, viewerId)); }, [id, viewerId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (!data?.profile) return <View className="flex-1 items-center justify-center bg-[#101625]"><ActivityIndicator color="#13bd83" /></View>;
  const name = data.profile.full_name || data.profile.username || 'Viajero';
  return <ScrollView className="flex-1 bg-[#101625]" contentContainerStyle={{ padding: 20, paddingBottom: 50 }}><Pressable className="mb-5 h-12 w-12 items-center justify-center rounded-full bg-[#202a3f]" onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={25} color="white" /></Pressable><View className="rounded-[30px] bg-[#202a3f] p-6"><View className="flex-row items-center">{data.profile.avatar_url ? <Image source={{uri:data.profile.avatar_url}} style={{height:90,width:90,borderRadius:45}} /> : <View className="h-20 w-20 items-center justify-center rounded-full bg-[#13bd83]"><MaterialCommunityIcons name="account" size={42} color="white" /></View>}<View className="ml-4 flex-1"><Text className="text-2xl font-black text-white">{name}</Text><Text className="mt-2 text-[#aeb9cf]">{data.profile.bio || 'Explorando Costa Rica'}</Text><Text className="mt-3 font-bold text-white">{data.followers.length} seguidores · {data.following.length} siguiendo</Text></View>{id !== viewerId ? <Pressable className="rounded-full bg-[#13bd83] px-5 py-3" onPress={async()=>{await toggleTravelerFollow(viewerId,id,data.followed);await load();}}><Text className="font-black text-white">{data.followed?'Siguiendo':'Seguir'}</Text></Pressable>:null}</View></View>{id !== viewerId ? <View className="mt-5 rounded-3xl bg-[#202a3f] p-5"><Text className="text-lg font-black text-white">Mensaje privado</Text><TextInput className="mt-3 rounded-2xl bg-[#101625] p-4 text-white" multiline placeholder="Escribí un mensaje…" placeholderTextColor="#8894aa" value={message} onChangeText={setMessage}/><Pressable disabled={busy||!message.trim()} className="mt-3 self-end rounded-full bg-[#13bd83] px-5 py-3 disabled:opacity-40" onPress={async()=>{setBusy(true);try{await sendTravelerMessage(viewerId,id,message);setMessage('');Alert.alert('Mensaje enviado');}finally{setBusy(false);}}}><Text className="font-black text-white">Enviar</Text></Pressable></View>:null}<Text className="mb-2 mt-7 text-xl font-black text-white">Publicaciones</Text>{data.posts.map((post)=><View className="mb-4 overflow-hidden rounded-3xl bg-[#202a3f]" key={post.id}><View className="p-5"><Text className="text-white">{post.body}</Text></View>{post.image_url?<Image source={{uri:post.image_url}} contentFit="cover" style={{height:260,width:'100%'}}/>:null}</View>)}</ScrollView>;
}
