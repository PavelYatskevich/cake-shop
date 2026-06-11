import axios, { AxiosError } from "axios";
import React from "react";
import { useQuery, useQueryClient, useMutation } from "react-query";
import API_PATHS from "~/constants/apiPaths";
import { CartItem } from "~/models/CartItem";
import { Product } from "~/models/Product";

const CART_PATH = `${API_PATHS.cart}/api/profile/cart`;

type ApiCartItem = {
  productId?: string;
  product?: Product;
  count: number;
};

type ApiCartResponse =
  | CartItem[]
  | {
      data?: {
        cart?: {
          items?: ApiCartItem[];
        };
      };
      cart?: {
        items?: ApiCartItem[];
      };
    };

const getAuthHeaders = () => ({
  Authorization: `Basic ${localStorage.getItem("authorization_token")}`,
});

function extractCartItems(response: ApiCartResponse): ApiCartItem[] {
  if (Array.isArray(response)) {
    return response;
  }

  return response.data?.cart?.items ?? response.cart?.items ?? [];
}

function createFallbackProduct(productId: string): Product {
  return {
    id: productId,
    title: productId,
    description: "",
    price: 0,
    count: 0,
  };
}

export function useCart() {
  return useQuery<CartItem[], AxiosError>("cart", async () => {
    const res = await axios.get<ApiCartResponse>(CART_PATH, {
      headers: getAuthHeaders(),
    });
    const cartItems = extractCartItems(res.data);
    const shouldLoadProducts = cartItems.some((item) => !item.product);
    const products = shouldLoadProducts
      ? (await axios.get<Product[]>(`${API_PATHS.product}/products`)).data
      : [];
    const productsById = new Map(
      products
        .filter((product) => product.id)
        .map((product) => [product.id, product])
    );

    return cartItems
      .map((item) => {
        const productId = item.product?.id ?? item.productId;
        if (!productId) {
          return undefined;
        }

        return {
          product:
            item.product ??
            productsById.get(productId) ??
            createFallbackProduct(productId),
          count: item.count,
        };
      })
      .filter((item): item is CartItem => Boolean(item));
  });
}

export function useCartData() {
  const queryClient = useQueryClient();
  return queryClient.getQueryData<CartItem[]>("cart");
}

export function useInvalidateCart() {
  const queryClient = useQueryClient();
  return React.useCallback(
    () => queryClient.invalidateQueries("cart", { exact: true }),
    []
  );
}

export function useUpsertCart() {
  return useMutation((values: CartItem) =>
    axios.put(
      CART_PATH,
      { productId: values.product.id, count: values.count },
      {
        headers: getAuthHeaders(),
      }
    )
  );
}

export function useDeleteCartItem() {
  return useMutation((productId: string) =>
    axios.delete(`${CART_PATH}/${productId}`, {
      headers: getAuthHeaders(),
    })
  );
}
