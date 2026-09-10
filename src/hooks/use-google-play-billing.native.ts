import * as Crypto from 'expo-crypto';
import { ErrorCode, finishTransaction, type ProductSubscription, type Purchase, useIAP } from 'expo-iap';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { billingOffers, googlePlayProductIds, type BillingOfferId } from '@/lib/billing';
import { supabase } from '@/lib/supabase';

type Options = {
  onError: (message: string) => void;
  onVerified: () => void | Promise<void>;
  userId?: string;
};

const subscriptionOffers: BillingOfferId[] = ['universal_monthly', 'universal_annual', 'business_monthly'];
const productToOffer = new Map<string, BillingOfferId>(subscriptionOffers.map((offerId) => [googlePlayProductIds[offerId], offerId]));

function errorMessage(reason: unknown) {
  if (reason instanceof Error) return reason.message;
  return 'No se pudo completar la compra con Google Play.';
}

export function useGooglePlayBilling({ onError, onVerified, userId }: Options) {
  const [productsLoaded, setProductsLoaded] = useState(false);
  const serviceByProduct = useRef(new Map<string, string | undefined>());
  const processingTokens = useRef(new Set<string>());
  const onErrorRef = useRef(onError);
  const onVerifiedRef = useRef(onVerified);
  onErrorRef.current = onError;
  onVerifiedRef.current = onVerified;

  const verifyPurchase = useCallback(async (purchase: Purchase) => {
    if (Platform.OS !== 'android' || !userId) return;
    const purchaseToken = purchase.purchaseToken;
    const offerId = productToOffer.get(purchase.productId);
    if (!purchaseToken || !offerId || processingTokens.current.has(purchaseToken)) return;
    processingTokens.current.add(purchaseToken);
    try {
      const { data, error } = await supabase.functions.invoke('verify-google-play-purchase', {
        body: {
          productId: purchase.productId,
          purchaseToken,
          serviceId: serviceByProduct.current.get(purchase.productId),
        },
      });
      if (error) {
        const response = (error as { context?: Response }).context;
        const payload = response ? await response.clone().json().catch(() => undefined) as { error?: string } | undefined : undefined;
        throw new Error(payload?.error === 'google_play_not_configured'
          ? 'La validación de Google Play todavía no está configurada en el servidor.'
          : payload?.error === 'purchase_pending'
            ? 'El pago está pendiente. Google Play lo activará cuando se complete.'
            : payload?.error === 'purchase_on_hold'
              ? 'Google Play suspendió temporalmente el plan. Revisá tu método de pago.'
              : payload?.error === 'purchase_paused'
              ? 'La suscripción está pausada en Google Play.'
                : payload?.error === 'purchase_expired'
                  ? 'La suscripción venció. Podés activarla nuevamente desde Planes Pro.'
                  : 'Google Play no pudo validar la compra. Intentá nuevamente.');
      }
      if (!data?.verified) throw new Error('Google Play todavía no confirmó esta compra.');
      await finishTransaction({ purchase, isConsumable: false });
      await onVerifiedRef.current();
    } catch (reason) {
      onErrorRef.current(errorMessage(reason));
    } finally {
      processingTokens.current.delete(purchaseToken);
    }
  }, [userId]);

  const { availablePurchases, connected, fetchProducts, getAvailablePurchases, requestPurchase, subscriptions } = useIAP({
    onPurchaseError: (error) => {
      onErrorRef.current(error.code === ErrorCode.UserCancelled ? '' : error.message);
    },
    onPurchaseSuccess: (purchase) => { void verifyPurchase(purchase); },
    onError: (error) => onErrorRef.current(error.message),
  });

  useEffect(() => {
    if (Platform.OS !== 'android' || !connected) return;
    let active = true;
    void Promise.all([
      fetchProducts({ skus: subscriptionOffers.map((offerId) => googlePlayProductIds[offerId]), type: 'subs' }),
      getAvailablePurchases(),
    ]).finally(() => { if (active) setProductsLoaded(true); });
    return () => { active = false; };
  }, [connected, fetchProducts, getAvailablePurchases]);

  useEffect(() => {
    for (const purchase of availablePurchases) void verifyPurchase(purchase);
  }, [availablePurchases, verifyPurchase]);

  const storePrices = useMemo(() => Object.fromEntries(subscriptions.flatMap((product) => {
    const offerId = productToOffer.get(product.id);
    return offerId ? [[offerId, product.displayPrice]] : [];
  })) as Partial<Record<BillingOfferId, string>>, [subscriptions]);

  const purchase = useCallback(async (offerId: BillingOfferId, serviceId?: string) => {
    if (Platform.OS !== 'android') throw new Error('Google Play Billing solo está disponible en Android.');
    if (!userId) throw new Error('Iniciá sesión antes de comprar un plan.');
    if (!connected) throw new Error('Google Play todavía no está listo. Intentá nuevamente en unos segundos.');
    if (!subscriptionOffers.includes(offerId)) throw new Error('Este producto todavía no está disponible en Google Play.');
    const productId = googlePlayProductIds[offerId];
    const product = subscriptions.find((item) => item.id === productId) as ProductSubscription | undefined;
    if (!product || product.platform !== 'android') throw new Error('Este plan no está disponible para esta cuenta de Google Play.');
    const storeOffer = product.subscriptionOffers.find((item) => item.offerTokenAndroid);
    if (!storeOffer?.offerTokenAndroid) throw new Error('Google Play no devolvió un plan de cobro válido.');
    const obfuscatedAccountId = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, userId);
    const replacedPurchase = !billingOffers[offerId].business
      ? availablePurchases.find((item) => item.productId !== productId && productToOffer.has(item.productId) && item.purchaseToken)
      : undefined;
    serviceByProduct.current.set(productId, serviceId);
    await requestPurchase({
      type: 'subs',
      request: {
        google: {
          skus: [productId],
          obfuscatedAccountId,
          subscriptionOffers: [{ sku: productId, offerToken: storeOffer.offerTokenAndroid }],
          ...(replacedPurchase?.purchaseToken ? {
            purchaseToken: replacedPurchase.purchaseToken,
            subscriptionProductReplacementParams: {
              oldProductId: replacedPurchase.productId,
              replacementMode: 'charge-full-price' as const,
            },
          } : {}),
        },
      },
    });
  }, [availablePurchases, connected, requestPurchase, subscriptions, userId]);

  return { connected, productsLoaded, purchase, storePrices };
}
