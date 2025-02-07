import Shopify from "shopify-api-node";

export const getShopifyClient = (storeName: string, accessToken: string) => {
  return new Shopify({
    shopName: storeName,
    accessToken: accessToken,
    apiVersion: "2024-01",
  });
};
