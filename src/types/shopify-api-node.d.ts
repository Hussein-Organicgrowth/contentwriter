declare module "shopify-api-node" {
  interface ShopifyConfig {
    shopName: string;
    accessToken: string;
    apiVersion: string;
  }

  interface ShopifyProduct {
    id: number;
    title: string;
    body_html: string;
    vendor: string;
    product_type: string;
    created_at: string;
    handle: string;
    updated_at: string;
    published_at: string;
    status: string;
    images: Array<{
      id: number;
      alt: string;
      position: number;
      product_id: number;
      created_at: string;
      updated_at: string;
      width: number;
      height: number;
      src: string;
    }>;
    image: {
      id: number;
      alt: string;
      position: number;
      product_id: number;
      created_at: string;
      updated_at: string;
      width: number;
      height: number;
      src: string;
    };
  }

  interface ShopifyClient {
    collection: {
      products(collectionId: string): Promise<ShopifyProduct[]>;
    };
  }

  export default class Shopify implements ShopifyClient {
    constructor(config: ShopifyConfig);
    collection: {
      products(collectionId: string): Promise<ShopifyProduct[]>;
    };
  }
}
