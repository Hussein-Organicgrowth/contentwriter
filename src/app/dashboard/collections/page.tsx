// src/app/dashboard/collections/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { toast } from "react-hot-toast";
import DOMPurify from "isomorphic-dompurify";
import Image from "next/image";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
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
import RichTextEditor from "@/components/RichTextEditor";

interface PendingDescription {
  collectionId: string;
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

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  status: string;
  image?: {
    src: string;
    alt?: string;
  };
  images: Array<{
    src: string;
    alt?: string;
  }>;
}

interface ShopifyCollection {
  id: string;
  title: string;
  body_html: string;
  descriptionHistory?: DescriptionHistory[];
  image?: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  products?: ShopifyProduct[];
}

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

export default function CollectionsPage() {
  const [collections, setCollections] = useState<ShopifyCollection[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<
    ShopifyCollection[]
  >([]);
  const [pendingDescriptions, setPendingDescriptions] = useState<
    Record<string, PendingDescription>
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [company, setCompany] = useState<string>("");
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(
    new Set()
  );
  const [loadingCollections, setLoadingCollections] = useState<Set<string>>(
    new Set()
  );
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageType>("da");
  const [selectedCountry, setSelectedCountry] = useState<CountryType>("DK");
  const [selectedCollection, setSelectedCollection] =
    useState<ShopifyCollection | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [loadingPendingDescriptions, setLoadingPendingDescriptions] =
    useState(false);

  useEffect(() => {
    // Get company from localStorage
    console.log("Getting company from localStorage");
    const storedCompany = localStorage.getItem("company");
    if (storedCompany) {
      console.log("Company found in localStorage:", storedCompany);
      setCompany(storedCompany);
      fetchCollections(storedCompany);
      fetchPendingDescriptions(storedCompany);
    }
  }, []);

  useEffect(() => {
    filterCollections();
  }, [searchQuery, showPendingOnly, pendingDescriptions]);

  useEffect(() => {
    if (company) {
      fetchPendingDescriptions(company);
    }
  }, [company]);

  const fetchCollections = async (company: string) => {
    try {
      const response = await fetch(
        `/api/platform/shopify/collections?company=${company}`
      );
      const data = await response.json();
      console.log("Collections data:", JSON.stringify(data, null, 2));
      setCollections(data.collections || []);
      setFilteredCollections(data.collections || []);
    } catch (error) {
      console.error("Error fetching collections:", error);
      toast.error("Failed to fetch collections");
    }
  };

  const fetchPendingDescriptions = async (company: string) => {
    try {
      setLoadingPendingDescriptions(true);
      const response = await fetch(
        `/api/platform/shopify/collections/pending?company=${company}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch pending descriptions");
      }
      const data = await response.json();
      if (data.pendingDescriptions) {
        const descriptionsMap = data.pendingDescriptions.reduce(
          (
            acc: Record<string, PendingDescription>,
            desc: PendingDescription
          ) => {
            acc[desc.collectionId] = desc;
            return acc;
          },
          {}
        );
        setPendingDescriptions(descriptionsMap);
      }
    } catch (error) {
      console.error("Error fetching pending descriptions:", error);
      toast.error("Failed to fetch pending descriptions");
    } finally {
      setLoadingPendingDescriptions(false);
    }
  };

  const filterCollections = () => {
    let filtered = collections;

    // Filter by pending status if enabled
    if (showPendingOnly) {
      filtered = filtered.filter(
        (collection) => pendingDescriptions[collection.id]
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((collection) =>
        collection.title.toLowerCase().includes(query)
      );
    }

    setFilteredCollections(filtered);
  };

  const handleGenerateDescription = async (collection: ShopifyCollection) => {
    try {
      // Get the company from localStorage
      const company = localStorage.getItem("company");
      console.log("Company from localStorage:", company);

      if (!company) {
        throw new Error("Company not found");
      }

      console.log("Generating description for collection:", {
        title: collection.title,
        products: collection.products || [],
        company,
        language: selectedLanguage,
        targetCountry: selectedCountry,
      });

      const generateResponse = await fetch(
        "/api/platform/shopify/collections/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: collection.title,
            products: collection.products || [],
            company,
            language: selectedLanguage,
            targetCountry: selectedCountry,
          }),
        }
      );

      if (!generateResponse.ok) {
        throw new Error("Failed to generate description");
      }

      const data = await generateResponse.json();
      console.log("Generated description response:", data);
      const { description: newDescription } = data;

      // Save pending description
      const pendingData = {
        collectionId: collection.id,
        oldDescription: collection.body_html || "",
        newDescription,
        company,
        generatedAt: new Date().toISOString(),
      };
      console.log("Saving pending description:", pendingData);

      const savePendingResponse = await fetch(
        "/api/platform/shopify/collections/pending",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(pendingData),
        }
      );

      if (!savePendingResponse.ok) {
        const errorData = await savePendingResponse.json();
        console.error("Error response from server:", errorData);
        throw new Error("Failed to save pending description");
      }

      const saveResult = await savePendingResponse.json();
      console.log("Save pending description response:", saveResult);

      // Update local state
      setPendingDescriptions({
        ...pendingDescriptions,
        [collection.id]: {
          collectionId: collection.id,
          oldDescription: collection.body_html || "",
          newDescription,
          generatedAt: new Date().toISOString(),
        },
      });

      toast.success("Description generated successfully");
    } catch (error) {
      console.error("Error generating description:", error);
      toast.error("Failed to generate description");
    }
  };

  const renderHTML = (html: string) => {
    const sanitizedHTML = DOMPurify.sanitize(html);
    return <div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />;
  };

  const toggleCollectionExpansion = async (collectionId: string) => {
    const newExpanded = new Set(expandedCollections);

    if (expandedCollections.has(collectionId)) {
      newExpanded.delete(collectionId);
      setExpandedCollections(newExpanded);
    } else {
      try {
        setLoadingCollections((prev) => new Set([...prev, collectionId]));
        const response = await fetch(
          `/api/platform/shopify/collections/${collectionId}/products?company=${company}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch collection products");
        }
        const data = await response.json();
        console.log("Collection products:", JSON.stringify(data, null, 2));

        const updatedCollections = collections.map((collection) =>
          collection.id === collectionId
            ? { ...collection, products: data.products }
            : collection
        );

        setCollections(updatedCollections);
        setFilteredCollections(updatedCollections);

        newExpanded.add(collectionId);
        setExpandedCollections(newExpanded);
      } catch (error) {
        console.error("Error fetching collection products:", error);
        toast.error("Failed to fetch collection products");
      } finally {
        setLoadingCollections((prev) => {
          const newSet = new Set(prev);
          newSet.delete(collectionId);
          return newSet;
        });
      }
    }
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

  const handleDiscardChanges = async (collectionId: string) => {
    try {
      const pendingDescription = pendingDescriptions[collectionId];
      if (!pendingDescription) return;

      // Delete the pending description
      const deletePendingResponse = await fetch(
        `/api/platform/shopify/collections/pending?company=${company}&collectionId=${collectionId}`,
        {
          method: "DELETE",
        }
      );

      if (!deletePendingResponse.ok) {
        throw new Error("Failed to delete pending description");
      }

      // Remove from local state
      const remainingDescriptions = { ...pendingDescriptions };
      delete remainingDescriptions[collectionId];
      setPendingDescriptions(remainingDescriptions);

      setIsCompareOpen(false);
      toast.success("Changes discarded successfully");
    } catch (error) {
      console.error("Error discarding changes:", error);
      toast.error("Failed to discard changes");
    }
  };

  const handlePublish = async (collection: ShopifyCollection) => {
    try {
      const pendingDescription = pendingDescriptions[collection.id];
      if (!pendingDescription) return;

      // Update Shopify collection description
      const updateResponse = await fetch(
        "/api/platform/shopify/collections/update",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            collectionId: collection.id,
            description: pendingDescription.newDescription,
            company,
          }),
        }
      );

      if (!updateResponse.ok) {
        throw new Error("Failed to update collection");
      }

      // Update local state
      const { collection: updatedCollection } = await updateResponse.json();
      const updatedCollections = collections.map((c) =>
        c.id === collection.id ? updatedCollection : c
      );
      setCollections(updatedCollections);
      filterCollections();

      // Remove pending description
      const remainingDescriptions = { ...pendingDescriptions };
      delete remainingDescriptions[collection.id];
      setPendingDescriptions(remainingDescriptions);

      toast.success("Collection description updated successfully");
      setIsCompareOpen(false);
    } catch (error) {
      console.error("Error publishing description:", error);
      toast.error("Failed to publish description");
    }
  };

  const CompareDialog = () => {
    const [editedDescription, setEditedDescription] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
      if (!selectedCollection) return;
      const pendingDesc = pendingDescriptions[selectedCollection.id];
      if (pendingDesc) {
        setEditedDescription(pendingDesc.newDescription);
      }
    }, [selectedCollection, pendingDescriptions]);

    if (!selectedCollection) return null;

    return (
      <Dialog open={isCompareOpen} onOpenChange={setIsCompareOpen}>
        <DialogContent className="max-w-7xl w-[95vw] h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-start gap-4 mb-4">
              {selectedCollection.image && (
                <img
                  src={selectedCollection.image.src}
                  alt={selectedCollection.title}
                  className="w-24 h-24 object-cover rounded-md"
                />
              )}
              <div>
                <DialogTitle className="text-xl">
                  {selectedCollection.title}
                </DialogTitle>
              </div>
            </div>
            <DialogDescription>
              Review and edit the changes before publishing
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
            <div className="flex flex-col min-h-0 overflow-hidden">
              <h3 className="font-semibold mb-2 flex-shrink-0">
                Original Description
              </h3>
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 border rounded-lg prose prose-sm bg-muted">
                  {pendingDescriptions[selectedCollection.id]
                    ?.oldDescription ? (
                    renderHTML(
                      pendingDescriptions[selectedCollection.id].oldDescription
                    )
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? "Preview" : "Edit"}
                </Button>
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
                          setEditedDescription(
                            pendingDescriptions[selectedCollection.id]
                              ?.newDescription || ""
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
                              "/api/platform/shopify/collections/pending",
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  collectionId: selectedCollection.id,
                                  oldDescription:
                                    pendingDescriptions[selectedCollection.id]
                                      ?.oldDescription ||
                                    selectedCollection.body_html ||
                                    "",
                                  newDescription: editedDescription,
                                  company,
                                  generatedAt: new Date().toISOString(),
                                }),
                              }
                            );

                            if (!savePendingResponse.ok) {
                              throw new Error("Failed to save changes");
                            }

                            // Update local state
                            setPendingDescriptions((prev) => ({
                              ...prev,
                              [selectedCollection.id]: {
                                ...prev[selectedCollection.id],
                                newDescription: editedDescription,
                              },
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
                    {pendingDescriptions[selectedCollection.id] ? (
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
              onClick={() => handleDiscardChanges(selectedCollection.id)}
            >
              Discard Changes
            </Button>
            <Button
              onClick={() => handlePublish(selectedCollection)}
              variant="secondary"
            >
              Publish Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Shopify Collections</h1>

      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => company && fetchCollections(company)}
                variant="secondary"
              >
                Refresh Collections
              </Button>
              <div className="flex items-center gap-2">
                <Label htmlFor="search">Search:</Label>
                <Input
                  id="search"
                  placeholder="Search collections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-[250px]"
                />
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
            <Label className="text-sm font-medium">Generation Settings:</Label>
            <LanguageSelector />
            <CountrySelector />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Image</TableHead>
                <TableHead>Collection Name</TableHead>
                <TableHead className="max-w-[400px]">
                  Original Description
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCollections.map((collection) => (
                <React.Fragment key={collection.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleCollectionExpansion(collection.id)}
                  >
                    <TableCell>
                      {collection.image && (
                        <div className="relative w-[80px] h-[80px]">
                          <Image
                            src={collection.image.src}
                            alt={collection.image.alt || collection.title}
                            fill
                            className="object-cover rounded-md"
                            sizes="80px"
                          />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {loadingCollections.has(collection.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : expandedCollections.has(collection.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                        {collection.title}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[400px]">
                      <div className="max-h-[200px] overflow-y-auto prose prose-sm">
                        {pendingDescriptions[collection.id] ? (
                          renderHTML(
                            pendingDescriptions[collection.id].oldDescription
                          )
                        ) : collection.body_html ? (
                          renderHTML(collection.body_html)
                        ) : (
                          <span className="text-gray-500 italic">
                            No description available
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {loadingPendingDescriptions ? (
                        <div className="flex items-center justify-end gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">
                            Loading changes...
                          </span>
                        </div>
                      ) : pendingDescriptions[collection.id] ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCollection(collection);
                            setIsCompareOpen(true);
                          }}
                        >
                          View Changes
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateDescription(collection);
                          }}
                        >
                          Generate Description
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedCollections.has(collection.id) && (
                    <TableRow>
                      <TableCell colSpan={4} className="bg-gray-50">
                        <div className="p-4">
                          <h3 className="font-medium mb-4">
                            Products in this collection:
                          </h3>
                          {loadingCollections.has(collection.id) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {Array.from({ length: 6 }).map((_, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-4 p-4 bg-white rounded-lg border"
                                >
                                  <div className="relative w-[60px] h-[60px] bg-gray-200 animate-pulse rounded-md" />
                                  <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 animate-pulse rounded" />
                                    <div className="h-3 bg-gray-200 animate-pulse rounded w-2/3" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {!loadingCollections.has(collection.id) && (
                            <>
                              {collection.products &&
                              collection.products.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {collection.products.map((product) => (
                                    <div
                                      key={product.id}
                                      className="flex items-center gap-4 p-4 bg-white rounded-lg border"
                                    >
                                      {product.image && (
                                        <div className="relative w-[60px] h-[60px]">
                                          <Image
                                            src={product.image.src}
                                            alt={
                                              product.image.alt || product.title
                                            }
                                            fill
                                            className="object-cover rounded-md"
                                            sizes="60px"
                                          />
                                        </div>
                                      )}
                                      <div className="flex-1">
                                        <h4 className="font-medium">
                                          {product.title}
                                        </h4>
                                        <p className="text-sm text-gray-500">
                                          {product.vendor}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-500 italic">
                                  No products found in this collection
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <CompareDialog />
    </div>
  );
}
