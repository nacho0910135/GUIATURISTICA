import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Modal, Pressable, Text, View } from 'react-native';

export function ThemedNotice({ button = 'Entendido', message, onClose, title, visible }: { button?: string; message: string; onClose: () => void; title: string; visible: boolean }) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View accessibilityViewIsModal className="flex-1 items-center justify-center bg-black/60 px-6">
        <View className="w-full max-w-sm items-center rounded-modal border border-ui-border bg-ui-surface p-6 shadow-lg dark:border-ui-dark-border dark:bg-ui-dark-surface">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-ui-primary-soft dark:bg-ui-dark-primary-soft">
            <MaterialCommunityIcons color="#13a95b" name="check-circle" size={40} />
          </View>
          <Text className="mt-4 text-center text-2xl font-black text-ui-text dark:text-ui-dark-text">{title}</Text>
          <Text className="mt-3 text-center text-base leading-6 text-ui-text-muted dark:text-ui-dark-text-muted">{message}</Text>
          <Pressable accessibilityRole="button" className="mt-6 w-full items-center rounded-control bg-ui-primary px-5 py-4 dark:bg-ui-dark-primary" onPress={onClose}>
            <Text className="font-black text-white">{button}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
