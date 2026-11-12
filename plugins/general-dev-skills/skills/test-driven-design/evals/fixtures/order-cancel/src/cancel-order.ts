import type { Logger } from './logger';
import type { Metrics } from './metrics';
import type { OrderRepository } from './order-repository';
import type { PaymentGateway } from './payment-gateway';

export type CancelResult =
  | { ok: true; refundAmount: number }
  | {
      ok: false;
      reason:
        | 'not_found'
        | 'already_shipped'
        | 'already_cancelled'
        | 'refund_failed';
    };

const FULL_REFUND_WINDOW_MS = 24 * 60 * 60 * 1000;
const LATE_CANCEL_FEE_RATE = 0.1;

export const cancelOrder = async (
  deps: {
    orders: OrderRepository;
    payments: PaymentGateway;
    logger: Logger;
    metrics: Metrics;
  },
  input: { orderId: string; requestedBy: string; now: Date },
): Promise<CancelResult> => {
  const { orders, payments, logger, metrics } = deps;
  logger.info('cancel_order.start', {
    orderId: input.orderId,
    requestedBy: input.requestedBy,
  });

  const order = await orders.findById(input.orderId);
  if (!order) {
    logger.warn('cancel_order.not_found', { orderId: input.orderId });
    metrics.increment('cancel_order.failed', { reason: 'not_found' });
    return { ok: false, reason: 'not_found' };
  }
  if (order.status === 'shipped') {
    logger.warn('cancel_order.already_shipped', {
      orderId: order.id,
      status: order.status,
    });
    metrics.increment('cancel_order.failed', { reason: 'already_shipped' });
    return { ok: false, reason: 'already_shipped' };
  }
  if (order.status === 'cancelled') {
    logger.info('cancel_order.already_cancelled', { orderId: order.id });
    return { ok: false, reason: 'already_cancelled' };
  }

  const elapsed = input.now.getTime() - order.paidAt.getTime();
  const refundAmount =
    elapsed <= FULL_REFUND_WINDOW_MS
      ? order.total
      : Math.floor(order.total * (1 - LATE_CANCEL_FEE_RATE));
  logger.debug('cancel_order.refund_calculated', {
    orderId: order.id,
    elapsed,
    refundAmount,
  });

  try {
    await payments.refund({ paymentId: order.paymentId, amount: refundAmount });
  } catch (error) {
    logger.error('cancel_order.refund_failed', { orderId: order.id, error });
    metrics.increment('cancel_order.failed', { reason: 'refund_failed' });
    return { ok: false, reason: 'refund_failed' };
  }

  await orders.save({
    ...order,
    status: 'cancelled',
    cancelledAt: input.now,
    refundAmount,
  });
  logger.info('cancel_order.done', { orderId: order.id, refundAmount });
  metrics.increment('cancel_order.succeeded');
  metrics.histogram('cancel_order.refund_amount', refundAmount);
  return { ok: true, refundAmount };
};
