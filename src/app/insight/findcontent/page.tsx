"use client";

import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ExternalLink, Search } from "lucide-react";

interface SearchConsoleProperty {
  siteUrl: string;
  permissionLevel: string;
}

interface KeywordOpportunity {
  keyword: string;
  url: string;
  position: number;
  clicks: number;
  impressions: number;
  ctr: number;
}

export default function FindContent() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [properties, setProperties] = useState<SearchConsoleProperty[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [keywordOpportunities, setKeywordOpportunities] = useState<
    KeywordOpportunity[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [propertySearch, setPropertySearch] = useState("");

  const handleGoogleLogin = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch("/api/searchconsole/auth");
      const data = await response.json();
      window.location.href = data.authUrl;
    } catch (error) {
      console.error("Error connecting to Google Search Console:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await fetch("/api/searchconsole/properties");
      const data = await response.json();
      setProperties(data.properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
    }
  };

  const fetchKeywordOpportunities = async () => {
    if (!selectedProperty) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/searchconsole/keywords?property=${selectedProperty}`
      );
      const data = await response.json();
      setKeywordOpportunities(data.keywords);
    } catch (error) {
      console.error("Error fetching keyword opportunities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      fetchKeywordOpportunities();
    }
  }, [selectedProperty]);

  // Filter properties based on search input
  const filteredProperties = properties.filter((property) =>
    property.siteUrl.toLowerCase().includes(propertySearch.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Find Content Opportunities</h1>

      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Connect Google Search Console
        </h2>
        <div className="space-y-4">
          {properties.length === 0 ? (
            <Button
              onClick={handleGoogleLogin}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect with Google Search Console"
              )}
            </Button>
          ) : (
            <div className="space-y-4">
              <Select
                value={selectedProperty}
                onValueChange={setSelectedProperty}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  <div className="sticky top-0 bg-white dark:bg-gray-950 p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                      <Input
                        type="text"
                        placeholder="Search properties..."
                        value={propertySearch}
                        onChange={(e) => setPropertySearch(e.target.value)}
                        className="pl-10"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {filteredProperties.map((property) => (
                      <SelectItem
                        key={property.siteUrl}
                        value={property.siteUrl}
                      >
                        {property.siteUrl}
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </Card>

      {selectedProperty && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Keyword Opportunities (Positions 7 and above)
          </h2>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead className="text-center">Position</TableHead>
                    <TableHead className="text-center">Clicks</TableHead>
                    <TableHead className="text-center">Impressions</TableHead>
                    <TableHead className="text-center">CTR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keywordOpportunities.map((keyword, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {keyword.keyword}
                      </TableCell>
                      <TableCell>
                        <a
                          href={keyword.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-600 hover:text-blue-800"
                        >
                          {keyword.url}
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </TableCell>
                      <TableCell className="text-center">
                        {keyword.position.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-center">
                        {keyword.clicks}
                      </TableCell>
                      <TableCell className="text-center">
                        {keyword.impressions}
                      </TableCell>
                      <TableCell className="text-center">
                        {(keyword.ctr * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
