import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { CartItemEntity } from './cart-item.entity';
import { CartStatus } from './cart-status.enum';

@Entity({ name: 'carts' })
export class CartEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'text' })
  userId: string;

  @Column({
    type: 'enum',
    enum: CartStatus,
    default: CartStatus.OPEN,
  })
  status: CartStatus;

  @OneToMany(() => CartItemEntity, (item) => item.cart, {
    cascade: ['insert', 'update'],
    eager: true,
  })
  items: CartItemEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
