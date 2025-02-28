import { FileText, Files, Package, Eye } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ContentSelector() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/10 p-4 md:p-8 lg:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center space-y-4">
          <div className="inline-block px-6 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-2">
            Content Management
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            Manage Your Content
          </h1>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            Create, manage, and view your content all in one place
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 max-w-5xl mx-auto">
          {/* Single Content Card */}
          <Card className="group relative overflow-hidden border-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/50 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors duration-300"></div>

            <CardHeader className="text-center relative z-10">
              <div className="mb-4 flex justify-center">
                <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors shadow-sm">
                  <FileText className="h-10 w-10 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                Single Content
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center relative z-10">
              <p className="text-muted-foreground">
                Create and edit individual pieces of content one at a time.
                Perfect for detailed, focused work.
              </p>
            </CardContent>
            <CardFooter className="flex justify-center pb-8 relative z-10">
              <Button
                asChild
                className="w-full md:w-auto transition-all group-hover:bg-primary group-hover:text-white shadow-sm hover:shadow-md"
                variant="secondary"
              >
                <Link href="/content/singlecontent">Create Single Content</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Bulk Content Card */}
          <Card className="group relative overflow-hidden border-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/50 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors duration-300"></div>

            <CardHeader className="text-center relative z-10">
              <div className="mb-4 flex justify-center">
                <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors shadow-sm">
                  <Files className="h-10 w-10 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                Bulk Content
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center relative z-10">
              <p className="text-muted-foreground">
                Create multiple pieces of content at once. Ideal for batch
                processing and mass content creation.
              </p>
            </CardContent>
            <CardFooter className="flex justify-center pb-8 relative z-10">
              <Button
                asChild
                className="w-full md:w-auto transition-all group-hover:bg-primary group-hover:text-white shadow-sm hover:shadow-md"
                variant="secondary"
              >
                <Link href="/content/bulkcontent">Create Bulk Content</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* View Content Card */}
          <Card className="group relative overflow-hidden border-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/50 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors duration-300"></div>

            <CardHeader className="text-center relative z-10">
              <div className="mb-4 flex justify-center">
                <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors shadow-sm">
                  <Eye className="h-10 w-10 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                View Content
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center relative z-10">
              <p className="text-muted-foreground">
                Browse, search, and review all your existing content. Easily
                access and manage your content library.
              </p>
            </CardContent>
            <CardFooter className="flex justify-center pb-8 relative z-10">
              <Button
                asChild
                className="w-full md:w-auto transition-all group-hover:bg-primary group-hover:text-white shadow-sm hover:shadow-md"
                variant="secondary"
              >
                <Link href="/content/view">View Content</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Products Card */}
          <Card className="group relative overflow-hidden border-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/50 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors duration-300"></div>

            <CardHeader className="text-center relative z-10">
              <div className="mb-4 flex justify-center">
                <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors shadow-sm">
                  <Package className="h-10 w-10 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                Products
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center relative z-10">
              <p className="text-muted-foreground">
                Manage and create product content. Perfect for e-commerce and
                product catalog management.
              </p>
            </CardContent>
            <CardFooter className="flex justify-center pb-8 relative z-10">
              <Button
                asChild
                className="w-full md:w-auto transition-all group-hover:bg-primary group-hover:text-white shadow-sm hover:shadow-md"
                variant="secondary"
              >
                <Link href="/dashboard/webshop/products">Manage Products</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            Need help managing your content?{" "}
            <Link href="/help" className="text-primary hover:underline">
              Check our documentation
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
