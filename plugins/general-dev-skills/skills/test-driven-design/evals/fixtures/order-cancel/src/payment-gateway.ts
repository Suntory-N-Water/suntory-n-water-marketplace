export type PaymentGateway = {
  refund: (input: { paymentId: string; amount: number }) => Promise<void>;
};

export const createPaymentGateway = (
  baseUrl: string,
  apiKey: string,
): PaymentGateway => ({
  refund: async ({ paymentId, amount }) => {
    const res = await fetch(`${baseUrl}/v1/payments/${paymentId}/refunds`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ amount }),
    });
    if (!res.ok) {
      throw new Error(`refund failed: ${res.status}`);
    }
  },
});
