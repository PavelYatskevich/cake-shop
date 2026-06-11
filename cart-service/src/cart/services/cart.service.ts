import { BadRequestException, Injectable } from '@nestjs/common';

import { Cart } from '../models';
import { CartEntity, CartItemEntity, CartStatus } from '../entities';
import { DatabaseService } from '../../database/database.service';

type CartItemPayload = {
  productId?: string;
  product?: { id?: string };
  count?: number | string;
};

type CartUpdatePayload = CartItemPayload & {
  items?: CartItemPayload[];
};

@Injectable()
export class CartService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findByUserId(userId: string): Promise<Cart> {
    const cart = await this.findOpenCartEntity(userId);

    return cart ? this.toCart(cart) : null;
  }

  async createByUserId(userId: string): Promise<Cart> {
    const dataSource = await this.databaseService.getDataSource();
    const cartRepository = dataSource.getRepository(CartEntity);
    const cart = cartRepository.create({
      userId,
      status: CartStatus.OPEN,
      items: [],
    });

    return this.toCart(await cartRepository.save(cart));
  }

  async findOrCreateByUserId(userId: string): Promise<Cart> {
    const userCart = await this.findByUserId(userId);

    if (userCart) {
      return userCart;
    }

    return this.createByUserId(userId);
  }

  async updateByUserId(userId: string, payload: CartUpdatePayload): Promise<Cart> {
    const cart = await this.ensureOpenCartEntity(userId);
    const dataSource = await this.databaseService.getDataSource();
    const itemRepository = dataSource.getRepository(CartItemEntity);

    if (Array.isArray(payload.items)) {
      const items = payload.items.map((item) => this.normalizeItem(item)).filter((item) => item.count > 0);

      await itemRepository.delete({ cartId: cart.id });
      await itemRepository.save(items.map((item) => itemRepository.create({ ...item, cartId: cart.id })));

      return this.findOrCreateByUserId(userId);
    }

    const item = this.normalizeItem(payload);

    if (item.count <= 0) {
      await itemRepository.delete({ cartId: cart.id, productId: item.productId });
    } else {
      await itemRepository.save(itemRepository.create({ ...item, cartId: cart.id }));
    }

    return this.findOrCreateByUserId(userId);
  }

  async removeByUserId(userId: string): Promise<void> {
    const cart = await this.findOpenCartEntity(userId);

    if (!cart) {
      return;
    }

    const dataSource = await this.databaseService.getDataSource();
    await dataSource.getRepository(CartEntity).delete({ id: cart.id });
  }

  async removeItemByUserId(userId: string, productId: string): Promise<Cart> {
    const cart = await this.findOpenCartEntity(userId);

    if (!cart) {
      return this.createByUserId(userId);
    }

    const dataSource = await this.databaseService.getDataSource();
    await dataSource.getRepository(CartItemEntity).delete({ cartId: cart.id, productId });

    return this.findOrCreateByUserId(userId);
  }

  async markOrderedByUserId(userId: string): Promise<Cart> {
    const cart = await this.findOpenCartEntity(userId);

    if (!cart) {
      return null;
    }

    cart.status = CartStatus.ORDERED;
    const dataSource = await this.databaseService.getDataSource();
    await dataSource.getRepository(CartEntity).save(cart);

    return this.toCart(cart);
  }

  private async ensureOpenCartEntity(userId: string): Promise<CartEntity> {
    const cart = await this.findOpenCartEntity(userId);

    if (cart) {
      return cart;
    }

    const dataSource = await this.databaseService.getDataSource();
    const cartRepository = dataSource.getRepository(CartEntity);

    return cartRepository.save(cartRepository.create({ userId, status: CartStatus.OPEN, items: [] }));
  }

  private async findOpenCartEntity(userId: string): Promise<CartEntity> {
    const dataSource = await this.databaseService.getDataSource();

    return dataSource.getRepository(CartEntity).findOne({
      where: { userId, status: CartStatus.OPEN },
    });
  }

  private normalizeItem(item: CartItemPayload): { productId: string; count: number } {
    const productId = item.productId || (item.product && item.product.id);
    const count = Number(item.count);

    if (!productId) {
      throw new BadRequestException('productId is required');
    }
    if (!Number.isInteger(count) || count < 0) {
      throw new BadRequestException('count must be a non-negative integer');
    }

    return { productId, count };
  }

  private toCart(cart: CartEntity): Cart {
    return {
      id: cart.id,
      userId: cart.userId,
      status: cart.status,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      items: (cart.items || [])
        .map((item) => ({
          productId: item.productId,
          count: item.count,
        }))
        .sort((left, right) => left.productId.localeCompare(right.productId)),
    };
  }
}
