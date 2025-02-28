"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import DOMPurify from "isomorphic-dompurify";
import RichTextEditor from "@/components/RichTextEditor";
import { cn } from "@/lib/utils";

interface PendingDescription {
  productId: string;
  oldDescription: string;
  newDescription: string;
  generatedAt: string;
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

export default function ProductsPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ShopifyProduct[]>(
    []
  );
  const [storeName, setStoreName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [company, setCompany] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<StatusType>("all");
  const [isGenerating, setIsGenerating] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set()
  );
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageType>("da");
  const [selectedCountry, setSelectedCountry] = useState<CountryType>("DK");
  const [pendingDescriptions, setPendingDescriptions] = useState<
    Record<string, PendingDescription>
  >({});
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProduct | null>(
    null
  );
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Get company from localStorage
    const storedCompany = localStorage.getItem("company");
    if (storedCompany) {
      setCompany(storedCompany);
      checkShopifyConnection(storedCompany);
    }
    if (company) {
      fetchPendingDescriptions(company);
    }
  }, []);

  useEffect(() => {
    filterProducts();
  }, [
    selectedStatus,
    products,
    searchQuery,
    showPendingOnly,
    pendingDescriptions,
  ]);

  const filterProducts = () => {
    let filtered = products;

    // Filter by pending status if enabled
    if (showPendingOnly) {
      filtered = filtered.filter((product) => pendingDescriptions[product.id]);
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

  const handleConnect = async () => {
    if (!company) {
      toast.error("Company information not found");
      return;
    }

    try {
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
        }),
      });

      if (response.ok) {
        toast.success("Successfully connected to Shopify");
        setIsConnected(true);
        fetchProducts(company);
      } else {
        throw new Error("Failed to connect");
      }
    } catch (error: unknown) {
      console.error("Error connecting to Shopify:", error);
      toast.error("Failed to connect to Shopify");
    }
  };

  const fetchProducts = async (companyName: string) => {
    try {
      setIsLoading(true);
      // Fetch products and pending descriptions in parallel
      const [productsResponse, pendingResponse] = await Promise.all([
        fetch(`/api/platform/shopify/products?company=${companyName}`),
        fetch(`/api/platform/shopify/pending?company=${companyName}`),
      ]);

      if (!productsResponse.ok) {
        throw new Error("Failed to fetch products");
      }

      const productsData = await productsResponse.json();

      // Handle pending descriptions and history
      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json();
        if (pendingData.pendingDescriptions) {
          // Separate history items from pending descriptions
          const historyItems = pendingData.pendingDescriptions.filter(
            (desc: PendingDescriptionWithHistory) => desc.isHistory
          );
          const pendingItems = pendingData.pendingDescriptions.filter(
            (desc: PendingDescriptionWithHistory) => !desc.isHistory
          );

          // Create history map
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

          // Add history to products
          const productsWithHistory = productsData.products.map(
            (product: ShopifyProduct) => ({
              ...product,
              descriptionHistory: historyMap[product.id] || [],
            })
          );

          setProducts(productsWithHistory);
          setFilteredProducts(productsWithHistory);

          // Set pending descriptions
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
          setPendingDescriptions(descriptionsMap);
        }
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to fetch products");
    } finally {
      setIsLoading(false);
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
      setIsGenerating({ ...isGenerating, [product.id]: true });

      const generateResponse = await fetch("/api/generate/description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: product.title,
          company,
          existingDescription: product.body_html || "",
          language: selectedLanguage,
          targetCountry: selectedCountry,
        }),
      });

      if (!generateResponse.ok) {
        throw new Error("Failed to generate description");
      }

      const { description: newDescription } = await generateResponse.json();

      // Save pending description
      const savePendingResponse = await fetch("/api/platform/shopify/pending", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: product.id,
          oldDescription: product.body_html || "",
          newDescription,
          company,
        }),
      });

      if (!savePendingResponse.ok) {
        throw new Error("Failed to save pending description");
      }

      // Update local state
      setPendingDescriptions({
        ...pendingDescriptions,
        [product.id]: {
          productId: product.id,
          oldDescription: product.body_html || "",
          newDescription,
          generatedAt: new Date().toISOString(),
        },
      });

      toast.success("Description generated successfully");
    } catch (error) {
      console.error("Error generating description:", error);
      toast.error("Failed to generate description");
    } finally {
      setIsGenerating({ ...isGenerating, [product.id]: false });
    }
  };

  const handleBulkGenerate = async () => {
    if (selectedProducts.size === 0) {
      toast.error("Please select products to generate descriptions");
      return;
    }

    setIsBulkGenerating(true);
    let successCount = 0;
    const failCount = 0;

    try {
      const selectedProductsList = filteredProducts.filter((p) =>
        selectedProducts.has(p.id)
      );

      for (const product of selectedProductsList) {
        await generateAndSavePendingDescription(product);
        successCount++;
        toast.success(
          `Progress: ${successCount + failCount}/${selectedProducts.size}`
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
      setSelectedProducts(new Set());
    }
  };

  const handlePublish = async (product: ShopifyProduct) => {
    try {
      const pendingDescription = pendingDescriptions[product.id];
      if (!pendingDescription) return;

      // Store the current Shopify description in the pending description
      const updatedPendingResponse = await fetch(
        "/api/platform/shopify/pending",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: product.id,
            oldDescription: product.body_html || "", // Keep the current Shopify description
            newDescription: pendingDescription.newDescription,
            company,
            generatedAt: pendingDescription.generatedAt,
          }),
        }
      );

      if (!updatedPendingResponse.ok) {
        throw new Error("Failed to update pending description");
      }

      // Update Shopify product description
      const updateResponse = await fetch("/api/platform/shopify/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: product.id,
          description: pendingDescription.newDescription,
          company,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to update product");
      }

      // Update local state while keeping the original description
      const newPendingDesc = {
        ...pendingDescription,
        oldDescription: product.body_html || "", // Keep the current Shopify description
      };

      setPendingDescriptions({
        ...pendingDescriptions,
        [product.id]: newPendingDesc,
      });

      // Update products list
      const { product: updatedProduct } = await updateResponse.json();
      const updatedProducts = products.map((p) =>
        p.id === product.id ? updatedProduct : p
      );
      setProducts(updatedProducts);
      filterProducts();

      toast.success("Product description updated successfully");
      setIsCompareOpen(false);
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

      // Remove from local state
      const remainingDescriptions = { ...pendingDescriptions };
      delete remainingDescriptions[productId];
      setPendingDescriptions(remainingDescriptions);

      setIsCompareOpen(false);
      toast.success("Changes discarded successfully");
    } catch (error) {
      console.error("Error discarding changes:", error);
      toast.error("Failed to discard changes");
    }
  };

  const handleBulkPublish = async () => {
    const pendingProducts = filteredProducts.filter(
      (product) => pendingDescriptions[product.id]
    );

    if (pendingProducts.length === 0) {
      toast.error("No pending descriptions to publish");
      return;
    }

    let successCount = 0;
    let failCount = 0;

    try {
      for (const product of pendingProducts) {
        try {
          await handlePublish(product);
          successCount++;
          toast.success(
            `Progress: ${successCount + failCount}/${pendingProducts.length}`
          );
        } catch (error) {
          failCount++;
          console.error(`Failed to publish ${product.title}:`, error);
        }
      }

      toast.success(
        `Completed! Successfully published: ${successCount}, Failed: ${failCount}`
      );
    } catch (error) {
      console.error("Error in bulk publish:", error);
      toast.error("Failed to complete bulk publish");
    }
  };

  const handleBulkPublishSelected = async () => {
    const selectedPendingProducts = filteredProducts.filter(
      (product) =>
        selectedProducts.has(product.id) && pendingDescriptions[product.id]
    );

    if (selectedPendingProducts.length === 0) {
      toast.error("No pending descriptions selected to publish");
      return;
    }

    let successCount = 0;
    let failCount = 0;

    try {
      for (const product of selectedPendingProducts) {
        try {
          await handlePublish(product);
          successCount++;
          toast.success(
            `Progress: ${successCount + failCount}/${
              selectedPendingProducts.length
            }`
          );
        } catch (error) {
          failCount++;
          console.error(`Failed to publish ${product.title}:`, error);
        }
      }

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
      }
    }, [selectedProduct, pendingDescriptions]);

    if (!selectedProduct) return null;

    const handleRegenerate = async () => {
      if (!selectedProduct) return;

      try {
        setIsRegenerating(true);

        // Generate new description
        const generateResponse = await fetch("/api/generate/description", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: selectedProduct.title,
            company,
            existingDescription: selectedProduct.body_html || "",
            language: selectedLanguage,
            targetCountry: selectedCountry,
          }),
        });

        if (!generateResponse.ok) {
          throw new Error("Failed to generate description");
        }

        const { description: newDescription } = await generateResponse.json();

        // Remove any ```html tags from the description
        const cleanDescription = newDescription.replace(
          /```html\n?|\n?```/g,
          ""
        );

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
          }),
        });

        if (!updateResponse.ok) {
          throw new Error("Failed to update Shopify product");
        }

        // Update local state
        const newPendingDesc = {
          ...localPendingDescription,
          newDescription: localPendingDescription.oldDescription,
        };

        setLocalPendingDescription(newPendingDesc);
        setPendingDescriptions({
          ...pendingDescriptions,
          [selectedProduct.id]: newPendingDesc,
        });

        // Update products list with the reverted description
        const { product: updatedProduct } = await updateResponse.json();
        const updatedProducts = products.map((p) =>
          p.id === selectedProduct.id ? updatedProduct : p
        );
        setProducts(updatedProducts);
        filterProducts();

        setEditedDescription(localPendingDescription.oldDescription);
        setRevertDescription(null);
        setShowRevertConfirm(false);
        setIsCompareOpen(false);
        toast.success("Description reverted and published successfully");
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
              <DialogDescription className="flex items-center justify-between">
                <span>Review and edit the changes before publishing</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                  >
                    {isRegenerating ? (
                      <>
                        <span className="animate-spin mr-2">⟳</span>
                        Regenerating...
                      </>
                    ) : (
                      "Regenerate Description"
                    )}
                  </Button>
                </div>
              </DialogDescription>
            </DialogHeader>
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
                      <RichTextEditor
                        content={editedDescription}
                        onChange={setEditedDescription}
                      />
                      <div className="absolute bottom-4 right-4 z-10 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setIsEditing(false);
                            // Reset to the last saved description
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
    <div className="flex items-center gap-2">
      <Label>Language:</Label>
      <Select
        value={selectedLanguage}
        onValueChange={(value: LanguageType) => setSelectedLanguage(value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en-US">English (US)</SelectItem>
          <SelectItem value="en-GB">English (UK)</SelectItem>
          <SelectItem value="es">Spanish</SelectItem>
          <SelectItem value="fr">French</SelectItem>
          <SelectItem value="de">German</SelectItem>
          <SelectItem value="it">Italian</SelectItem>
          <SelectItem value="pt">Portuguese</SelectItem>
          <SelectItem value="nl">Dutch</SelectItem>
          <SelectItem value="pl">Polish</SelectItem>
          <SelectItem value="sv">Swedish</SelectItem>
          <SelectItem value="da">Danish</SelectItem>
          <SelectItem value="no">Norwegian</SelectItem>
          <SelectItem value="fi">Finnish</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const CountrySelector = () => (
    <div className="flex items-center gap-2">
      <Label>Market:</Label>
      <Select
        value={selectedCountry}
        onValueChange={(value: CountryType) => setSelectedCountry(value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select market" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="US">United States</SelectItem>
          <SelectItem value="GB">United Kingdom</SelectItem>
          <SelectItem value="CA">Canada</SelectItem>
          <SelectItem value="AU">Australia</SelectItem>
          <SelectItem value="DE">Germany</SelectItem>
          <SelectItem value="FR">France</SelectItem>
          <SelectItem value="ES">Spain</SelectItem>
          <SelectItem value="IT">Italy</SelectItem>
          <SelectItem value="NL">Netherlands</SelectItem>
          <SelectItem value="SE">Sweden</SelectItem>
          <SelectItem value="NO">Norway</SelectItem>
          <SelectItem value="DK">Denmark</SelectItem>
          <SelectItem value="FI">Finland</SelectItem>
          <SelectItem value="PL">Poland</SelectItem>
          <SelectItem value="BR">Brazil</SelectItem>
          <SelectItem value="MX">Mexico</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

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

  if (!company) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-8">Error</h1>
        <p>Company information not found. Please try logging in again.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Shopify Products</h1>

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
                onChange={(e) => setStoreName(e.target.value)}
              />
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
            <Button onClick={handleConnect} variant="secondary">
              Connect to Shopify
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => fetchProducts(company)}
                  variant="secondary"
                >
                  Refresh Products
                </Button>
                <div className="flex items-center gap-2">
                  <Label htmlFor="search">Search:</Label>
                  <Input
                    id="search"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-[250px]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="status-filter">Status:</Label>
                  <Select
                    value={selectedStatus}
                    onValueChange={(value: StatusType) =>
                      setSelectedStatus(value)
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="pending-filter" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="pending-filter"
                        checked={showPendingOnly}
                        onCheckedChange={(checked) =>
                          setShowPendingOnly(checked as boolean)
                        }
                      />
                      <span>Show Pending Only</span>
                    </div>
                  </Label>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 border-t pt-4">
              <Label className="text-sm font-medium">
                Generation Settings:
              </Label>
              <LanguageSelector />
              <CountrySelector />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
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
                  filteredProducts.map((product) => (
                    <TableRow
                      key={product.id}
                      className={cn(
                        pendingDescriptions[product.id] && "bg-muted/30"
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedProducts.has(product.id)}
                          onCheckedChange={() =>
                            toggleProductSelection(product.id)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {product.images[0] && (
                          <img
                            src={product.images[0].src}
                            alt={product.title}
                            className="w-[80px] h-[80px] object-cover rounded-md"
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-2">
                          <span>{product.title}</span>
                          {pendingDescriptions[product.id] && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 w-fit">
                              Pending Changes
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[400px]">
                        <div className="max-h-[200px] overflow-y-auto prose prose-sm">
                          {pendingDescriptions[product.id] ? (
                            <div className="relative">
                              <div className="absolute right-0 top-0 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                Original
                              </div>
                              {renderHTML(
                                pendingDescriptions[product.id].oldDescription
                              )}
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
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            product.status === "active"
                              ? "bg-green-100 text-green-800"
                              : product.status === "draft"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
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
                            onClick={() =>
                              generateAndSavePendingDescription(product)
                            }
                            disabled={isGenerating[product.id]}
                          >
                            {isGenerating[product.id]
                              ? "Generating..."
                              : "Generate Description"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      <CompareDialog />

      {/* Add fixed bottom bar for bulk actions */}
      {selectedProducts.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg p-4 flex items-center justify-between z-50">
          <div className="text-sm text-muted-foreground">
            Selected: {selectedProducts.size} of {filteredProducts.length}{" "}
            products (
            {
              filteredProducts.filter(
                (p) => selectedProducts.has(p.id) && pendingDescriptions[p.id]
              ).length
            }{" "}
            pending)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleBulkGenerate}
              disabled={selectedProducts.size === 0 || isBulkGenerating}
            >
              {isBulkGenerating ? "Generating..." : "Generate Selected"}
            </Button>
            <Button
              variant="secondary"
              onClick={handleBulkPublishSelected}
              disabled={
                filteredProducts.filter(
                  (p) => selectedProducts.has(p.id) && pendingDescriptions[p.id]
                ).length === 0
              }
            >
              Publish Selected Pending
            </Button>
            <Button
              variant="secondary"
              onClick={handleBulkPublish}
              disabled={Object.keys(pendingDescriptions).length === 0}
            >
              Publish All Pending ({Object.keys(pendingDescriptions).length})
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
