import { Modal, View } from 'react-native';

import { FrogLoader } from '@/components/frog-loader';

export const waitForPaymentLoader = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

export function PaymentLoadingOverlay({ language, visible }: { language: 'es' | 'en'; visible: boolean }) {
  return <Modal animationType="fade" statusBarTranslucent visible={visible}><View className="flex-1 bg-ui-background dark:bg-ui-dark-background"><FrogLoader accessibilityLabel={language === 'es' ? 'Cargando pasarela de pago' : 'Loading payment gateway'} branded size="large" /></View></Modal>;
}
