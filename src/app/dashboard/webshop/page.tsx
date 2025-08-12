"use client";

import { Boxes, Package } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function WebshopPage() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8 lg:p-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Manage Your Shop by Organicgrowth
          </h1>
          <p className="mt-2 text-muted-foreground">
            Select what you want to manage in your shop
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="relative overflow-hidden transition-all hover:shadow-lg">
            <CardHeader className="text-center">
              <div className="mb-4 flex justify-center">
                <Package className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl">Products</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                Manage your product catalog. Add, edit, and organize your
                products.
              </p>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button asChild className="w-full md:w-auto" variant="secondary">
                <Link href="/dashboard/webshop/products">Manage Products</Link>
              </Button>
            </CardFooter>
          </Card>
          <Card className="relative overflow-hidden transition-all hover:shadow-lg">
            <CardHeader className="text-center">
              <div className="mb-4 flex justify-center">
                <Boxes className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl">Collections</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                Organize your products into collections. Create and manage
                product categories.
              </p>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button asChild className="w-full md:w-auto" variant="secondary">
                <Link href="/dashboard/webshop/collections">
                  Manage Collections
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
