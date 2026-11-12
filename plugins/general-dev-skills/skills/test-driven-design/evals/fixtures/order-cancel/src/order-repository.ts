import type { Sql } from './db';

export type Order = {
  id: string;
  status: 'pending' | 'paid' | 'shipped' | 'cancelled';
  total: number;
  paymentId: string;
  paidAt: Date;
  cancelledAt?: Date;
  refundAmount?: number;
};

export type OrderRepository = {
  findById: (id: string) => Promise<Order | undefined>;
  save: (order: Order) => Promise<void>;
};

export const createOrderRepository = (sql: Sql): OrderRepository => ({
  findById: async (id) => {
    const rows = await sql<Order>('select * from orders where id = $1', [id]);
    return rows[0];
  },
  save: async (order) => {
    await sql(
      'update orders set status = $2, cancelled_at = $3, refund_amount = $4 where id = $1',
      [
        order.id,
        order.status,
        order.cancelledAt ?? null,
        order.refundAmount ?? null,
      ],
    );
  },
});
