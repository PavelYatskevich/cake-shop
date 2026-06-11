import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { CartEntity } from './cart.entity';

@Entity({ name: 'cart_items' })
export class CartItemEntity {
  @PrimaryColumn({ name: 'cart_id', type: 'uuid' })
  cartId: string;

  @ManyToOne(() => CartEntity, (cart) => cart.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cart_id' })
  cart: CartEntity;

  @PrimaryColumn({ name: 'product_id', type: 'text' })
  productId: string;

  @Column({ type: 'integer' })
  count: number;
}
