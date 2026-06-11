export type Product = {
  id: string,
  title: string,
  description: string,
  price: number,
};


export type CartItem = {
  product?: Product,
  productId: string,
  count: number,
}

export type Cart = {
  id: string,
  userId: string,
  status: 'OPEN' | 'ORDERED',
  items: CartItem[],
  createdAt?: Date | string,
  updatedAt?: Date | string,
}
