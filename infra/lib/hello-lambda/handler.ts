import { products } from "./mock-data";

const defaultHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

export async function getProductsList() {
  return {
    statusCode: 200,
    headers: defaultHeaders,
    body: JSON.stringify(products),
  };
}

type GetProductsByIdEvent = {
  pathParameters?: { productId?: string };
};

export async function getProductsById(event: GetProductsByIdEvent) {
  const productId = event.pathParameters?.productId;
  if (!productId) {
    return {
      statusCode: 400,
      headers: defaultHeaders,
      body: JSON.stringify({ message: "Product id is required" }),
    };
  }

  const product = products.find((item) => item.id === productId);

  if (!product) {
    return {
      statusCode: 404,
      headers: defaultHeaders,
      body: JSON.stringify({ message: "Product not found" }),
    };
  }

  return {
    statusCode: 200,
    headers: defaultHeaders,
    body: JSON.stringify(product),
  };
}