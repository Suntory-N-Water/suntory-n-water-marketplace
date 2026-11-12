import {
  BASE_FEE,
  CAMPAIGN_FREE_SHIPPING_THRESHOLD,
  COOL_DELIVERY_FEE,
  FREE_SHIPPING_THRESHOLD,
  featureFlags,
  REMOTE_ISLAND_SURCHARGE,
  type Region,
} from './shipping-config';

export type ShippingInput = {
  region: Region;
  subtotal: number;
  remoteIsland: boolean;
  coolDelivery: boolean;
};

export type ShippingQuote = {
  fee: number;
  freeShippingApplied: boolean;
  label: string;
};

const freeShippingThreshold = () =>
  featureFlags.freeShippingCampaign
    ? CAMPAIGN_FREE_SHIPPING_THRESHOLD
    : FREE_SHIPPING_THRESHOLD;

// 離島加算とクール便料金は送料無料の対象外という契約になっている。
export const quoteShipping = (input: ShippingInput): ShippingQuote => {
  const freeShippingApplied = input.subtotal >= freeShippingThreshold();
  const base = freeShippingApplied ? 0 : BASE_FEE[input.region];
  const surcharge = input.remoteIsland ? REMOTE_ISLAND_SURCHARGE : 0;
  const cool = input.coolDelivery ? COOL_DELIVERY_FEE : 0;
  const fee = base + surcharge + cool;
  return { fee, freeShippingApplied, label: formatYen(fee) };
};

export const formatYen = (amount: number): string =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(
    amount,
  );

export const getBaseFee = (region: Region): number => BASE_FEE[region];
