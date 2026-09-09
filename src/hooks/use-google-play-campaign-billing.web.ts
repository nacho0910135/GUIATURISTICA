import type { CampaignOfferId } from "@/lib/billing";

type Campaign = {
  campaign_type: "featured" | "banner";
  image_url: string | null;
  service_id: string;
  status: "active" | "expired" | "refunded";
  target_url: string | null;
};
type Options = {
  campaigns?: Campaign[];
  onError: (message: string) => void;
  onVerified: () => void | Promise<void>;
  userId?: string;
};

export function useGooglePlayCampaignBilling(_options: Options) {
  return {
    connected: false,
    productsLoaded: true,
    storePrices: {} as Partial<Record<CampaignOfferId, string>>,
    purchase: async (
      _offerId: CampaignOfferId,
      _metadata: { serviceId: string; targetUrl?: string; imageUrl?: string },
    ) => {
      throw new Error("Google Play Billing solo está disponible en Android.");
    },
  };
}
