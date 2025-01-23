"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "react-hot-toast";
import {
  Loader2,
  ShoppingBag,
  Globe,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
  Upload,
  Trash2,
} from "lucide-react";
import type { IWebsite, PlatformConfig } from "@/models/Website";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PlatformSettings {
  wordpress?: PlatformConfig;
  shopify?: PlatformConfig;
}

interface ContentItem {
  _id: string;
  title: string;
  status: "Published" | "Draft";
  date: string;
  platformPublishStatus?: {
    wordpress?: {
      published: boolean;
      publishedUrl?: string;
      lastSynced?: string;
      error?: string;
    };
  };
}

interface CustomPostType {
  slug: string;
  name: string;
  description: string;
  rest_base: string;
}

export default function WorkflowSettings() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<PlatformSettings>({});
  const [activeTab, setActiveTab] = useState("wordpress");
  const [content, setContent] = useState<ContentItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishStatus, setPublishStatus] = useState<"draft" | "publish">(
    "draft"
  );
  const [customPostTypes, setCustomPostTypes] = useState<CustomPostType[]>([]);
  const [isLoadingPostTypes, setIsLoadingPostTypes] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings.wordpress?.enabled && settings.wordpress.credentials?.apiUrl) {
      fetchCustomPostTypes();
    }
  }, [settings.wordpress?.enabled, settings.wordpress?.credentials?.apiUrl]);

  const fetchCustomPostTypes = async () => {
    if (!settings.wordpress?.credentials) return;

    setIsLoadingPostTypes(true);
    try {
      const companyName = localStorage.getItem("company");
      if (!companyName) {
        toast.error("No company selected");
        return;
      }

      const response = await fetch("/api/platform/wordpress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get-post-types",
          websiteName: companyName,
          credentials: settings.wordpress.credentials,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch custom post types");
      }

      const data = await response.json();
      setCustomPostTypes(data.postTypes || []);
    } catch (error) {
      console.error("Error fetching custom post types:", error);
      toast.error("Failed to fetch custom post types");
    } finally {
      setIsLoadingPostTypes(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const companyName = localStorage.getItem("company");
      if (!companyName) {
        toast.error("No company selected");
        return;
      }

      const response = await fetch("/api/website");
      const data = await response.json();

      const website = data.websites?.find(
        (w: IWebsite) => w.name.toLowerCase() === companyName.toLowerCase()
      );

      if (!website) {
        toast.error("Website not found");
        return;
      }

      console.log("Found website:", website.name);
      console.log("Platform integrations:", website.platformIntegrations);

      // Initialize platform settings
      const platformSettings: PlatformSettings = {};

      // Process WordPress integration if it exists
      const wordpressIntegration = website.platformIntegrations?.find(
        (p: PlatformConfig) => p.platform === "wordpress"
      );

      console.log("WordPress integration:", wordpressIntegration);

      if (wordpressIntegration) {
        platformSettings.wordpress = {
          platform: "wordpress",
          enabled: wordpressIntegration.enabled,
          credentials: {
            apiUrl: wordpressIntegration.credentials?.apiUrl || "",
            apiKey: wordpressIntegration.credentials?.apiKey || "",
            username: wordpressIntegration.credentials?.username || "",
          },
          settings: {
            autoPublish: wordpressIntegration.settings?.autoPublish || false,
            defaultStatus:
              wordpressIntegration.settings?.defaultStatus || "draft",
          },
        };
      } else {
        // Initialize empty WordPress settings if none exist
        platformSettings.wordpress = {
          platform: "wordpress",
          enabled: false,
          credentials: {
            apiUrl: "",
            apiKey: "",
            username: "",
          },
          settings: {
            autoPublish: false,
            defaultStatus: "draft",
          },
        };
      }

      // Process Shopify integration if it exists
      const shopifyIntegration = website.platformIntegrations?.find(
        (p: PlatformConfig) => p.platform === "shopify"
      );

      if (shopifyIntegration) {
        platformSettings.shopify = {
          platform: "shopify",
          enabled: shopifyIntegration.enabled,
          credentials: {
            storeName: shopifyIntegration.credentials?.storeName || "",
            apiKey: shopifyIntegration.credentials?.apiKey || "",
            apiSecret: shopifyIntegration.credentials?.apiSecret || "",
          },
          settings: {
            autoPublish: shopifyIntegration.settings?.autoPublish || false,
            defaultStatus:
              shopifyIntegration.settings?.defaultStatus || "draft",
          },
        };
      }

      console.log(
        "Loaded settings:",
        JSON.stringify(platformSettings, null, 2)
      );
      setSettings(platformSettings);
      setContent(website.content || []);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to fetch settings");
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (platform: "wordpress" | "shopify") => {
    try {
      const companyName = localStorage.getItem("company");
      if (!companyName) {
        toast.error("No company selected");
        return;
      }

      // Get current platform settings
      const platformSettings = settings[platform];
      if (!platformSettings) {
        toast.error("No settings to save");
        return;
      }

      // Log the current platform settings
      console.log(
        "Current platform settings:",
        JSON.stringify(platformSettings, null, 2)
      );

      // Create credentials object with explicit username
      const credentials =
        platform === "wordpress"
          ? {
              apiUrl: platformSettings.credentials?.apiUrl || "",
              apiKey: platformSettings.credentials?.apiKey || "",
              username: platformSettings.credentials?.username || "admin",
            }
          : {
              storeName: platformSettings.credentials?.storeName || "",
              apiKey: platformSettings.credentials?.apiKey || "",
              apiSecret: platformSettings.credentials?.apiSecret || "",
            };

      // Add detailed logging
      console.log(
        "Platform settings credentials:",
        platformSettings.credentials
      );
      console.log(
        "Username from settings:",
        platformSettings.credentials?.username
      );
      console.log("Final credentials object:", credentials);

      const settingsToSave = {
        platform,
        enabled: platformSettings.enabled,
        credentials,
        settings: {
          autoPublish: platformSettings.settings?.autoPublish || false,
          defaultStatus: platformSettings.settings?.defaultStatus || "draft",
        },
      };

      console.log(
        "Full settings to save:",
        JSON.stringify(settingsToSave, null, 2)
      );

      const response = await fetch(`/api/platform/${platform}/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          websiteName: companyName,
          settings: {
            enabled: platformSettings.enabled,
            credentials,
            settings: {
              autoPublish: platformSettings.settings?.autoPublish || false,
              defaultStatus:
                platformSettings.settings?.defaultStatus || "draft",
            },
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save settings");
      }

      toast.success("Settings saved successfully");
      // Refresh settings to ensure we have the latest data
      await fetchSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    }
  };

  const updateSettings = (
    platform: "wordpress" | "shopify",
    field: string,
    value: any
  ) => {
    setSettings((prev) => {
      const currentSettings: PlatformConfig = prev[platform] || {
        platform,
        enabled: false,
        credentials: {
          apiUrl: "",
          apiKey: "",
          username: "",
        },
        settings: {
          autoPublish: false,
          defaultStatus: "draft",
        },
      };

      console.log(
        "Current settings:",
        JSON.stringify(currentSettings, null, 2)
      );
      console.log("Updating field:", field, "with value:", value);

      if (field === "credentials") {
        return {
          ...prev,
          [platform]: {
            ...currentSettings,
            platform,
            credentials: {
              ...currentSettings.credentials,
              ...value,
            },
          },
        };
      }

      if (field === "settings") {
        return {
          ...prev,
          [platform]: {
            ...currentSettings,
            platform,
            settings: {
              ...currentSettings.settings,
              ...value,
            },
          },
        };
      }

      return {
        ...prev,
        [platform]: {
          ...currentSettings,
          platform,
          [field]: value,
        },
      };
    });
  };

  const testConnection = async (platform: "wordpress" | "shopify") => {
    try {
      const companyName = localStorage.getItem("company");
      if (!companyName) {
        toast.error("No company selected");
        return;
      }

      const response = await fetch(`/api/platform/${platform}/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          websiteName: companyName,
          credentials: settings[platform]?.credentials,
        }),
      });

      if (!response.ok) {
        throw new Error("Connection test failed");
      }

      toast.success("Connection successful");
    } catch (error) {
      console.error("Error testing connection:", error);
      toast.error("Connection test failed");
    }
  };

  const handlePublishToWordPress = async () => {
    if (!settings.wordpress?.enabled || selectedItems.size === 0) return;

    setIsPublishing(true);
    let successCount = 0;
    let failureCount = 0;

    try {
      const companyName = localStorage.getItem("company");
      if (!companyName) {
        toast.error("No company selected");
        return;
      }

      for (const contentId of selectedItems) {
        try {
          const response = await fetch("/api/platform/wordpress/publish", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              websiteName: companyName,
              contentId,
              status: publishStatus,
              credentials: settings.wordpress.credentials,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to publish to WordPress");
          }

          const result = await response.json();
          successCount++;

          // Update local content state
          setContent((prev) =>
            prev.map((item) =>
              item._id === contentId
                ? {
                    ...item,
                    platformPublishStatus: {
                      ...item.platformPublishStatus,
                      wordpress: {
                        published: result.status === "publish",
                        publishedUrl: result.postUrl,
                        lastSynced: new Date().toISOString(),
                      },
                    },
                  }
                : item
            )
          );
        } catch (error) {
          console.error(`Error publishing content ${contentId}:`, error);
          failureCount++;
        }
      }

      toast.success(
        `Published ${successCount} items${
          failureCount > 0 ? `, ${failureCount} failed` : ""
        }`
      );
      setShowPublishDialog(false);
      setSelectedItems(new Set());
    } catch (error) {
      console.error("Error publishing to WordPress:", error);
      toast.error("Failed to publish to WordPress");
    } finally {
      setIsPublishing(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === content.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(content.map((item) => item._id)));
    }
  };

  const toggleItemSelection = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Platform Integrations
          </h1>
          <p className="text-muted-foreground">
            Configure your content publishing workflows
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="wordpress" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              WordPress
            </TabsTrigger>
            <TabsTrigger value="shopify" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Shopify
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wordpress">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>WordPress Integration</CardTitle>
                  <CardDescription>
                    Configure your WordPress site connection
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable WordPress Integration</Label>
                      <p className="text-sm text-muted-foreground">
                        Publish content directly to your WordPress site
                      </p>
                    </div>
                    <Switch
                      checked={settings.wordpress?.enabled || false}
                      onCheckedChange={(checked) =>
                        updateSettings("wordpress", "enabled", checked)
                      }
                    />
                  </div>

                  {settings.wordpress?.enabled && (
                    <>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>WordPress Site URL</Label>
                          <Input
                            placeholder="https://your-site.com"
                            value={
                              settings.wordpress?.credentials?.apiUrl || ""
                            }
                            onChange={(e) =>
                              updateSettings("wordpress", "credentials", {
                                ...settings.wordpress?.credentials,
                                apiUrl: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>WordPress Username</Label>
                          <Input
                            placeholder="Your WordPress username"
                            value={
                              settings.wordpress?.credentials?.username || ""
                            }
                            onChange={(e) =>
                              updateSettings("wordpress", "credentials", {
                                ...settings.wordpress?.credentials,
                                username: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Application Password</Label>
                          <Input
                            type="password"
                            placeholder="WordPress application password"
                            value={
                              settings.wordpress?.credentials?.apiKey || ""
                            }
                            onChange={(e) =>
                              updateSettings("wordpress", "credentials", {
                                ...settings.wordpress?.credentials,
                                apiKey: e.target.value,
                              })
                            }
                          />
                          <p className="text-sm text-muted-foreground">
                            Enter your application password without spaces. You
                            can generate this in WordPress under Users → Profile
                            → Application Passwords.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Default Post Status</Label>
                          <Select
                            value={
                              settings.wordpress?.settings?.defaultStatus ||
                              "draft"
                            }
                            onValueChange={(value: "draft" | "publish") =>
                              updateSettings("wordpress", "settings", {
                                ...settings.wordpress?.settings,
                                defaultStatus: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select post status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="publish">Published</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Post Type</Label>
                          <Select
                            value={
                              settings.wordpress?.settings?.postType || "post"
                            }
                            onValueChange={(
                              value: "post" | "page" | "custom"
                            ) =>
                              updateSettings("wordpress", "settings", {
                                ...settings.wordpress?.settings,
                                postType: value,
                                // Clear customPostType when switching away from custom
                                ...(value !== "custom" && {
                                  customPostType: undefined,
                                }),
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select post type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="post">Blog Post</SelectItem>
                              <SelectItem value="page">Page</SelectItem>
                              {customPostTypes.length > 0 && (
                                <SelectItem value="custom">
                                  Custom Post Type
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {settings.wordpress?.settings?.postType ===
                          "custom" && (
                          <div className="space-y-2">
                            <Label>Custom Post Type</Label>
                            {isLoadingPostTypes ? (
                              <div className="flex items-center space-x-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm text-muted-foreground">
                                  Loading custom post types...
                                </span>
                              </div>
                            ) : customPostTypes.length > 0 ? (
                              <Select
                                value={
                                  settings.wordpress?.settings?.customPostType
                                }
                                onValueChange={(value: string) =>
                                  updateSettings("wordpress", "settings", {
                                    ...settings.wordpress?.settings,
                                    customPostType: value,
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select custom post type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {customPostTypes.map((type) => (
                                    <SelectItem
                                      key={type.slug}
                                      value={type.rest_base || type.slug}
                                    >
                                      <div className="space-y-1">
                                        <div>{type.name}</div>
                                        {type.description && (
                                          <p className="text-xs text-muted-foreground">
                                            {type.description}
                                          </p>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                No custom post types found in your WordPress
                                site
                              </div>
                            )}
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>Featured Image Settings</Label>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label>Enable Featured Images</Label>
                                <p className="text-sm text-muted-foreground">
                                  Set featured images for WordPress posts
                                </p>
                              </div>
                              <Switch
                                checked={
                                  settings.wordpress?.settings?.featuredImage
                                    ?.enabled || false
                                }
                                onCheckedChange={(checked) =>
                                  updateSettings("wordpress", "settings", {
                                    ...settings.wordpress?.settings,
                                    featuredImage: {
                                      ...settings.wordpress?.settings
                                        ?.featuredImage,
                                      enabled: checked,
                                    },
                                  })
                                }
                              />
                            </div>

                            {settings.wordpress?.settings?.featuredImage
                              ?.enabled && (
                              <>
                                <div className="space-y-2">
                                  <Label>Default Featured Image URL</Label>
                                  <Input
                                    placeholder="https://example.com/default-image.jpg"
                                    value={
                                      settings.wordpress?.settings
                                        ?.featuredImage?.defaultImage || ""
                                    }
                                    onChange={(e) =>
                                      updateSettings("wordpress", "settings", {
                                        ...settings.wordpress?.settings,
                                        featuredImage: {
                                          ...settings.wordpress?.settings
                                            ?.featuredImage,
                                          defaultImage: e.target.value,
                                        },
                                      })
                                    }
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="space-y-0.5">
                                    <Label>Use First Image</Label>
                                    <p className="text-sm text-muted-foreground">
                                      Use the first image in the content as
                                      featured image
                                    </p>
                                  </div>
                                  <Switch
                                    checked={
                                      settings.wordpress?.settings
                                        ?.featuredImage?.useFirstImage || false
                                    }
                                    onCheckedChange={(checked) =>
                                      updateSettings("wordpress", "settings", {
                                        ...settings.wordpress?.settings,
                                        featuredImage: {
                                          ...settings.wordpress?.settings
                                            ?.featuredImage,
                                          useFirstImage: checked,
                                        },
                                      })
                                    }
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Author Settings</Label>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label>Use Default Author</Label>
                                <p className="text-sm text-muted-foreground">
                                  Always use a specific author for posts
                                </p>
                              </div>
                              <Switch
                                checked={
                                  settings.wordpress?.settings?.author
                                    ?.useDefault || false
                                }
                                onCheckedChange={(checked) =>
                                  updateSettings("wordpress", "settings", {
                                    ...settings.wordpress?.settings,
                                    author: {
                                      ...settings.wordpress?.settings?.author,
                                      useDefault: checked,
                                    },
                                  })
                                }
                              />
                            </div>

                            {settings.wordpress?.settings?.author
                              ?.useDefault && (
                              <div className="space-y-2">
                                <Label>Default Author ID</Label>
                                <Input
                                  type="number"
                                  placeholder="Enter WordPress author ID"
                                  value={
                                    settings.wordpress?.settings?.author
                                      ?.defaultAuthorId || ""
                                  }
                                  onChange={(e) =>
                                    updateSettings("wordpress", "settings", {
                                      ...settings.wordpress?.settings,
                                      author: {
                                        ...settings.wordpress?.settings?.author,
                                        defaultAuthorId: parseInt(
                                          e.target.value
                                        ),
                                      },
                                    })
                                  }
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Custom Fields</Label>
                          <div className="space-y-4">
                            {settings.wordpress?.settings?.customFields?.map(
                              (field, index) => (
                                <div
                                  key={index}
                                  className="flex items-end gap-2"
                                >
                                  <div className="flex-1 space-y-2">
                                    <Label>Field Key</Label>
                                    <Input
                                      placeholder="Custom field key"
                                      value={field.key}
                                      onChange={(e) => {
                                        const newFields = [
                                          ...(settings.wordpress?.settings
                                            ?.customFields || []),
                                        ];
                                        newFields[index] = {
                                          ...newFields[index],
                                          key: e.target.value,
                                        };
                                        updateSettings(
                                          "wordpress",
                                          "settings",
                                          {
                                            ...settings.wordpress?.settings,
                                            customFields: newFields,
                                          }
                                        );
                                      }}
                                    />
                                  </div>
                                  <div className="flex-1 space-y-2">
                                    <Label>Field Value</Label>
                                    <Input
                                      placeholder="Custom field value"
                                      value={field.value}
                                      onChange={(e) => {
                                        const newFields = [
                                          ...(settings.wordpress?.settings
                                            ?.customFields || []),
                                        ];
                                        newFields[index] = {
                                          ...newFields[index],
                                          value: e.target.value,
                                        };
                                        updateSettings(
                                          "wordpress",
                                          "settings",
                                          {
                                            ...settings.wordpress?.settings,
                                            customFields: newFields,
                                          }
                                        );
                                      }}
                                    />
                                  </div>
                                  <div className="w-[120px] space-y-2">
                                    <Label>Type</Label>
                                    <Select
                                      value={field.type}
                                      onValueChange={(
                                        value: "text" | "number" | "boolean"
                                      ) => {
                                        const newFields = [
                                          ...(settings.wordpress?.settings
                                            ?.customFields || []),
                                        ];
                                        newFields[index] = {
                                          ...newFields[index],
                                          type: value,
                                        };
                                        updateSettings(
                                          "wordpress",
                                          "settings",
                                          {
                                            ...settings.wordpress?.settings,
                                            customFields: newFields,
                                          }
                                        );
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="text">
                                          Text
                                        </SelectItem>
                                        <SelectItem value="number">
                                          Number
                                        </SelectItem>
                                        <SelectItem value="boolean">
                                          Boolean
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                      const newFields = [
                                        ...(settings.wordpress?.settings
                                          ?.customFields || []),
                                      ];
                                      newFields.splice(index, 1);
                                      updateSettings("wordpress", "settings", {
                                        ...settings.wordpress?.settings,
                                        customFields: newFields,
                                      });
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )
                            )}
                            <Button
                              variant="outline"
                              onClick={() => {
                                const newFields = [
                                  ...(settings.wordpress?.settings
                                    ?.customFields || []),
                                  {
                                    key: "",
                                    value: "",
                                    type: "text" as const,
                                  },
                                ];
                                updateSettings("wordpress", "settings", {
                                  ...settings.wordpress?.settings,
                                  customFields: newFields,
                                });
                              }}
                            >
                              Add Custom Field
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Auto-Publish</Label>
                            <p className="text-sm text-muted-foreground">
                              Automatically publish content when marked as
                              Published
                            </p>
                          </div>
                          <Switch
                            checked={
                              settings.wordpress?.settings?.autoPublish || false
                            }
                            onCheckedChange={(checked) =>
                              updateSettings("wordpress", "settings", {
                                ...settings.wordpress?.settings,
                                autoPublish: checked,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <Button
                          variant="secondary"
                          onClick={() => testConnection("wordpress")}
                        >
                          Test Connection
                        </Button>
                        <Button
                          onClick={() => saveSettings("wordpress")}
                          variant="secondary"
                        >
                          Save Settings
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {settings.wordpress?.enabled && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle>WordPress Content</CardTitle>
                      <CardDescription>
                        Manage your WordPress content uploads
                      </CardDescription>
                    </div>
                    {selectedItems.size > 0 && (
                      <Dialog
                        open={showPublishDialog}
                        onOpenChange={setShowPublishDialog}
                      >
                        <DialogTrigger asChild>
                          <Button
                            className="flex items-center gap-2"
                            variant="secondary"
                          >
                            <Upload className="h-4 w-4" />
                            Upload {selectedItems.size} Items
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Upload to WordPress</DialogTitle>
                            <DialogDescription>
                              Choose how you want to publish the selected
                              content
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                              <Label>Publication Status</Label>
                              <Select
                                value={publishStatus}
                                onValueChange={(value: "draft" | "publish") =>
                                  setPublishStatus(value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="draft">
                                    Save as Draft
                                  </SelectItem>
                                  <SelectItem value="publish">
                                    Publish Immediately
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setShowPublishDialog(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handlePublishToWordPress}
                              disabled={isPublishing}
                              variant="secondary"
                            >
                              {isPublishing ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Publishing...
                                </>
                              ) : (
                                "Publish"
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={
                                  selectedItems.size === content.length &&
                                  content.length > 0
                                }
                                onCheckedChange={toggleSelectAll}
                                aria-label="Select all"
                              />
                            </TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>WordPress Status</TableHead>
                            <TableHead>Last Synced</TableHead>
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {content.map((item) => (
                            <TableRow key={item._id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedItems.has(item._id)}
                                  onCheckedChange={() =>
                                    toggleItemSelection(item._id)
                                  }
                                  aria-label={`Select ${item.title}`}
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {item.title}
                              </TableCell>
                              <TableCell>{item.status}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {item.platformPublishStatus?.wordpress
                                    ?.published ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-yellow-500" />
                                  )}
                                  {item.platformPublishStatus?.wordpress
                                    ?.published
                                    ? "Published"
                                    : "Not Published"}
                                </div>
                              </TableCell>
                              <TableCell>
                                {item.platformPublishStatus?.wordpress
                                  ?.lastSynced
                                  ? new Date(
                                      item.platformPublishStatus.wordpress.lastSynced
                                    ).toLocaleString()
                                  : "Never"}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.platformPublishStatus?.wordpress
                                  ?.publishedUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      window.open(
                                        item.platformPublishStatus?.wordpress
                                          ?.publishedUrl,
                                        "_blank"
                                      )
                                    }
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="shopify">
            <Card>
              <CardHeader>
                <CardTitle>Shopify Integration</CardTitle>
                <CardDescription>
                  Configure your Shopify store connection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Shopify Integration</Label>
                    <p className="text-sm text-muted-foreground">
                      Publish content directly to your Shopify store
                    </p>
                  </div>
                  <Switch
                    checked={settings.shopify?.enabled || false}
                    onCheckedChange={(checked) =>
                      updateSettings("shopify", "enabled", checked)
                    }
                  />
                </div>

                {settings.shopify?.enabled && (
                  <>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Store Name</Label>
                        <Input
                          placeholder="your-store.myshopify.com"
                          value={settings.shopify?.credentials?.storeName || ""}
                          onChange={(e) =>
                            updateSettings("shopify", "credentials", {
                              ...settings.shopify?.credentials,
                              storeName: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Access Token</Label>
                        <Input
                          type="password"
                          placeholder="Shopify access token"
                          value={
                            settings.shopify?.credentials?.accessToken || ""
                          }
                          onChange={(e) =>
                            updateSettings("shopify", "credentials", {
                              ...settings.shopify?.credentials,
                              accessToken: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Default Post Status</Label>
                        <Select
                          value={
                            settings.shopify?.settings?.defaultStatus || "draft"
                          }
                          onValueChange={(value: "draft" | "publish") =>
                            updateSettings("shopify", "settings", {
                              ...settings.shopify?.settings,
                              defaultStatus: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select post status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="publish">Published</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Auto-Publish</Label>
                          <p className="text-sm text-muted-foreground">
                            Automatically publish content when marked as
                            Published
                          </p>
                        </div>
                        <Switch
                          checked={
                            settings.shopify?.settings?.autoPublish || false
                          }
                          onCheckedChange={(checked) =>
                            updateSettings("shopify", "settings", {
                              ...settings.shopify?.settings,
                              autoPublish: checked,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button
                        variant="secondary"
                        onClick={() => testConnection("shopify")}
                      >
                        Test Connection
                      </Button>
                      <Button
                        onClick={() => saveSettings("shopify")}
                        variant="secondary"
                      >
                        Save Settings
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
