"use client";

import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "react-hot-toast";
import DOMPurify from "isomorphic-dompurify";
import RichTextEditor from "@/components/RichTextEditor";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Switch } from "@/components/ui/switch";

interface PendingDescription {
  productId: string;
  oldDescription: string;
  newDescription: string;
  generatedAt: string;
  oldSeoTitle?: string;
  oldSeoDescription?: string;
  newSeoTitle?: string;
  newSeoDescription?: string;
  summaryHtml?: string;
}

interface DescriptionHistory {
  id: string;
  description: string;
  createdAt: string;
  isActive: boolean;
}

interface PendingDescriptionWithHistory extends PendingDescription {
  isHistory?: boolean;
  timestamp?: string;
}

interface ShopifyProduct {
  id: string;
  title: string;
  body_html: string;
  vendor: string;
  status: string;
  images: { src: string }[];
  descriptionHistory?: DescriptionHistory[];
  isPublished?: boolean;
  publishedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
}

interface ProductsResponse {
  products: ShopifyProduct[];
  total: number;
  totalPages: number;
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  pagination: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}

type StatusType = "all" | "active" | "archived" | "draft";
type LanguageType =
  | "en-US"
  | "en-GB"
  | "es"
  | "fr"
  | "de"
  | "it"
  | "pt"
  | "nl"
  | "pl"
  | "sv"
  | "da"
  | "no"
  | "fi";
type CountryType =
  | "US"
  | "GB"
  | "CA"
  | "AU"
  | "DE"
  | "FR"
  | "ES"
  | "IT"
  | "NL"
  | "SE"
  | "NO"
  | "DK"
  | "FI"
  | "PL"
  | "BR"
  | "MX";

type DescriptionPlacementMode = "body_html" | "metafield";

type MetafieldTypeOption =
  | "single_line_text_field"
  | "multi_line_text_field"
  | "rich_text_editor";

interface DescriptionPlacementSettings {
  mode: DescriptionPlacementMode;
  metafieldNamespace: string;
  metafieldKey: string;
  metafieldType: MetafieldTypeOption;
}

const defaultDescriptionPlacement: DescriptionPlacementSettings = {
  mode: "body_html",
  metafieldNamespace: "",
  metafieldKey: "",
  metafieldType: "multi_line_text_field",
};

const normalizeDescriptionPlacement = (
  raw?: Partial<DescriptionPlacementSettings> | null
): DescriptionPlacementSettings => {
  if (!raw) {
    return { ...defaultDescriptionPlacement };
  }

  if (raw.mode === "metafield") {
    const namespace = raw.metafieldNamespace?.trim() || "";
    const key = raw.metafieldKey?.trim() || "";
    const type: MetafieldTypeOption =
      raw.metafieldType === "single_line_text_field"
        ? "single_line_text_field"
        : raw.metafieldType === "rich_text_editor"
        ? "rich_text_editor"
        : "multi_line_text_field";

    if (!namespace || !key) {
      return { ...defaultDescriptionPlacement };
    }

    return {
      mode: "metafield",
      metafieldNamespace: namespace,
      metafieldKey: key,
      metafieldType: type,
    };
  }

  return { ...defaultDescriptionPlacement };
};

const sanitizeDescriptionPlacement = (
  placement: DescriptionPlacementSettings
): DescriptionPlacementSettings => {
  if (placement.mode === "metafield") {
    return {
      mode: "metafield",
      metafieldNamespace: placement.metafieldNamespace.trim(),
      metafieldKey: placement.metafieldKey.trim(),
      metafieldType: placement.metafieldType,
    };
  }

  return { ...defaultDescriptionPlacement };
};

const truncateHtmlForPreview = (html: string, maxLength = 280) => {
  if (!html) return "";
  const sanitized = html.replace(/\s+/g, " ").trim();
  if (sanitized.length <= maxLength) return sanitized;
  return `${sanitized.slice(0, maxLength - 3)}...`;
};

