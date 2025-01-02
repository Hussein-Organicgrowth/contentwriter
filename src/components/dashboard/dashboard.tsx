"use client";

import { Globe } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { AddCompanyDialog } from "@/components/AddCompanyDialog";

// This would typically come from your database
const companies = [
  {
    id: 1,
    name: "Acme Inc",
    domain: "acme.com",
  },
  {
    id: 2,
    name: "Norva24",
    domain: "norva24.dk",
  },
  {
    id: 3,
    name: "Tanddk",
    domain: "tanddk.dk",
  },
  // Add more companies as needed
];

export default function Dashboard() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Virksomheder</h1>
          <p className="text-muted-foreground">
            Vælg en virksomhed for at starte med at skabe indhold
          </p>
        </div>
        <AddCompanyDialog />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => (
          <div key={company.id}>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="relative h-12 w-12 flex items-center justify-center rounded-lg border bg-card">
                  {/* Using Google's favicon service */}
                  <Image
                    src={`https://www.google.com/s2/favicons?domain=${company.domain}&sz=64`}
                    alt={`${company.name} favicon`}
                    width={32}
                    height={32}
                    className="h-8 w-8"
                    onError={(e) => {
                      // Fallback to Globe icon if favicon fails to load
                      const target = e.target as HTMLElement;
                      target.style.display = "none";
                      target.parentElement
                        ?.querySelector(".fallback-icon")
                        ?.classList.remove("hidden");
                    }}
                  />
                  <Globe className="h-8 w-8 fallback-icon hidden absolute" />
                </div>
                <div className="space-y-1">
                  <CardTitle>{company.name}</CardTitle>
                  <CardDescription>{company.domain}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  View existing content or create new content for your company
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/companies/${company.id}/view`}>
                    View Content
                  </Link>
                </Button>
                <Button className="w-full" asChild variant="secondary">
                  <Link href={`/companies/${company.id}/create`}>
                    Create Content
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        ))}

        {/* Empty state card */}
        {companies.length === 0 && (
          <Card className="flex flex-col items-center justify-center p-8 h-[300px]">
            <Globe className="h-12 w-12 mb-4 text-muted-foreground" />
            <CardTitle className="mb-2">No companies yet</CardTitle>
            <CardDescription className="text-center mb-4">
              Add your first company to start creating content
            </CardDescription>
            <AddCompanyDialog />
          </Card>
        )}
      </div>
    </div>
  );
}
