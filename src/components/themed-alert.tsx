import { type PropsWithChildren, useCallback, useEffect, useState } from 'react';
import { Modal, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';

type ThemedAlertButton = {
  onPress?: () => void | Promise<void>;
  style?: 'cancel' | 'default' | 'destructive';
  text?: string;
};

type ThemedAlertState = {
  buttons: ThemedAlertButton[];
  message?: string;
  title: string;
};

let presentAlert: ((alert: ThemedAlertState) => void) | undefined;

export const ThemedAlert = {
  alert(title: string, message?: string, buttons?: ThemedAlertButton[]) {
    presentAlert?.({ buttons: buttons?.length ? buttons : [{ text: 'OK' }], message, title });
  },
};

export function ThemedAlertProvider({ children }: PropsWithChildren) {
  const [alert, setAlert] = useState<ThemedAlertState>();
  const dismiss = useCallback((button?: ThemedAlertButton) => {
    setAlert(undefined);
    if (button?.onPress) void button.onPress();
  }, []);

  useEffect(() => {
    presentAlert = setAlert;
    return () => {
      if (presentAlert === setAlert) presentAlert = undefined;
    };
  }, []);

  return (
    <>
      {children}
      <Modal animationType="fade" onRequestClose={() => dismiss()} statusBarTranslucent transparent visible={Boolean(alert)}>
        <View accessibilityViewIsModal className="flex-1 items-center justify-center bg-black/60 px-6">
          <View className="w-full max-w-sm rounded-modal border border-ui-border bg-ui-surface p-6 shadow-lg dark:border-ui-dark-border dark:bg-ui-dark-surface">
            <Text className="text-xl font-black text-ui-text dark:text-ui-dark-text">{alert?.title}</Text>
            {alert?.message ? <Text className="mt-3 text-base leading-6 text-ui-text-muted dark:text-ui-dark-text-muted">{alert.message}</Text> : null}
            <View className={`mt-6 flex-row flex-wrap gap-3 ${alert?.buttons.length === 1 ? 'justify-center' : ''}`}>
              {alert?.buttons.map((button, index) => {
                const destructive = button.style === 'destructive';
                return <Button className={alert.buttons.length === 1 ? 'w-full' : 'min-w-28 flex-1'} emphasis={button.style === 'cancel' ? 'outline' : 'solid'} intent={destructive ? 'danger' : button.style === 'cancel' ? 'neutral' : 'primary'} key={`${button.text ?? 'OK'}-${index}`} label={button.text ?? 'OK'} onPress={() => dismiss(button)} />;
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
