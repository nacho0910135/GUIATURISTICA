import type { BillingOfferId } from '@/lib/billing';

type Options = {
  onError: (message: string) => void;
  onVerified: () => void | Promise<void>;
  userId?: string;
};

export function useGooglePlayBilling(_options: Options) {
  return {
    connected: false,
    productsLoaded: true,
    storePrices: {} as Partial<Record<BillingOfferId, string>>,
    purchase: async (_offerId: BillingOfferId, _serviceId?: string) => {
      throw new Error('Google Play Billing solo está disponible en Android.');
    },
  };
}