export default function ProductsPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ShopifyProduct[]>(
    []
  );
  const [storeName, setStoreName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [company, setCompany] = useState<string>("");
  const [storeNameError, setStoreNameError] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<StatusType>("all");
  const [isGenerating, setIsGenerating] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set()
  );
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageType>("da");
  const [selectedCountry, setSelectedCountry] = useState<CountryType>("DK");
  const [pendingDescriptions, setPendingDescriptions] = useState<
    Record<string, PendingDescription>
  >({});
  const [publishedProducts, setPublishedProducts] = useState<Set<string>>(
    new Set()
  );
  const [showPublishedOnly, setShowPublishedOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProduct | null>(
    null
  );
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [showNoPendingOnly, setShowNoPendingOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [currentStoreName, setCurrentStoreName] = useState("");
  const [isDisconnectConfirmOpen, setIsDisconnectConfirmOpen] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const nextCursorRef = useRef<string | null>(null);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
  } | null>(null);
  const [loadedProductsCount, setLoadedProductsCount] = useState(0);
  const [autoLoadEnabled, setAutoLoadEnabled] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25); // Increased default page size
  const [totalPages, setTotalPages] = useState(1);
  const [virtualizedView, setVirtualizedView] = useState(false);
  const [descriptionPlacement, setDescriptionPlacement] =
    useState<DescriptionPlacementSettings>({
      ...defaultDescriptionPlacement,
    });
  const [syncSeoFields, setSyncSeoFields] = useState(false);
  const isCompareOpenRef = useRef(false);

  useEffect(() => {
    isCompareOpenRef.current = isCompareOpen;
  }, [isCompareOpen]);

  // Debug function to check current state
  const debugState = () => {
    console.log("Current State Debug:", {
      isGenerating,
      pendingDescriptionsCount: Object.keys(pendingDescriptions).length,
      pendingDescriptions,
      filteredProductsCount: filteredProducts.length,
      company,
      isConnected,
    });
  };

  // Add debug to window for easy access
  useEffect(() => {
    (window as any).debugProductsState = debugState;
  }, [
    isGenerating,
    pendingDescriptions,
    filteredProducts,
    company,
    isConnected,
  ]);

  useEffect(() => {
    // Get company from localStorage
    console.log("Company:", company);
    const storedCompany = localStorage.getItem("company");
    if (storedCompany) {
      setCompany(storedCompany);
      checkShopifyConnection(storedCompany);
      fetchPendingDescriptions(storedCompany);
      fetchShopifySettings(storedCompany);
    }
  }, []);

  useEffect(() => {
    if (company && isConnected) {
      console.log("Initial load triggered:", { company, isConnected });
      // Reset pagination state when starting fresh
      setCurrentCursor(null);
      setHasMore(true);
      setProducts([]);
      fetchProducts(company);
    }
  }, [company, isConnected]);

  useEffect(() => {
    filterProducts();
  }, [
    selectedStatus,
    products,
    searchQuery,
    showPendingOnly,
    showNoPendingOnly,
    showPublishedOnly,
    pendingDescriptions,
    publishedProducts,
  ]);

  // Calculate total pages whenever filtered products changes
  useEffect(() => {
    setTotalPages(Math.ceil(filteredProducts.length / pageSize));
    // Also update progress display
    if (progress) {
      console.log(
        `Loading progress: ${progress.current}/${progress.total} (${progress.percentage}%)`
      );
    }
  }, [filteredProducts, pageSize, progress]);

  const filterProducts = () => {
    console.log("Starting filterProducts with:", {
      totalProducts: products.length,
      selectedStatus,
      searchQuery,
      showPendingOnly,
      showNoPendingOnly,
      showPublishedOnly,
      pendingDescriptionsCount: Object.keys(pendingDescriptions).length,
      publishedProductsCount: publishedProducts.size,
    });

    let filtered = products;

    // Filter by pending status if enabled (pending but NOT published)
    if (showPendingOnly) {
      filtered = filtered.filter(
        (product) =>
          pendingDescriptions[product.id] &&
          !publishedProducts.has(String(product.id))
      );
    }

    // Filter by NO pending status if enabled (products that need content)
    if (showNoPendingOnly) {
      filtered = filtered.filter((product) => !pendingDescriptions[product.id]);
    }

    // Filter by published status if enabled
    if (showPublishedOnly) {
      filtered = filtered.filter((product) =>
        publishedProducts.has(String(product.id))
      );
    }

    // Filter by status
    if (selectedStatus !== "all") {
      filtered = filtered.filter(
        (product) => product.status.toLowerCase() === selectedStatus
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((product) =>
        product.title.toLowerCase().includes(query)
      );
    }

    console.log("Filtered products result:", {
      filteredCount: filtered.length,
      originalCount: products.length,
    });

    setFilteredProducts(filtered);
  };

  const toggleProductSelection = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const toggleAllProducts = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  const checkShopifyConnection = async (companyName: string) => {
    try {
      const response = await fetch(
        `/api/platform/shopify/test?company=${companyName}`
      );
      const data = await response.json();
      setIsConnected(data.connected);
      if (data.connected) {
        fetchProducts(companyName);
      }
    } catch (error) {
      console.error("Error checking Shopify connection:", error);
    }
  };

  const fetchShopifySettings = async (companyName: string) => {
    try {
      const response = await fetch(
        `/api/platform/shopify/settings?company=${companyName}`,
        {
          method: "GET",
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Shopify settings data:", data);
        if (data.settings && data.settings.credentials) {
          setCurrentStoreName(data.settings.credentials.storeName || "");
          console.log(
            "Current store name:",
            data.settings.credentials.storeName
          );
          // We don't set the access token for security reasons
          // It will be masked in the UI
        }

        setDescriptionPlacement(
          normalizeDescriptionPlacement(
            data.settings?.settings?.descriptionPlacement
          )
        );
        setSyncSeoFields(
          typeof data.settings?.settings?.syncSeoFields === "boolean"
            ? data.settings.settings.syncSeoFields
            : false
        );
      }
    } catch (error) {
      console.error("Error fetching Shopify settings:", error);
    }
  };

  const validateStoreName = (value: string) => {
    // Remove https:// or http:// if present
    value = value.replace(/^https?:\/\//, "");

    // Check if the URL matches the Shopify store format
    if (!value.match(/^[a-zA-Z0-9-]+\.myshopify\.com$/)) {
      setStoreNameError(
        "Please enter a valid Shopify store URL (e.g., your-store.myshopify.com)"
      );
      return false;
    }

    setStoreNameError("");
    return true;
  };

  const handleConnect = async () => {
    if (!company) {
      toast.error("Company information not found");
      return;
    }

    if (!validateStoreName(storeName)) {
      return;
    }

    try {
      setIsUpdatingSettings(true);
      const response = await fetch("/api/platform/shopify/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credentials: {
            storeName,
            accessToken,
          },
          enabled: true,
          company,
          descriptionPlacement:
            sanitizeDescriptionPlacement(descriptionPlacement),
          syncSeoFields,
        }),
      });

      if (response.ok) {
        toast.success("Successfully connected to Shopify");
        setIsConnected(true);
        setCurrentStoreName(storeName);
        fetchProducts(company);
      } else {
        throw new Error("Failed to connect");
      }
    } catch (error: unknown) {
      console.error("Error connecting to Shopify:", error);
      toast.error("Failed to connect to Shopify");
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleUpdateSettings = async () => {
    if (!company) {
      toast.error("Company information not found");
      return;
    }

    if (!validateStoreName(storeName)) {
      return;
    }

    try {
      setIsUpdatingSettings(true);

      // Prepare the request body with explicit type
      const requestBody: {
        credentials: {
          storeName: string;
          accessToken?: string;
        };
        enabled: boolean;
        company: string;
        keepExistingToken?: boolean;
        descriptionPlacement: DescriptionPlacementSettings;
        syncSeoFields: boolean;
      } = {
        credentials: {
          storeName,
        },
        enabled: true,
        company,
        descriptionPlacement:
          sanitizeDescriptionPlacement(descriptionPlacement),
        syncSeoFields,
      };

      // Only include the access token if it's provided
      if (accessToken.trim() !== "") {
        requestBody.credentials.accessToken = accessToken;
      } else {
        // If no new token is provided, we need to indicate to keep the existing one
        requestBody.keepExistingToken = true;
      }

      const response = await fetch("/api/platform/shopify/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        toast.success("Successfully updated Shopify settings");
        setIsConnected(true);
        setCurrentStoreName(storeName);
        fetchProducts(company);
        setIsSettingsOpen(false);
      } else {
        throw new Error("Failed to update settings");
      }
    } catch (error: unknown) {
      console.error("Error updating Shopify settings:", error);
      toast.error("Failed to update Shopify settings");
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const openSettingsDialog = () => {
    setStoreName(currentStoreName);
    setAccessToken(""); // Clear for security
    setIsSettingsOpen(true);
  };

  const fetchProducts = async (companyName: string, cursor?: string | null) => {
    try {
      console.log("Starting fetchProducts with:", { companyName, cursor });

      if (!cursor) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const queryParams = new URLSearchParams({
        company: companyName,
        pageSize: "250",
        ...(cursor && { cursor }),
      });

      console.log("Fetching with query params:", queryParams.toString());

      const [productsResponse, pendingResponse, publishedResponse] =
        await Promise.all([
          fetch(
            `/api/platform/shopify/products?${queryParams}${
              cursor ? "" : "&bypassCache=false"
            }`
          ),
          fetch(`/api/platform/shopify/pending?company=${companyName}`),
          fetch(`/api/platform/shopify/published?company=${companyName}`),
        ]);

      console.log("API responses status:", {
        products: productsResponse.status,
        pending: pendingResponse.status,
        published: publishedResponse.status,
      });

      if (!productsResponse.ok) {
        const errorText = await productsResponse.text();
        console.error("Products API error:", errorText);
        throw new Error("Failed to fetch products");
      }

      const productsData: ProductsResponse = await productsResponse.json();
      console.log("Raw API response:", JSON.stringify(productsData, null, 2));
      console.log("Received products data:", {
        total: productsData.total,
        totalPages: productsData.totalPages,
        productsCount: productsData.products.length,
        progress: productsData.progress,
        pagination: productsData.pagination,
      });

      // Update products state based on whether this is a new load or pagination
      if (cursor) {
        console.log("Appending products to existing list");
        setProducts((prev) => {
          const uniqueProducts = new Map();
          prev.forEach((product) => uniqueProducts.set(product.id, product));
          productsData.products.forEach((product) =>
            uniqueProducts.set(product.id, product)
          );
          const newProducts = Array.from(uniqueProducts.values());

          // Update loaded count
          setLoadedProductsCount(newProducts.length);

          return newProducts;
        });
      } else {
        console.log("Setting new products list");
        setProducts(productsData.products);
        setLoadedProductsCount(productsData.products.length);
      }

      // Update progress based on API response
      if (productsData.progress) {
        setProgress({
          current: cursor
            ? loadedProductsCount + productsData.products.length
            : productsData.progress.current,
          total: productsData.progress.total,
          percentage: cursor
            ? Math.min(
                100,
                ((loadedProductsCount + productsData.products.length) /
                  productsData.progress.total) *
                  100
              )
            : productsData.progress.percentage,
        });
      }

      // Process published products data if available
      if (publishedResponse.ok) {
        const publishedData = await publishedResponse.json();
        console.log("Published data:", {
          publishedProductsCount: publishedData.publishedProducts?.length || 0,
        });

        if (
          publishedData.publishedProducts &&
          Array.isArray(publishedData.publishedProducts)
        ) {
          const publishedSet = new Set<string>();
          setProducts((prevProducts) => {
            const updatedProducts = prevProducts.map(
              (product: ShopifyProduct) => {
                const productIdStr = String(product.id);
                const publishedInfo = publishedData.publishedProducts.find(
                  (p: { productId: string; publishedAt: string }) =>
                    String(p.productId) === productIdStr
                );

                if (publishedInfo) {
                  publishedSet.add(productIdStr);
                  return {
                    ...product,
                    isPublished: true,
                    publishedAt: publishedInfo.publishedAt,
                  };
                }
                return product;
              }
            );

            setPublishedProducts(publishedSet);
            return updatedProducts;
          });
        }
      }

      // Handle pending descriptions and history
      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json();
        console.log("Pending data:", {
          pendingDescriptionsCount:
            pendingData.pendingDescriptions?.length || 0,
        });

        if (pendingData.pendingDescriptions) {
          const historyItems = pendingData.pendingDescriptions.filter(
            (desc: PendingDescriptionWithHistory) => desc.isHistory
          );
          const pendingItems = pendingData.pendingDescriptions.filter(
            (desc: PendingDescriptionWithHistory) => !desc.isHistory
          );

          console.log("Filtered pending data:", {
            historyItemsCount: historyItems.length,
            pendingItemsCount: pendingItems.length,
          });

          const historyMap = historyItems.reduce(
            (
              acc: Record<string, DescriptionHistory[]>,
              desc: PendingDescriptionWithHistory
            ) => {
              if (!acc[desc.productId]) {
                acc[desc.productId] = [];
              }
              if (desc.timestamp) {
                acc[desc.productId].push({
                  id: desc.timestamp,
                  description: desc.oldDescription,
                  createdAt: desc.timestamp,
                  isActive: false,
                });
              }
              return acc;
            },
            {}
          );

          setProducts((prevProducts) => {
            const updatedProducts = prevProducts.map(
              (product: ShopifyProduct) => ({
                ...product,
                descriptionHistory: historyMap[product.id] || [],
              })
            );

            const descriptionsMap = pendingItems.reduce(
              (
                acc: Record<string, PendingDescription>,
                desc: PendingDescription
              ) => {
                acc[desc.productId] = desc;
                return acc;
              },
              {}
            );
            setPendingDescriptions((prev) => ({ ...prev, ...descriptionsMap }));

            return updatedProducts;
          });
        }
      }

      // Update pagination state
      if (productsData.pagination) {
        console.log("Setting pagination state:", productsData.pagination);
        setHasMore(productsData.pagination.hasNextPage);
        setCurrentCursor(productsData.pagination.endCursor);

        if (productsData.pagination.hasNextPage) {
          nextCursorRef.current = productsData.pagination.endCursor;
        }

        if (
          productsData.pagination.hasNextPage &&
          productsData.pagination.endCursor &&
          !isLoadingMore &&
          !isCompareOpenRef.current &&
          autoLoadEnabled
        ) {
          console.log("More products available, auto-loading next page");
          setTimeout(() => {
            if (!isCompareOpenRef.current && autoLoadEnabled) {
              loadMoreProducts(productsData.pagination.endCursor);
            }
          }, 1000); // Reduced delay for faster loading
        }
      }

      console.log("Current products state:", {
        productsCount: products.length,
        filteredProductsCount: filteredProducts.length,
      });

      filterProducts();
    } catch (error) {
      console.error("Error in fetchProducts:", error);
      toast.error("Failed to fetch products");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!isCompareOpen && nextCursorRef.current && hasMore && autoLoadEnabled) {
      const storedCompany = localStorage.getItem("company");
      if (storedCompany) {
        loadMoreProducts(nextCursorRef.current);
      }
    }
  }, [isCompareOpen, hasMore, autoLoadEnabled]);

  const loadMoreProducts = (
    cursor?: string | null,
    isManual: boolean = false
  ) => {
    const currentCompany = localStorage.getItem("company");
    console.log("loadMoreProducts called with state:", {
      company: currentCompany,
      cursor: cursor || currentCursor,
      isLoadingMore,
      hasMore,
      isCompareOpen: isCompareOpenRef.current,
      isManual,
    });

    // Only check autoLoadEnabled for automatic triggers
    if (isCompareOpenRef.current || (!autoLoadEnabled && !isManual)) {
      if (cursor) {
        nextCursorRef.current = cursor;
      }
      return;
    }

    if (currentCompany && !isLoadingMore && hasMore) {
      const nextCursor = cursor || currentCursor;
      nextCursorRef.current = nextCursor;
      console.log("Conditions met, proceeding to fetch more products");
      fetchProducts(currentCompany, nextCursor);
    } else {
      console.log("Conditions not met:", {
        hasCompany: !!currentCompany,
        hasCursor: !!(cursor || currentCursor),
        isNotLoading: !isLoadingMore,
        hasMoreItems: hasMore,
        isCompareOpen: isCompareOpenRef.current,
        autoLoadEnabled,
      });
    }
  };

  const fetchPendingDescriptions = async (companyName: string) => {
    try {
      const response = await fetch(
        `/api/platform/shopify/pending?company=${companyName}`
      );
      const data = await response.json();
      if (data.pendingDescriptions) {
        const descriptionsMap = data.pendingDescriptions.reduce(
          (
            acc: Record<string, PendingDescription>,
            desc: PendingDescription
          ) => {
            acc[desc.productId] = desc;
            return acc;
          },
          {}
        );
        setPendingDescriptions(descriptionsMap);
      }
    } catch (error) {
      console.error("Error fetching pending descriptions:", error);
    }
  };

  const generateAndSavePendingDescription = async (product: ShopifyProduct) => {
    try {
      console.log(
        `Starting generation for product: ${product.id} - ${product.title}`
      );

      // Set generating state immediately
      setIsGenerating((prev) => ({ ...prev, [product.id]: true }));

      // Force UI update
      await new Promise((resolve) => setTimeout(resolve, 100));

      console.log("Calling description generation API...");
      const generateResponse = await fetch("/api/generate/description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-description-destination": descriptionPlacement.mode,
        },
        body: JSON.stringify({
          title: product.title,
          company,
          existingDescription: product.body_html || "",
          language: selectedLanguage,
          targetCountry: selectedCountry,
          keyword: product.title,
        }),
      });

      if (!generateResponse.ok) {
        const errorText = await generateResponse.text();
        console.error("Description generation failed:", errorText);
        throw new Error(
          `Failed to generate description: ${generateResponse.status} - ${errorText}`
        );
      }

      console.log("Description generation successful, parsing response...");

      const {
        description: newDescription,
        seoTitle: generatedSeoTitle,
        seoDescription: generatedSeoDescription,
        summaryHtml,
      } = await generateResponse.json();

      const resolvedDescription =
        descriptionPlacement.mode === "metafield" && summaryHtml
          ? `${summaryHtml}
${newDescription}`
          : newDescription;

      const existingPending = pendingDescriptions[product.id];
      const baselineOldSeoTitle =
        existingPending?.oldSeoTitle ?? product.seoTitle ?? "";
      const baselineOldSeoDescription =
        existingPending?.oldSeoDescription ?? product.seoDescription ?? "";

      console.log("Saving pending description to database...");
      const pendingData = {
        productId: product.id,
        oldDescription: product.body_html || "",
        newDescription: resolvedDescription,
        company,
        oldSeoTitle: baselineOldSeoTitle,
        oldSeoDescription: baselineOldSeoDescription,
        newSeoTitle: generatedSeoTitle || "",
        newSeoDescription: generatedSeoDescription || "",
        summaryHtml: summaryHtml || "",
      };

      console.log("Pending data to save:", pendingData);

      // Save pending description
      const savePendingResponse = await fetch("/api/platform/shopify/pending", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pendingData),
      });

      if (!savePendingResponse.ok) {
        const errorText = await savePendingResponse.text();
        console.error("Failed to save pending description:", errorText);
        throw new Error(
          `Failed to save pending description: ${savePendingResponse.status} - ${errorText}`
        );
      }

      console.log("Pending description saved successfully");

      // Create the pending description object
      const newPendingDescription = {
        productId: product.id,
        oldDescription: product.body_html || "",
        newDescription: resolvedDescription,
        generatedAt: new Date().toISOString(),
        oldSeoTitle: baselineOldSeoTitle,
        oldSeoDescription: baselineOldSeoDescription,
        newSeoTitle: generatedSeoTitle || "",
        newSeoDescription: generatedSeoDescription || "",
        summaryHtml: summaryHtml || "",
      };

      console.log("Updating local state with:", newPendingDescription);

      // Update local state with new pending description
      setPendingDescriptions((prev) => {
        const updated = {
          ...prev,
          [product.id]: newPendingDescription,
        };
        console.log("Updated pending descriptions:", updated);
        return updated;
      });

      toast.success("Description generated and saved successfully!");

      // Force a re-render to show the pending state
      setTimeout(() => {
        filterProducts();
        debugState(); // Log state after update
      }, 100);
    } catch (error) {
      console.error("Error generating description:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to generate description";
      toast.error(errorMessage);
    } finally {
      // Update isGenerating state by removing the current product
      setIsGenerating((prev) => {
        const updated = { ...prev };
        delete updated[product.id];
        console.log("Updated generating state:", updated);
        return updated;
      });
    }
  };

  const handleBulkGenerate = async () => {
    if (selectedProducts.size === 0) {
      toast.error("Please select products to generate descriptions");
      return;
    }

    const CONCURRENT_LIMIT = 3; // Process 3 products at a time for optimal speed
    setIsBulkGenerating(true);
    setBulkProgress({ current: 0, total: selectedProducts.size });
    let successCount = 0;
    let failCount = 0;
    const updatedPendingDescriptions = { ...pendingDescriptions };

    try {
      const selectedProductsList = filteredProducts.filter((p) =>
        selectedProducts.has(p.id)
      );

      console.log(
        `[Bulk Generate] Starting generation for ${selectedProductsList.length} products with concurrency ${CONCURRENT_LIMIT}`
      );

      // Set all selected products to generating state
      const newGeneratingState = { ...isGenerating };
      selectedProductsList.forEach((product) => {
        newGeneratingState[product.id] = true;
      });
      setIsGenerating(newGeneratingState);

      // Process products in batches for parallel execution
      const processProduct = async (product: ShopifyProduct, index: number) => {
        try {
          console.log(`[Bulk Generate] Generating for: ${product.title}`);

          // Generate new description with unique parameters
          const generateResponse = await fetch("/api/generate/description", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-description-destination": descriptionPlacement.mode,
            },
            body: JSON.stringify({
              title: product.title,
              company,
              existingDescription: product.body_html || "",
              language: selectedLanguage,
              targetCountry: selectedCountry,
              timestamp: new Date().getTime(),
              productIndex: index,
              keyword: product.title,
            }),
          });

          if (!generateResponse.ok) {
            throw new Error(
              `Failed to generate description: ${generateResponse.status}`
            );
          }

          const {
            description: newDescription,
            seoTitle: generatedSeoTitle,
            seoDescription: generatedSeoDescription,
            summaryHtml,
          } = await generateResponse.json();

          const resolvedDescription =
            descriptionPlacement.mode === "metafield" && summaryHtml
              ? `${summaryHtml}\n${newDescription}`
              : newDescription;

          const existingPending = updatedPendingDescriptions[product.id];
          const baselineOldSeoTitle =
            existingPending?.oldSeoTitle ?? product.seoTitle ?? "";
          const baselineOldSeoDescription =
            existingPending?.oldSeoDescription ?? product.seoDescription ?? "";

          // Save pending description
          const savePendingResponse = await fetch(
            "/api/platform/shopify/pending",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                productId: product.id,
                oldDescription: product.body_html || "",
                newDescription: resolvedDescription,
                company,
                oldSeoTitle: baselineOldSeoTitle,
                oldSeoDescription: baselineOldSeoDescription,
                newSeoTitle: generatedSeoTitle || "",
                newSeoDescription: generatedSeoDescription || "",
                summaryHtml: summaryHtml || "",
              }),
            }
          );

          if (!savePendingResponse.ok) {
            throw new Error("Failed to save pending description");
          }

          // Update local state for this product
          updatedPendingDescriptions[product.id] = {
            productId: product.id,
            oldDescription: product.body_html || "",
            newDescription: resolvedDescription,
            generatedAt: new Date().toISOString(),
            oldSeoTitle: baselineOldSeoTitle,
            oldSeoDescription: baselineOldSeoDescription,
            newSeoTitle: generatedSeoTitle || "",
            newSeoDescription: generatedSeoDescription || "",
            summaryHtml: summaryHtml || "",
          };

          return { success: true, product };
        } catch (error) {
          console.error(`Failed to generate for ${product.title}:`, error);
          return { success: false, product, error };
        }
      };

      // Process in batches with concurrency limit
      for (let i = 0; i < selectedProductsList.length; i += CONCURRENT_LIMIT) {
        const batch = selectedProductsList.slice(i, i + CONCURRENT_LIMIT);
        const batchResults = await Promise.allSettled(
          batch.map((product, idx) => processProduct(product, i + idx))
        );

        // Process results
        batchResults.forEach((result) => {
          if (result.status === "fulfilled" && result.value.success) {
            successCount++;
          } else {
            failCount++;
          }
        });

        // Update progress
        setBulkProgress({
          current: successCount + failCount,
          total: selectedProducts.size,
        });

        // Update state after each batch
        setPendingDescriptions({ ...updatedPendingDescriptions });

        console.log(
          `[Bulk Generate] Batch ${
            Math.floor(i / CONCURRENT_LIMIT) + 1
          } completed: ${successCount} success, ${failCount} failed`
        );
      }

      toast.success(
        `Completed! Success: ${successCount}, Failed: ${failCount}`
      );
    } catch (error: unknown) {
      console.error("Error in bulk generation:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to complete bulk generation");
      }
    } finally {
      setIsBulkGenerating(false);
      setBulkProgress({ current: 0, total: 0 });
      setSelectedProducts(new Set());
      // Clear all generating states
      setIsGenerating({});
      // Ensure final state update
      setPendingDescriptions({ ...updatedPendingDescriptions });
    }
  };

  const handlePublish = async (product: ShopifyProduct) => {
    try {
      const pendingDescription = pendingDescriptions[product.id];
      if (!pendingDescription) return;

      console.log("Publishing product:", product.id);

      // Update Shopify product description first
      const updateResponse = await fetch("/api/platform/shopify/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: String(product.id),
          description: pendingDescription.newDescription,
          company,
          seoTitle: pendingDescription.newSeoTitle,
          seoDescription: pendingDescription.newSeoDescription,
          summaryHtml:
            descriptionPlacement.mode === "metafield"
              ? truncateHtmlForPreview(
                  pendingDescription.summaryHtml || "",
                  1000
                )
              : undefined,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to update product");
      }

      // Get current timestamp
      const publishedAt = new Date().toISOString();

      // Save published status to database
      const savePublishedResponse = await fetch(
        "/api/platform/shopify/published",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: String(product.id),
            company,
            isPublished: true,
            publishedAt,
          }),
        }
      );

      if (!savePublishedResponse.ok) {
        console.warn(
          "Failed to save published status to database, but product was updated"
        );
        console.error("Error response:", await savePublishedResponse.text());
      }

      // Get the updated product data
      const { product: updatedProduct } = await updateResponse.json();

      setProducts((prevProducts) =>
        prevProducts.map((p) =>
          String(p.id) === String(product.id)
            ? {
                ...p,
                ...updatedProduct,
                body_html:
                  descriptionPlacement.mode === "metafield"
                    ? p.body_html
                    : pendingDescription.newDescription,
                isPublished: true,
                publishedAt,
              }
            : p
        )
      );

      setPublishedProducts((prev) => {
        const newSet = new Set(prev);
        newSet.add(String(product.id));
        return newSet;
      });

      setPendingDescriptions((prev) => {
        const newPending = { ...prev };
        delete newPending[product.id];
        return newPending;
      });

      if (
        selectedProduct &&
        String(selectedProduct.id) === String(product.id)
      ) {
        setSelectedProduct((prev) =>
          prev
            ? {
                ...prev,
                ...updatedProduct,
                body_html:
                  descriptionPlacement.mode === "metafield"
                    ? truncateHtmlForPreview(
                        pendingDescription.summaryHtml || prev.body_html || ""
                      )
                    : pendingDescription.newDescription,
                seoTitle: pendingDescription.newSeoTitle || prev.seoTitle,
                seoDescription:
                  pendingDescription.newSeoDescription || prev.seoDescription,
                isPublished: true,
                publishedAt,
              }
            : prev
        );
      }

      // Refresh pending descriptions to ensure state is in sync with database
      // Don't refresh products to avoid UI jumps
      await fetchPendingDescriptions(company);

      toast.success("Product description updated successfully");
    } catch (error) {
      console.error("Error publishing description:", error);
      toast.error("Failed to publish description");
    }
  };

  const handleDiscardChanges = async (productId: string) => {
    try {
      const pendingDescription = pendingDescriptions[productId];
      if (!pendingDescription) return;

      // Delete the pending description
      const deletePendingResponse = await fetch(
        `/api/platform/shopify/pending?company=${company}&productId=${productId}`,
        {
          method: "DELETE",
        }
      );

      if (!deletePendingResponse.ok) {
        throw new Error("Failed to delete pending description");
      }

      // Delete the published status if it exists
      if (publishedProducts.has(String(productId))) {
        const deletePublishedResponse = await fetch(
          `/api/platform/shopify/published?company=${company}&productId=${productId}`,
          {
            method: "DELETE",
          }
        );

        if (!deletePublishedResponse.ok) {
          console.warn("Failed to delete published status");
        }

        // Update local state - remove from published products
        setPublishedProducts((prev) => {
          const newPublishedProducts = new Set(prev);
          newPublishedProducts.delete(String(productId));
          return newPublishedProducts;
        });

        // Update the product in the products list to remove published status
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId
              ? { ...p, isPublished: false, publishedAt: undefined }
              : p
          )
        );
      }

      // Remove from local pending state
      setPendingDescriptions((prev) => {
        const remainingDescriptions = { ...prev };
        delete remainingDescriptions[productId];
        return remainingDescriptions;
      });

      setIsCompareOpen(false);
      toast.success("Changes discarded successfully");
    } catch (error) {
      console.error("Error discarding changes:", error);
      toast.error("Failed to discard changes");
    }
  };

  const handleBulkPublishSelected = async () => {
    const selectedPendingProducts = filteredProducts.filter(
      (product) =>
        selectedProducts.has(product.id) && pendingDescriptions[product.id]
    );

    console.log("[Bulk Publish] Selected products for publishing:", {
      totalSelected: selectedProducts.size,
      selectedIds: Array.from(selectedProducts),
      productsWithPending: selectedPendingProducts.length,
      productTitles: selectedPendingProducts.map((p) => p.title),
    });

    if (selectedPendingProducts.length === 0) {
      toast.error(
        "No products with pending content selected. Generate content first!"
      );
      return;
    }

    // Show confirmation with details
    const confirmMessage = `You are about to publish ${
      selectedPendingProducts.length
    } product${
      selectedPendingProducts.length !== 1 ? "s" : ""
    } with pending content. Continue?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const newPublishedProducts = new Set(publishedProducts);

    try {
      for (const product of selectedPendingProducts) {
        try {
          console.log(
            `[Bulk Publish] Publishing: ${product.title} (${product.id})`
          );
          await handlePublish(product);
          newPublishedProducts.add(product.id);
          successCount++;
          toast.success(
            `Progress: ${successCount + failCount}/${
              selectedPendingProducts.length
            } - Published: ${product.title}`
          );
        } catch (error) {
          failCount++;
          console.error(`Failed to publish ${product.title}:`, error);
          toast.error(`Failed: ${product.title}`);
        }
      }

      setPublishedProducts(newPublishedProducts);
      toast.success(
        `Completed! Successfully published: ${successCount}, Failed: ${failCount}`
      );
      setSelectedProducts(new Set());
    } catch (error) {
      console.error("Error in bulk publish:", error);
      toast.error("Failed to complete bulk publish");
    }
  };

  const CompareDialog = () => {
    const [editedDescription, setEditedDescription] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [showRevertConfirm, setShowRevertConfirm] = useState(false);
    const [revertDescription, setRevertDescription] = useState<string | null>(
      null
    );
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isReverting, setIsReverting] = useState(false);
    const [localPendingDescription, setLocalPendingDescription] =
      useState<PendingDescription | null>(null);

    useEffect(() => {
      if (!selectedProduct) return;
      const pendingDesc = pendingDescriptions[selectedProduct.id];
      if (pendingDesc) {
        setLocalPendingDescription(pendingDesc);
        setEditedDescription(pendingDesc.newDescription);
      } else {
        setLocalPendingDescription(null);
        setEditedDescription(selectedProduct.body_html || "");
      }
    }, [selectedProduct, pendingDescriptions]);

    if (!selectedProduct) return null;

    const originalSeoTitle =
      localPendingDescription?.oldSeoTitle ?? selectedProduct.seoTitle ?? "";
    const originalSeoDescription =
      localPendingDescription?.oldSeoDescription ??
      selectedProduct.seoDescription ??
      "";
    const pendingSeoTitle = localPendingDescription?.newSeoTitle ?? "";
    const pendingSeoDescription =
      localPendingDescription?.newSeoDescription ?? "";

    const handleRegenerate = async () => {
      if (!selectedProduct) return;

      try {
        setIsRegenerating(true);

        // Generate new description
        const generateResponse = await fetch("/api/generate/description", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-description-destination": descriptionPlacement.mode,
          },
          body: JSON.stringify({
            title: selectedProduct.title,
            company,
            existingDescription: selectedProduct.body_html || "",
            language: selectedLanguage,
            targetCountry: selectedCountry,
            keyword: selectedProduct.title,
          }),
        });

        if (!generateResponse.ok) {
          throw new Error("Failed to generate description");
        }

        const {
          description: newDescription,
          seoTitle: generatedSeoTitle,
          seoDescription: generatedSeoDescription,
          summaryHtml,
        } = await generateResponse.json();

        // Remove any ```html tags from the description
        const cleanDescription = newDescription.replace(
          /```html\n?|\n?```/g,
          ""
        );

        const baselineOldSeoTitle =
          localPendingDescription?.oldSeoTitle ??
          selectedProduct.seoTitle ??
          "";
        const baselineOldSeoDescription =
          localPendingDescription?.oldSeoDescription ??
          selectedProduct.seoDescription ??
          "";

        // Save pending description
        const savePendingResponse = await fetch(
          "/api/platform/shopify/pending",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              productId: selectedProduct.id,
              oldDescription:
                localPendingDescription?.oldDescription ||
                selectedProduct.body_html ||
                "",
              newDescription: cleanDescription,
              company,
              oldSeoTitle: baselineOldSeoTitle,
              oldSeoDescription: baselineOldSeoDescription,
              newSeoTitle: generatedSeoTitle || "",
              newSeoDescription: generatedSeoDescription || "",
              summaryHtml: summaryHtml || "",
            }),
          }
        );

        if (!savePendingResponse.ok) {
          throw new Error("Failed to save pending description");
        }

        // Update local states
        const newPendingDesc = {
          productId: selectedProduct.id,
          oldDescription:
            localPendingDescription?.oldDescription ||
            selectedProduct.body_html ||
            "",
          newDescription: cleanDescription,
          generatedAt: new Date().toISOString(),
          oldSeoTitle: baselineOldSeoTitle,
          oldSeoDescription: baselineOldSeoDescription,
          newSeoTitle: generatedSeoTitle || "",
          newSeoDescription: generatedSeoDescription || "",
          summaryHtml: summaryHtml || "",
        };

        setLocalPendingDescription(newPendingDesc);
        setEditedDescription(cleanDescription);

        // Update parent state
        setPendingDescriptions((prev) => ({
          ...prev,
          [selectedProduct.id]: newPendingDesc,
        }));

        toast.success("Description regenerated successfully");
      } catch (error) {
        console.error("Error regenerating description:", error);
        toast.error("Failed to regenerate description");
      } finally {
        setIsRegenerating(false);
      }
    };

    const handleRevertConfirm = async () => {
      if (!revertDescription || !selectedProduct || !localPendingDescription)
        return;

      try {
        setIsReverting(true);
        // First update the pending description
        const savePendingResponse = await fetch(
          "/api/platform/shopify/pending",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              productId: selectedProduct.id,
              oldDescription: localPendingDescription.oldDescription,
              newDescription: localPendingDescription.oldDescription,
              company,
              generatedAt: localPendingDescription.generatedAt,
            }),
          }
        );

        if (!savePendingResponse.ok) {
          throw new Error("Failed to revert description");
        }

        // Update Shopify product description
        const updateResponse = await fetch("/api/platform/shopify/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: selectedProduct.id,
            description: localPendingDescription.oldDescription,
            company,
            seoTitle: localPendingDescription.oldSeoTitle,
            seoDescription: localPendingDescription.oldSeoDescription,
            summaryHtml:
              descriptionPlacement.mode === "metafield"
                ? truncateHtmlForPreview(
                    localPendingDescription.oldDescription || "",
                    1000
                  )
                : undefined,
          }),
        });

        if (!updateResponse.ok) {
          throw new Error("Failed to update Shopify product");
        }

        // Delete the pending description
        const deletePendingResponse = await fetch(
          `/api/platform/shopify/pending?company=${company}&productId=${selectedProduct.id}`,
          {
            method: "DELETE",
          }
        );

        if (!deletePendingResponse.ok) {
          console.warn("Failed to delete pending description");
        }

        // Delete the published status
        const deletePublishedResponse = await fetch(
          `/api/platform/shopify/published?company=${company}&productId=${selectedProduct.id}`,
          {
            method: "DELETE",
          }
        );

        if (!deletePublishedResponse.ok) {
          console.warn("Failed to delete published status");
        }

        // Update local state - remove from pending descriptions
        setPendingDescriptions((prev) => {
          const newPendingDescriptions = { ...prev };
          delete newPendingDescriptions[selectedProduct.id];
          return newPendingDescriptions;
        });

        // Update local state - remove from published products
        setPublishedProducts((prev) => {
          const newPublishedProducts = new Set(prev);
          newPublishedProducts.delete(String(selectedProduct.id));
          return newPublishedProducts;
        });

        // Update products list with the reverted description and remove published status
        const { product: updatedProduct } = await updateResponse.json();
        const updatedProducts = products.map((p) =>
          p.id === selectedProduct.id
            ? {
                ...updatedProduct,
                isPublished: false,
                publishedAt: undefined,
              }
            : p
        );
        setProducts(updatedProducts);
        filterProducts();

        setEditedDescription(localPendingDescription.oldDescription);
        setRevertDescription(null);
        setShowRevertConfirm(false);
        setIsCompareOpen(false);
        toast.success("Description reverted successfully");
      } catch (error) {
        console.error("Error reverting description:", error);
        toast.error("Failed to revert and publish description");
      } finally {
        setIsReverting(false);
      }
    };

    // Update the Revert to Original button click handler
    const handleRevertClick = () => {
      if (!selectedProduct || !localPendingDescription) return;

      // Make sure we have an original description to revert to
      if (!localPendingDescription.oldDescription) {
        toast.error("No original description available to revert to");
        return;
      }

      setRevertDescription(localPendingDescription.oldDescription);
      setShowRevertConfirm(true);
    };

    return (
      <>
        <Dialog open={isCompareOpen} onOpenChange={setIsCompareOpen}>
          <DialogContent className="max-w-7xl w-[95vw] h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader className="flex-shrink-0">
              <div className="flex items-start gap-4 mb-4">
                {selectedProduct.images[0] && (
                  <img
                    src={selectedProduct.images[0].src}
                    alt={selectedProduct.title}
                    className="w-24 h-24 object-cover rounded-md"
                  />
                )}
                <div>
                  <DialogTitle className="text-xl">
                    {selectedProduct.title}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Status:{" "}
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        selectedProduct.status === "active"
                          ? "bg-green-100 text-green-800"
                          : selectedProduct.status === "draft"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      )}
                    >
                      {selectedProduct.status}
                    </span>
                  </p>
                </div>
              </div>
              <DialogDescription>
                Review and edit the changes before publishing
              </DialogDescription>
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <span>Current destination:</span>
                  <span className="font-medium">
                    {descriptionPlacement.mode === "metafield"
                      ? `${descriptionPlacement.metafieldNamespace}.${descriptionPlacement.metafieldKey}`
                      : "Product description (body_html)"}
                  </span>
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                >
                  {isRegenerating ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⟳</span>
                      Regenerating...
                    </span>
                  ) : (
                    "Regenerate Description"
                  )}
                </Button>
              </div>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div className="rounded-lg border bg-muted/60 p-3 space-y-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Original SEO Title
                  </p>
                  <p className="mt-1 text-xs text-foreground">
                    {originalSeoTitle || "No SEO title available"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Original Meta Description
                  </p>
                  <p className="mt-1 text-xs text-foreground">
                    {originalSeoDescription || "No meta description available"}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Pending SEO Title
                  </p>
                  <p className="mt-1 text-xs text-foreground">
                    {pendingSeoTitle || "No pending SEO title"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Pending Meta Description
                  </p>
                  <p className="mt-1 text-xs text-foreground">
                    {pendingSeoDescription || "No pending meta description"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
              <div className="flex flex-col min-h-0 overflow-hidden">
                <h3 className="font-semibold mb-2 flex-shrink-0">
                  Original Description
                </h3>
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4 border rounded-lg prose prose-sm bg-muted">
                    {localPendingDescription?.oldDescription ? (
                      renderHTML(localPendingDescription.oldDescription)
                    ) : (
                      <span className="text-gray-500 italic">
                        No original description available
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col min-h-0 overflow-hidden">
                <div className="flex items-center justify-between mb-2 flex-shrink-0">
                  <h3 className="font-semibold">New Description</h3>
                  <div className="flex items-center gap-2">
                    {localPendingDescription &&
                      localPendingDescription.oldDescription && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRevertClick}
                        >
                          Revert to Original
                        </Button>
                      )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      {isEditing ? "Preview" : "Edit"}
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  {isEditing ? (
                    <div className="h-full relative">
                      <div className="absolute inset-0">
                        <RichTextEditor
                          content={editedDescription}
                          onChange={setEditedDescription}
                        />
                      </div>
                      <div className="absolute bottom-4 right-4 z-10 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setIsEditing(false);
                            setEditedDescription(
                              localPendingDescription?.newDescription || ""
                            );
                          }}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              // Save the edited description
                              const savePendingResponse = await fetch(
                                "/api/platform/shopify/pending",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    productId: selectedProduct.id,
                                    oldDescription:
                                      localPendingDescription?.oldDescription ||
                                      selectedProduct.body_html ||
                                      "",
                                    newDescription: editedDescription,
                                    company,
                                    generatedAt:
                                      localPendingDescription?.generatedAt ||
                                      new Date().toISOString(),
                                  }),
                                }
                              );

                              if (!savePendingResponse.ok) {
                                throw new Error("Failed to save changes");
                              }

                              // Update local states
                              const newPendingDesc = {
                                productId: selectedProduct.id,
                                oldDescription:
                                  localPendingDescription?.oldDescription ||
                                  selectedProduct.body_html ||
                                  "",
                                newDescription: editedDescription,
                                generatedAt:
                                  localPendingDescription?.generatedAt ||
                                  new Date().toISOString(),
                              };

                              setLocalPendingDescription(newPendingDesc);

                              // Update parent state
                              setPendingDescriptions((prev) => ({
                                ...prev,
                                [selectedProduct.id]: newPendingDesc,
                              }));

                              setIsEditing(false);
                              toast.success("Changes saved successfully");
                            } catch (error) {
                              console.error("Error saving changes:", error);
                              toast.error("Failed to save changes");
                            }
                          }}
                          variant="secondary"
                        >
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full p-4 border rounded-lg prose prose-sm overflow-y-auto bg-muted">
                      {pendingDescriptions[selectedProduct.id] ? (
                        renderHTML(editedDescription)
                      ) : (
                        <span className="text-gray-500 italic">
                          No pending description
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => handleDiscardChanges(selectedProduct.id)}
              >
                Discard Changes
              </Button>
              <Button
                onClick={() => handlePublish(selectedProduct)}
                variant="secondary"
              >
                Publish Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showRevertConfirm} onOpenChange={setShowRevertConfirm}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirm Revert</DialogTitle>
              <DialogDescription>
                Are you sure you want to revert to the original description?
                This will only update the pending changes and won&apos;t publish
                automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRevertConfirm(false);
                  setRevertDescription(null);
                }}
                disabled={isReverting}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={handleRevertConfirm}
                disabled={isReverting}
              >
                {isReverting ? (
                  <>
                    <span className="animate-spin mr-2">⟳</span>
                    Reverting...
                  </>
                ) : (
                  "Revert Changes"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  };

  const renderHTML = (html: string) => {
    const sanitizedHTML = DOMPurify.sanitize(html);
    return <div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />;
  };

  const LanguageSelector = () => (
    <Select
      value={selectedLanguage}
      onValueChange={(value: LanguageType) => setSelectedLanguage(value)}
    >
      <SelectTrigger className="w-[140px] h-8">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en-US">🇺🇸 English (US)</SelectItem>
        <SelectItem value="en-GB">🇬🇧 English (UK)</SelectItem>
        <SelectItem value="es">🇪🇸 Spanish</SelectItem>
        <SelectItem value="fr">🇫🇷 French</SelectItem>
        <SelectItem value="de">🇩🇪 German</SelectItem>
        <SelectItem value="it">🇮🇹 Italian</SelectItem>
        <SelectItem value="pt">🇵🇹 Portuguese</SelectItem>
        <SelectItem value="nl">🇳🇱 Dutch</SelectItem>
        <SelectItem value="pl">🇵🇱 Polish</SelectItem>
        <SelectItem value="sv">🇸🇪 Swedish</SelectItem>
        <SelectItem value="da">🇩🇰 Danish</SelectItem>
        <SelectItem value="no">🇳🇴 Norwegian</SelectItem>
        <SelectItem value="fi">🇫🇮 Finnish</SelectItem>
      </SelectContent>
    </Select>
  );

  const CountrySelector = () => (
    <Select
      value={selectedCountry}
      onValueChange={(value: CountryType) => setSelectedCountry(value)}
    >
      <SelectTrigger className="w-[140px] h-8">
        <SelectValue placeholder="Market" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="US">🇺🇸 USA</SelectItem>
        <SelectItem value="GB">🇬🇧 UK</SelectItem>
        <SelectItem value="CA">🇨🇦 Canada</SelectItem>
        <SelectItem value="AU">🇦🇺 Australia</SelectItem>
        <SelectItem value="DE">🇩🇪 Germany</SelectItem>
        <SelectItem value="FR">🇫🇷 France</SelectItem>
        <SelectItem value="ES">🇪🇸 Spain</SelectItem>
        <SelectItem value="IT">🇮🇹 Italy</SelectItem>
        <SelectItem value="NL">🇳🇱 Netherlands</SelectItem>
        <SelectItem value="SE">🇸🇪 Sweden</SelectItem>
        <SelectItem value="NO">🇳🇴 Norway</SelectItem>
        <SelectItem value="DK">🇩🇰 Denmark</SelectItem>
        <SelectItem value="FI">🇫🇮 Finland</SelectItem>
        <SelectItem value="PL">🇵🇱 Poland</SelectItem>
        <SelectItem value="BR">🇧🇷 Brazil</SelectItem>
        <SelectItem value="MX">🇲🇽 Mexico</SelectItem>
      </SelectContent>
    </Select>
  );

  const handleDisconnect = async () => {
    if (!company) {
      toast.error("Company information not found");
      return;
    }

    try {
      setIsUpdatingSettings(true);
      const response = await fetch("/api/platform/shopify/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credentials: {
            storeName: "",
            accessToken: "",
          },
          enabled: false,
          company,
        }),
      });

      if (response.ok) {
        toast.success("Successfully disconnected from Shopify");
        setIsConnected(false);
        setCurrentStoreName("");
        setProducts([]);
        setFilteredProducts([]);
        setIsSettingsOpen(false);
        setIsDisconnectConfirmOpen(false);
      } else {
        throw new Error("Failed to disconnect");
      }
    } catch (error: unknown) {
      console.error("Error disconnecting from Shopify:", error);
      toast.error("Failed to disconnect from Shopify");
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Get current page items
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredProducts.slice(startIndex, endIndex);
  };

  // Add debug log for progress display
  useEffect(() => {
    if (progress) {
      console.log("Progress state updated:", {
        current: progress.current,
        total: progress.total,
        percentage: progress.percentage,
      });
    }
  }, [progress]);

  // Add debug log for filtered products
  useEffect(() => {
    console.log("Filtered products updated:", {
      filteredCount: filteredProducts.length,
      totalProducts: products.length,
      currentProgress: progress,
    });
  }, [filteredProducts, products, progress]);

  // Add debug log for initial load
  useEffect(() => {
    if (company && isConnected) {
      console.log("Initial load triggered:", {
        company,
        isConnected,
        currentProgress: progress,
      });
      // Reset pagination state when starting fresh
      setCurrentCursor(null);
      setHasMore(true);
      setProducts([]);
      fetchProducts(company);
    }
  }, [company, isConnected]);

  // Progress bar for active loading
  const renderProgressBar = () => {
    return null;
  };

  if (!company) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-8">Error</h1>
        <p>Company information not found. Please try logging in again.</p>
      </div>
    );
  }

  const TableSkeleton = () => (
    <>
      {[...Array(5)].map((_, index) => (
        <TableRow key={index} className="animate-pulse">
          <TableCell>
            <div className="h-4 w-4 bg-muted rounded" />
          </TableCell>
          <TableCell>
            <div className="h-[80px] w-[80px] bg-muted rounded-md" />
          </TableCell>
          <TableCell>
            <div className="h-6 w-48 bg-muted rounded" />
          </TableCell>
          <TableCell>
            <div className="h-20 bg-muted rounded" />
          </TableCell>
          <TableCell>
            <div className="h-6 w-20 bg-muted rounded-full" />
          </TableCell>
          <TableCell className="text-right">
            <div className="h-9 w-32 bg-muted rounded ml-auto" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );

  // Optimized product row component
  const ProductRow = React.memo(function ProductRow({
    product,
  }: {
    product: ShopifyProduct;
  }) {
    return (
      <TableRow
        key={product.id}
        className={cn(
          pendingDescriptions[product.id] && "bg-muted/30",
          publishedProducts.has(String(product.id)) && "bg-green-50"
        )}
      >
        <TableCell>
          <Checkbox
            checked={selectedProducts.has(product.id)}
            onCheckedChange={() => toggleProductSelection(product.id)}
          />
        </TableCell>
        <TableCell>
          {product.images?.[0]?.src ? (
            <img
              src={product.images[0].src}
              alt={product.title}
              className="w-[80px] h-[80px] object-cover rounded-md"
              loading="lazy"
            />
          ) : (
            <div className="w-[80px] h-[80px] bg-muted flex items-center justify-center rounded-md text-xs text-muted-foreground">
              No image
            </div>
          )}
        </TableCell>
        <TableCell className="font-medium">
          <div className="flex flex-col gap-2">
            <span>{product.title}</span>
            <div className="flex flex-wrap gap-2">
              {pendingDescriptions[product.id] && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 w-fit">
                  Pending Changes
                </span>
              )}
              {publishedProducts.has(String(product.id)) && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 w-fit">
                  Published{" "}
                  {product.publishedAt
                    ? `(${new Date(product.publishedAt).toLocaleString()})`
                    : ""}
                </span>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="max-w-[400px]">
          <div className="max-h-[200px] overflow-y-auto prose prose-sm">
            {pendingDescriptions[product.id] ? (
              <div className="relative">
                <div className="absolute right-0 top-0 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                  Original
                </div>
                {renderHTML(pendingDescriptions[product.id].oldDescription)}
              </div>
            ) : product.body_html ? (
              renderHTML(product.body_html)
            ) : (
              <span className="text-gray-500 italic">
                No description available
              </span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
              product.status === "active"
                ? "bg-green-100 text-green-800"
                : product.status === "draft"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-gray-100 text-gray-800"
            )}
          >
            {product.status}
          </span>
        </TableCell>
        <TableCell className="text-right">
          {pendingDescriptions[product.id] ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSelectedProduct(product);
                setIsCompareOpen(true);
              }}
            >
              View Changes
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => generateAndSavePendingDescription(product)}
              disabled={isGenerating[product.id] || isBulkGenerating}
              className={isGenerating[product.id] ? "animate-pulse" : ""}
            >
              {isGenerating[product.id] ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Generating...
                </>
              ) : isBulkGenerating ? (
                "Bulk Generating..."
              ) : (
                "Generate Description"
              )}
            </Button>
          )}
        </TableCell>
      </TableRow>
    );
  });

  return (
    <div className="container mx-auto py-10 min-h-screen flex flex-col">
      <h1 className="text-3xl font-bold mb-8">Shopify Products</h1>

      {/* Replace the progress bar section with the new render function */}
      {renderProgressBar()}

      {/* Loading Statistics */}
      {isConnected && progress && (
        <div className="mb-4 p-3 bg-muted/50 rounded-md border">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-4">
              <span>
                <strong>Loaded:</strong> {loadedProductsCount.toLocaleString()}{" "}
                of {progress.total.toLocaleString()} products
              </span>
              <span>
                <strong>Progress:</strong> {Math.round(progress.percentage)}%
              </span>
              <span>
                <strong>Displayed:</strong>{" "}
                {filteredProducts.length.toLocaleString()} (after filters)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {hasMore && (
                <span className="text-muted-foreground">
                  {autoLoadEnabled ? "Auto-loading enabled" : "Manual loading"}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {!isConnected ? (
        <Card>
          <CardHeader>
            <CardTitle>Connect to Shopify</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storeName">Store Name</Label>
              <Input
                id="storeName"
                placeholder="your-store-name.myshopify.com"
                value={storeName}
                onChange={(e) => {
                  let value = e.target.value;
                  // Remove https:// or http:// if present
                  value = value.replace(/^https?:\/\//, "");
                  setStoreName(value);
                  validateStoreName(value);
                }}
                className={cn(storeNameError && "border-red-500")}
              />
              {storeNameError && (
                <p className="text-sm text-red-500">{storeNameError}</p>
              )}
              <p className="text-sm text-gray-500">
                Enter your full Shopify store URL (e.g.,
                your-store.myshopify.com)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessToken">Access Token</Label>
              <Input
                id="accessToken"
                type="password"
                placeholder="shpat_xxxxx"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
              <p className="text-sm text-gray-500">
                You can find this in your Shopify admin under Apps → Develop
                apps → Your App → API credentials
              </p>
            </div>
            <Button
              onClick={handleConnect}
              variant="secondary"
              disabled={isUpdatingSettings}
            >
              {isUpdatingSettings ? "Connecting..." : "Connect to Shopify"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 flex-1 flex flex-col">
          {/* Header Row - Store Info & Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-green-900 dark:text-green-100">
                  {currentStoreName}
                </span>
              </div>
              <Button
                onClick={() => {
                  // Clear cache and reload
                  setProducts([]);
                  setFilteredProducts([]);
                  setCurrentCursor(null);
                  setHasMore(true);
                  setLoadedProductsCount(0);
                  setProgress(null);
                  const queryParams = new URLSearchParams({
                    company,
                    pageSize: "250",
                    bypassCache: "true",
                  });
                  fetch(`/api/platform/shopify/products?${queryParams}`)
                    .then(() => fetchProducts(company))
                    .catch(console.error);
                }}
                variant="outline"
                size="sm"
              >
                ⟳ Refresh
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={openSettingsDialog}>
                ⚙️ Settings
              </Button>
            </div>
          </div>

          {/* Search & Filters Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Search & Status Row */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Input
                      id="search"
                      placeholder="🔍 Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <Select
                    value={selectedStatus}
                    onValueChange={(value: StatusType) =>
                      setSelectedStatus(value)
                    }
                  >
                    <SelectTrigger className="w-[160px] h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter Chips Row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">
                    Filters:
                  </span>
                  <Button
                    variant={showPendingOnly ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setShowPendingOnly(!showPendingOnly);
                      if (!showPendingOnly) setShowNoPendingOnly(false);
                    }}
                    className="h-8"
                  >
                    📝 Pending
                    {showPendingOnly && (
                      <span className="ml-1.5 text-xs">✓</span>
                    )}
                  </Button>
                  <Button
                    variant={showNoPendingOnly ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setShowNoPendingOnly(!showNoPendingOnly);
                      if (!showNoPendingOnly) {
                        setShowPendingOnly(false);
                        setShowPublishedOnly(false); // Can't show published when showing needs content
                      }
                    }}
                    className="h-8"
                  >
                    ✨ Needs Content
                    {showNoPendingOnly && (
                      <span className="ml-1.5 text-xs">✓</span>
                    )}
                  </Button>
                  <Button
                    variant={showPublishedOnly ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setShowPublishedOnly(!showPublishedOnly);
                      if (!showPublishedOnly) {
                        setShowNoPendingOnly(false); // Can't show needs content when showing published
                      }
                    }}
                    className="h-8"
                  >
                    ✅ Published
                    {showPublishedOnly && (
                      <span className="ml-1.5 text-xs">✓</span>
                    )}
                  </Button>

                  <div className="h-6 w-px bg-border mx-1"></div>

                  <LanguageSelector />
                  <CountrySelector />

                  <div className="h-6 w-px bg-border mx-1"></div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="auto-load"
                      checked={autoLoadEnabled}
                      onCheckedChange={(checked) =>
                        setAutoLoadEnabled(checked as boolean)
                      }
                    />
                    <Label
                      htmlFor="auto-load"
                      className="text-sm cursor-pointer"
                    >
                      Auto-load
                    </Label>
                  </div>

                  {hasMore && !autoLoadEnabled && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadMoreProducts(null, true)}
                      disabled={isLoadingMore}
                      className="h-8"
                    >
                      {isLoadingMore ? (
                        <>
                          <span className="animate-spin mr-1.5">⟳</span>
                          Loading...
                        </>
                      ) : (
                        `Load More (${Math.min(
                          250,
                          (progress?.total || 0) - loadedProductsCount
                        )})`
                      )}
                    </Button>
                  )}
                </div>

                {/* Active Filters Display */}
                {(showPendingOnly ||
                  showNoPendingOnly ||
                  showPublishedOnly ||
                  selectedStatus !== "all") && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Active:</span>
                    {selectedStatus !== "all" && (
                      <span className="px-2 py-1 bg-muted rounded text-xs">
                        Status: {selectedStatus}
                      </span>
                    )}
                    {showPendingOnly && (
                      <span className="px-2 py-1 bg-muted rounded text-xs">
                        Pending Only
                      </span>
                    )}
                    {showNoPendingOnly && (
                      <span className="px-2 py-1 bg-muted rounded text-xs">
                        Needs Content
                      </span>
                    )}
                    {showPublishedOnly && (
                      <span className="px-2 py-1 bg-muted rounded text-xs">
                        Published Only
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowPendingOnly(false);
                        setShowNoPendingOnly(false);
                        setShowPublishedOnly(false);
                        setSelectedStatus("all");
                      }}
                      className="h-6 px-2 text-xs"
                    >
                      Clear all
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="rounded-md border flex-1 flex flex-col">
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={
                          selectedProducts.size === filteredProducts.length
                        }
                        onCheckedChange={toggleAllProducts}
                        disabled={isLoading}
                      />
                    </TableHead>
                    <TableHead className="w-[100px]">Image</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="max-w-[400px]">
                      Original Description
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableSkeleton />
                  ) : (
                    getCurrentPageItems().map((product) => (
                      <ProductRow key={product.id} product={product} />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination section - move outside the scrollable area */}
            {!isLoading && filteredProducts.length > 0 && (
              <div className="flex items-center justify-end space-x-2 py-4 px-4 border-t bg-background">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, filteredProducts.length)} of{" "}
                  {filteredProducts.length} entries
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => handlePageChange(currentPage - 1)}
                        className={cn(
                          currentPage === 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        )}
                      />
                    </PaginationItem>

                    {/* First page */}
                    {currentPage > 3 && (
                      <PaginationItem>
                        <PaginationLink onClick={() => handlePageChange(1)}>
                          1
                        </PaginationLink>
                      </PaginationItem>
                    )}

                    {/* Ellipsis if needed */}
                    {currentPage > 4 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}

                    {/* Pages before current */}
                    {currentPage > 2 && (
                      <PaginationItem>
                        <PaginationLink
                          onClick={() => handlePageChange(currentPage - 2)}
                        >
                          {currentPage - 2}
                        </PaginationLink>
                      </PaginationItem>
                    )}

                    {currentPage > 1 && (
                      <PaginationItem>
                        <PaginationLink
                          onClick={() => handlePageChange(currentPage - 1)}
                        >
                          {currentPage - 1}
                        </PaginationLink>
                      </PaginationItem>
                    )}

                    {/* Current page */}
                    <PaginationItem>
                      <PaginationLink isActive>{currentPage}</PaginationLink>
                    </PaginationItem>

                    {/* Pages after current */}
                    {currentPage < totalPages && (
                      <PaginationItem>
                        <PaginationLink
                          onClick={() => handlePageChange(currentPage + 1)}
                        >
                          {currentPage + 1}
                        </PaginationLink>
                      </PaginationItem>
                    )}

                    {currentPage < totalPages - 1 && (
                      <PaginationItem>
                        <PaginationLink
                          onClick={() => handlePageChange(currentPage + 2)}
                        >
                          {currentPage + 2}
                        </PaginationLink>
                      </PaginationItem>
                    )}

                    {/* Ellipsis if needed */}
                    {currentPage < totalPages - 3 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}

                    {/* Last page */}
                    {currentPage < totalPages - 2 && (
                      <PaginationItem>
                        <PaginationLink
                          onClick={() => handlePageChange(totalPages)}
                        >
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    )}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => handlePageChange(currentPage + 1)}
                        className={cn(
                          currentPage === totalPages
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>

                {/* Page size selector */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Show</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      setCurrentPage(1); // Reset to first page when changing page size
                    }}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue placeholder={pageSize.toString()} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="250">250</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">
                    per page
                  </span>
                  <div className="flex items-center gap-2 ml-4">
                    <Label
                      htmlFor="virtualized"
                      className="cursor-pointer text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="virtualized"
                          checked={virtualizedView}
                          onCheckedChange={(checked) =>
                            setVirtualizedView(checked as boolean)
                          }
                        />
                        <span>High-performance view</span>
                      </div>
                    </Label>
                  </div>
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-center items-center p-4 border-t">
                <div className="animate-spin mr-2">⟳</div>
                <span>Loading initial products...</span>
              </div>
            )}

            {/* Load more section */}
            {!isLoading && hasMore && !autoLoadEnabled && (
              <div className="flex justify-center items-center p-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => loadMoreProducts(null, true)}
                  disabled={isLoadingMore}
                  className="min-w-[200px]"
                >
                  {isLoadingMore ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span>
                      Loading more...
                    </>
                  ) : (
                    `Load Next ${Math.min(
                      250,
                      (progress?.total || 0) - loadedProductsCount
                    )} Products`
                  )}
                </Button>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && filteredProducts.length === 0 && (
              <div className="flex justify-center items-center p-8 text-muted-foreground">
                No products found matching your filters.
              </div>
            )}
          </div>
        </div>
      )}

      <CompareDialog />

      {/* Update the bulk actions bar to use fixed positioning with proper z-index */}
      {selectedProducts.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg p-4 z-[100]">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="text-sm font-medium">
                {selectedProducts.size} product
                {selectedProducts.size !== 1 ? "s" : ""} selected
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-3">
                <span>
                  {
                    filteredProducts.filter(
                      (p) =>
                        selectedProducts.has(p.id) && pendingDescriptions[p.id]
                    ).length
                  }{" "}
                  with pending content
                </span>
                <span>
                  {
                    filteredProducts.filter(
                      (p) =>
                        selectedProducts.has(p.id) && !pendingDescriptions[p.id]
                    ).length
                  }{" "}
                  without content
                </span>
                {isBulkGenerating && bulkProgress.total > 0 && (
                  <span className="text-blue-600 font-medium">
                    Generating: {bulkProgress.current}/{bulkProgress.total}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProducts(new Set())}
              >
                Clear Selection
              </Button>
              <Button
                variant="default"
                onClick={handleBulkGenerate}
                disabled={selectedProducts.size === 0 || isBulkGenerating}
              >
                {isBulkGenerating ? (
                  <>
                    <span className="animate-spin mr-2">⟳</span>
                    Generating... (
                    {Math.round(
                      (bulkProgress.current / bulkProgress.total) * 100
                    )}
                    %)
                  </>
                ) : (
                  <>✨ Generate Content ({selectedProducts.size})</>
                )}
              </Button>
              <Button
                variant="default"
                onClick={handleBulkPublishSelected}
                disabled={
                  filteredProducts.filter(
                    (p) =>
                      selectedProducts.has(p.id) && pendingDescriptions[p.id]
                  ).length === 0
                }
              >
                ✅ Publish Selected (
                {
                  filteredProducts.filter(
                    (p) =>
                      selectedProducts.has(p.id) && pendingDescriptions[p.id]
                  ).length
                }
                )
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] p-0 flex flex-col">
          <div className="px-6 pt-6 pb-4 border-b">
            <DialogHeader className="space-y-2">
              <DialogTitle>Shopify Connection Settings</DialogTitle>
              <DialogDescription>
                Update your Shopify store connection details.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            <div className="bg-muted p-4 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="font-medium">Currently Connected</span>
              </div>
              <p className="text-sm">
                Store: <span className="font-medium">{currentStoreName}</span>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="updateStoreName">Store Name</Label>
              <Input
                id="updateStoreName"
                placeholder="your-store-name.myshopify.com"
                value={storeName}
                onChange={(e) => {
                  let value = e.target.value;
                  value = value.replace(/^https?:\/\//, "");
                  setStoreName(value);
                  validateStoreName(value);
                }}
                className={cn(storeNameError && "border-red-500")}
              />
              {storeNameError && (
                <p className="text-sm text-red-500">{storeNameError}</p>
              )}
              <p className="text-sm text-gray-500">
                Enter your full Shopify store URL (e.g.,
                your-store.myshopify.com)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="updateAccessToken">Access Token</Label>
              <Input
                id="updateAccessToken"
                type="password"
                placeholder="Enter new access token (leave empty to keep current)"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
              <p className="text-sm text-gray-500">
                Only enter a new token if you want to change it. Leave empty to
                keep your current token.
              </p>
            </div>

            <div className="space-y-4 border rounded-md p-4 bg-muted/40">
              <div>
                <h3 className="text-sm font-medium">Description Destination</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose where newly generated descriptions should be stored in
                  Shopify.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={
                    descriptionPlacement.mode === "body_html"
                      ? "secondary"
                      : "outline"
                  }
                  className="justify-start h-auto p-4 text-left whitespace-normal"
                  onClick={() =>
                    setDescriptionPlacement({
                      ...defaultDescriptionPlacement,
                      mode: "body_html",
                    })
                  }
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Product Description</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Update Shopify's main product description (`body_html`).
                      Recommended when your theme reads the default description.
                    </p>
                  </div>
                </Button>

                <Button
                  type="button"
                  variant={
                    descriptionPlacement.mode === "metafield"
                      ? "secondary"
                      : "outline"
                  }
                  className="justify-start h-auto p-4 text-left whitespace-normal"
                  onClick={() =>
                    setDescriptionPlacement((prev) => ({
                      ...prev,
                      mode: "metafield",
                    }))
                  }
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Metafield</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Store descriptions in a custom metafield. Make sure your
                      theme references this metafield to display the copy.
                    </p>
                  </div>
                </Button>
              </div>

              {descriptionPlacement.mode === "metafield" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="metafieldNamespace">Namespace</Label>
                    <Input
                      id="metafieldNamespace"
                      placeholder="e.g. custom"
                      value={descriptionPlacement.metafieldNamespace}
                      onChange={(event) =>
                        setDescriptionPlacement((prev) => ({
                          ...prev,
                          metafieldNamespace: event.target.value,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Namespaces group metafields. Avoid Shopify reserved
                      namespaces.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="metafieldKey">Key</Label>
                    <Input
                      id="metafieldKey"
                      placeholder="e.g. product_description"
                      value={descriptionPlacement.metafieldKey}
                      onChange={(event) =>
                        setDescriptionPlacement((prev) => ({
                          ...prev,
                          metafieldKey: event.target.value,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Use lowercase letters, numbers, or underscores.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="metafieldType">Metafield Type</Label>
                    <Select
                      value={descriptionPlacement.metafieldType}
                      onValueChange={(value: string) =>
                        setDescriptionPlacement((prev) => ({
                          ...prev,
                          metafieldType: value as MetafieldTypeOption,
                        }))
                      }
                    >
                      <SelectTrigger id="metafieldType" className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_line_text_field">
                          Single line text
                        </SelectItem>
                        <SelectItem value="multi_line_text_field">
                          Multi line text
                        </SelectItem>
                        <SelectItem value="rich_text_editor">
                          Rich text editor
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Sync SEO Fields</Label>
              <div className="flex items-start justify-between rounded-md border bg-background px-4 py-3 gap-4">
                <div className="space-y-1 pr-4">
                  <p className="text-sm font-medium leading-tight">
                    Publish page title and meta description
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    When enabled, publishing updates the product's SEO title and
                    meta description in Shopify.
                  </p>
                </div>
                <Switch
                  checked={syncSeoFields}
                  onCheckedChange={(value) => setSyncSeoFields(Boolean(value))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t flex justify-between items-center">
            <Button
              variant="destructive"
              onClick={() => setIsDisconnectConfirmOpen(true)}
              disabled={isUpdatingSettings}
              size="sm"
            >
              Disconnect Store
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsSettingsOpen(false)}
                disabled={isUpdatingSettings}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={handleUpdateSettings}
                disabled={isUpdatingSettings}
              >
                {isUpdatingSettings ? "Updating..." : "Update Settings"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation Dialog */}
      <Dialog
        open={isDisconnectConfirmOpen}
        onOpenChange={setIsDisconnectConfirmOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Disconnection</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect from your Shopify store? This
              will remove your connection settings and you&apos;ll need to
              reconnect to access your products again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDisconnectConfirmOpen(false)}
              disabled={isUpdatingSettings}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={isUpdatingSettings}
            >
              {isUpdatingSettings ? "Disconnecting..." : "Disconnect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
