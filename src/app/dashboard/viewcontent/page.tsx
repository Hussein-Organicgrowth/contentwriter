"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpDown, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Content = {
  id: number;
  title: string;
  createdAt: string;
  status: "Published" | "Draft";
  type: string;
};

// This would typically come from your API/database
const contentItems: Content[] = [
  {
    id: 1,
    title: "10 Tips for Better SEO",
    createdAt: "2024-01-15T10:00:00Z",
    status: "Published",
    type: "Blog Post",
  },
  {
    id: 2,
    title: "Why Choose Our Services",
    createdAt: "2024-01-14T15:30:00Z",
    status: "Draft",
    type: "Landing Page",
  },
  // Add more items as needed
];

export default function ViewContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [items, setItems] = useState<Content[]>(contentItems);

  // Filter content based on search query
  const filteredContent = items.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort content by date
  const sortedContent = [...filteredContent].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });

  const toggleSort = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  const updateStatus = (id: number, newStatus: "Published" | "Draft") => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, status: newStatus } : item
      )
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Content Library
            </h1>
            <p className="text-muted-foreground">
              Browse and manage your generated content
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Generate New Content
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Content</CardTitle>
            <CardDescription>
              A list of all your generated content across different types
            </CardDescription>
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search content..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead onClick={toggleSort} className="cursor-pointer">
                      <div className="flex items-center">
                        Date Created
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedContent.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.title}
                      </TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors hover:cursor-pointer hover:opacity-80 ${
                                item.status === "Published"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {item.status}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[200px] p-3">
                            <div className="space-y-2">
                              <h4 className="font-medium leading-none">
                                Status
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Change the content status
                              </p>
                              <Select
                                value={item.status}
                                onValueChange={(value: "Published" | "Draft") =>
                                  updateStatus(item.id, value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Published">
                                    Published
                                  </SelectItem>
                                  <SelectItem value="Draft">Draft</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="secondary" size="sm">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {sortedContent.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Search className="h-10 w-10 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg">
                  No content found
                </p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or generate new content
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
