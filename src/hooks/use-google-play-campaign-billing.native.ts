import * as Crypto from "expo-crypto";
import {
  ErrorCode,
  finishTransaction,
  type ProductSubscription,
  type Purchase,
  useIAP,
} from "expo-iap";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

import {
  googlePlayCampaignProductIds,
  type CampaignOfferId,
} from "@/lib/billing";
import { supabase } from "@/lib/supabase";

type PurchaseMetadata = {
  serviceId: string;
  targetUrl?: string;
  imageUrl?: string;
};
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

const offers = Object.keys(googlePlayCampaignProductIds) as CampaignOfferId[];
const productToOffer = new Map<string, CampaignOfferId>(
  offers.map((offerId) => [googlePlayCampaignProductIds[offerId], offerId]),
);

export function useGooglePlayCampaignBilling({
  campaigns = [],
  onError,
  onVerified,
  userId,
}: Options) {
  const [productsLoaded, setProductsLoaded] = useState(false);
  const metadataByProduct = useRef(new Map<string, PurchaseMetadata>());
  const processingTokens = useRef(new Set<string>());
  const onErrorRef = useRef(onError);
  const onVerifiedRef = useRef(onVerified);
  onErrorRef.current = onError;
  onVerifiedRef.current = onVerified;

  const verifyPurchase = useCallback(
    async (purchase: Purchase, silent = false) => {
      if (Platform.OS !== "android" || !userId) return;
      const purchaseToken = purchase.purchaseToken;
      const offerId = productToOffer.get(purchase.productId);
      if (
        !purchaseToken ||
        !offerId ||
        processingTokens.current.has(purchaseToken)
      )
        return;
      processingTokens.current.add(purchaseToken);
      try {
        const { data, error } = await supabase.functions.invoke(
          "verify-google-play-purchase",
          {
            body: { productId: purchase.productId, purchaseToken },
          },
        );
        if (error) {
          const response = (error as { context?: Response }).context;
          const payload = response
            ? ((await response
                .clone()
                .json()
                .catch(() => undefined)) as { error?: string } | undefined)
            : undefined;
          if (payload?.error === "banner_capacity_reached")
            throw new Error(
              "Lo lamentamos, el número máximo de banners activos ya fue alcanzado.",
            );
          throw new Error(
            "Google Play no pudo validar la campaña. Intentá nuevamente.",
          );
        }
        if (!data?.verified)
          throw new Error("Google Play todavía no confirmó esta campaña.");
        if (!(
          "isAcknowledgedAndroid" in purchase && purchase.isAcknowledgedAndroid
        ))
          await finishTransaction({ purchase, isConsumable: false });
        metadataByProduct.current.delete(purchase.productId);
        await onVerifiedRef.current();
      } catch (reason) {
        if (!silent)
          onErrorRef.current(
            reason instanceof Error
              ? reason.message
              : "No se pudo completar la campaña con Google Play.",
          );
      } finally {
        processingTokens.current.delete(purchaseToken);
      }
    },
    [userId],
  );

  const {
    availablePurchases,
    connected,
    fetchProducts,
    getAvailablePurchases,
    requestPurchase,
    subscriptions,
  } = useIAP({
    onPurchaseError: (error) =>
      onErrorRef.current(
        error.code === ErrorCode.UserCancelled ? "" : error.message,
      ),
    onPurchaseSuccess: (purchase) => {
      void verifyPurchase(purchase);
    },
    onError: (error) => onErrorRef.current(error.message),
  });

  useEffect(() => {
    if (Platform.OS !== "android" || !connected) return;
    let active = true;
    void Promise.all([
      fetchProducts({
        skus: offers.map((offerId) => googlePlayCampaignProductIds[offerId]),
        type: "subs",
      }),
      getAvailablePurchases(),
    ]).catch((reason) => onErrorRef.current(reason instanceof Error ? reason.message : 'Google Play no está disponible.')).finally(() => {
      if (active) setProductsLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [connected, fetchProducts, getAvailablePurchases]);

  useEffect(() => {
    for (const campaign of campaigns) {
      if (campaign.status !== "active") continue;
      const offerId: CampaignOfferId =
        campaign.campaign_type === "banner"
          ? "banner_monthly"
          : "featured_monthly";
      metadataByProduct.current.set(googlePlayCampaignProductIds[offerId], {
        serviceId: campaign.service_id,
        targetUrl: campaign.target_url ?? undefined,
        imageUrl: campaign.image_url ?? undefined,
      });
    }
    for (const purchase of availablePurchases)
      void verifyPurchase(purchase, true);
  }, [availablePurchases, campaigns, verifyPurchase]);

  const storePrices = useMemo(
    () =>
      Object.fromEntries(
        subscriptions.flatMap((product) => {
          const offerId = productToOffer.get(product.id);
          return offerId ? [[offerId, product.displayPrice]] : [];
        }),
      ) as Partial<Record<CampaignOfferId, string>>,
    [subscriptions],
  );

  const purchase = useCallback(
    async (offerId: CampaignOfferId, metadata: PurchaseMetadata) => {
      if (!userId)
        throw new Error("Iniciá sesión antes de contratar una campaña.");
      if (!connected)
        throw new Error(
          "Google Play todavía no está listo. Intentá nuevamente en unos segundos.",
        );
      const productId = googlePlayCampaignProductIds[offerId];
      const product = subscriptions.find((item) => item.id === productId) as
        ProductSubscription | undefined;
      if (!product || product.platform !== "android")
        throw new Error(
          "Esta campaña no está disponible para esta cuenta de Google Play.",
        );
      const storeOffer = product.subscriptionOffers.find(
        (item) => item.offerTokenAndroid,
      );
      if (!storeOffer?.offerTokenAndroid)
        throw new Error("Google Play no devolvió un plan de cobro válido.");
      const obfuscatedAccountId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        userId,
      );
      const { error: intentError } = await supabase.rpc(
        "save_google_play_purchase_intent",
        {
          p_product_id: productId,
          p_service_id: metadata.serviceId,
          p_target_url: metadata.targetUrl ?? null,
          p_image_url: metadata.imageUrl ?? null,
        },
      );
      if (intentError)
        throw new Error("No se pudo preparar la compra. Intentá nuevamente.");
      metadataByProduct.current.set(productId, metadata);
      await requestPurchase({
        type: "subs",
        request: {
          google: {
            skus: [productId],
            obfuscatedAccountId,
            subscriptionOffers: [
              { sku: productId, offerToken: storeOffer.offerTokenAndroid },
            ],
          },
        },
      });
    },
    [connected, requestPurchase, subscriptions, userId],
  );

  return { connected, productsLoaded, purchase, storePrices };
}
