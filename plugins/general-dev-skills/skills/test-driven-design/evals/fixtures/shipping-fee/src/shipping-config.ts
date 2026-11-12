export type Region = 'hokkaido' | 'honshu' | 'shikoku' | 'kyushu' | 'okinawa';

export const BASE_FEE: Record<Region, number> = {
  hokkaido: 1200,
  honshu: 800,
  shikoku: 900,
  kyushu: 1000,
  okinawa: 1500,
};

export const FREE_SHIPPING_THRESHOLD = 5000;
export const CAMPAIGN_FREE_SHIPPING_THRESHOLD = 3000;
export const REMOTE_ISLAND_SURCHARGE = 600;
export const COOL_DELIVERY_FEE = 330;

export const featureFlags = {
  freeShippingCampaign: false,
};
