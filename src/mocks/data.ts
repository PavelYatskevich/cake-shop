import { OrderStatus } from "~/constants/order";
import { CartItem } from "~/models/CartItem";
import { Order } from "~/models/Order";
import { AvailableProduct, Product } from "~/models/Product";

export const products: Product[] = [
  {
    description:
      "Rich cocoa sponge layers with dark chocolate ganache and fresh seasonal berries.",
    id: "7567ec4b-b10c-48c5-9345-fc73c48a80aa",
    price: 24,
    title: "Velvet chocolate layer cake",
  },
  {
    description:
      "Buttery tart shell, bright lemon curd, and raspberries with a hint of vanilla.",
    id: "7567ec4b-b10c-48c5-9345-fc73c48a80a1",
    price: 15,
    title: "Lemon raspberry tart",
  },
  {
    description:
      "Creamy New York–style cheesecake with salted caramel drizzle and pecan crumble.",
    id: "7567ec4b-b10c-48c5-9345-fc73c48a80a3",
    price: 23,
    title: "Salted caramel cheesecake",
  },
  {
    description:
      "Box of six — pistachio, rose, and chocolate shells with silky buttercream.",
    id: "7567ec4b-b10c-48c5-9345-fc73348a80a1",
    price: 15,
    title: "Assorted French macarons (6)",
  },
  {
    description:
      "Espresso-soaked ladyfingers, mascarpone mousse, and a dusting of cocoa.",
    id: "7567ec4b-b10c-48c5-9445-fc73c48a80a2",
    price: 23,
    title: "Classic tiramisu",
  },
  {
    description:
      "Four vanilla bean cupcakes with Swiss meringue buttercream and sprinkles.",
    id: "7567ec4b-b10c-45c5-9345-fc73c48a80a1",
    price: 15,
    title: "Vanilla bean cupcakes (4)",
  },
];

export const availableProducts: AvailableProduct[] = products.map(
  (product, index) => ({ ...product, count: index + 1 })
);

export const cart: CartItem[] = [
  {
    product: {
      description:
        "Rich cocoa sponge layers with dark chocolate ganache and fresh seasonal berries.",
      id: "7567ec4b-b10c-48c5-9345-fc73c48a80aa",
      price: 24,
      title: "Velvet chocolate layer cake",
    },
    count: 2,
  },
  {
    product: {
      description:
        "Four vanilla bean cupcakes with Swiss meringue buttercream and sprinkles.",
      id: "7567ec4b-b10c-45c5-9345-fc73c48a80a1",
      price: 15,
      title: "Vanilla bean cupcakes (4)",
    },
    count: 5,
  },
];

export const orders: Order[] = [
  {
    id: "1",
    address: {
      address: "some address",
      firstName: "Name",
      lastName: "Surname",
      comment: "",
    },
    items: [
      { productId: "7567ec4b-b10c-48c5-9345-fc73c48a80aa", count: 2 },
      { productId: "7567ec4b-b10c-45c5-9345-fc73c48a80a1", count: 5 },
    ],
    statusHistory: [
      { status: OrderStatus.Open, timestamp: Date.now(), comment: "New order" },
    ],
  },
  {
    id: "2",
    address: {
      address: "another address",
      firstName: "John",
      lastName: "Doe",
      comment: "Ship fast!",
    },
    items: [{ productId: "7567ec4b-b10c-48c5-9345-fc73c48a80aa", count: 3 }],
    statusHistory: [
      {
        status: OrderStatus.Sent,
        timestamp: Date.now(),
        comment: "Fancy order",
      },
    ],
  },
];
