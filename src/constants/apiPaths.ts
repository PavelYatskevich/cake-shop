/** Base URLs without trailing slash; override service URLs via Vite env vars after CDK deploy. */
const API_PATHS = {
  product: "https://fn4tlfb8nk.execute-api.us-east-1.amazonaws.com/prod",
  order: "https://.execute-api.eu-west-1.amazonaws.com/dev",
  import:
    import.meta.env.VITE_API_IMPORT ??
    "https://.execute-api.eu-west-1.amazonaws.com/dev",
  bff: "https://.execute-api.eu-west-1.amazonaws.com/dev",
  cart:
    import.meta.env.VITE_API_CART ??
    "https://.execute-api.eu-west-1.amazonaws.com/dev",
};

export default API_PATHS;
