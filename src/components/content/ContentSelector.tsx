import {
  FileText,
  Files,
  Package,
  Eye,
  Puzzle,
  Brain,
  LibraryBig,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function ContentSelector() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/10 p-4 md:p-8 lg:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center space-y-4">
          <div className="inline-block px-6 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-2">
            Content Management
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl text-foreground">
            Manage Your Content
          </h1>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            Create, manage, and view your content all in one place
          </p>
        </div>

        {/* AI Insights Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-center mb-12 text-foreground">
            AI Insights
          </h2>
          <div className="grid gap-8 md:grid-cols-2 max-w-3xl mx-auto">
            {/* AI Training Status Card */}
            <Link href="/content/train-ai" className="block">
              <Card className="group relative overflow-hidden border-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/50 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors duration-300"></div>
                <CardHeader className="text-center relative z-10">
                  <div className="mb-4 flex justify-center">
                    <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors shadow-sm">
                      <Brain className="h-10 w-10 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                    AI Training Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center relative z-10 space-y-3">
                  <p className="text-muted-foreground">
                    Monitor how well your AI is trained with your unique tone of
                    voice and style.
                  </p>
                  <Progress value={0} className="w-full [&>div]:bg-primary" />
                  <p className="text-sm text-muted-foreground">
                    Current Training Level: 0%
                  </p>
                </CardContent>
              </Card>
            </Link>

            {/* Content Intelligence Card */}
            <Link href="/content/intelligence" className="block">
              <Card className="group relative overflow-hidden border-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/50 hover:-translate-y-1 h-full flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors duration-300"></div>
                <CardHeader className="text-center relative z-10">
                  <div className="mb-4 flex justify-center">
                    <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors shadow-sm">
                      <LibraryBig className="h-10 w-10 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                    Content Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center relative z-10 flex-grow">
                  <p className="text-muted-foreground">
                    Your AI has contextual understanding of all your existing
                    content, ensuring coherent and relevant new creations.
                  </p>
                </CardContent>
                <CardFooter className="text-center relative z-10 mt-auto pb-6">
                  <Button
                    variant="link"
                    className="text-primary group-hover:underline"
                  >
                    View Indexed Content
                  </Button>
                </CardFooter>
              </Card>
            </Link>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
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
                className="w-full md:w-auto transition-all hover:bg-slate-600 hover:text-white shadow-sm hover:shadow-md"
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
                className="w-full md:w-auto transition-all hover:bg-slate-600 hover:text-white shadow-sm hover:shadow-md"
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
                className="w-full md:w-auto transition-all hover:bg-slate-600 hover:text-white shadow-sm hover:shadow-md"
                variant="secondary"
              >
                <Link href="/dashboard/viewcontent">View Content</Link>
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
                Webshop
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
                className="w-full md:w-auto transition-all hover:bg-slate-600 hover:text-white shadow-sm hover:shadow-md"
                variant="secondary"
              >
                <Link href="/dashboard/webshop">Manage Webshop</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Extensions Card */}
          <Card className="group relative overflow-hidden border-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/50 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors duration-300"></div>

            <CardHeader className="text-center relative z-10">
              <div className="mb-4 flex justify-center">
                <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors shadow-sm">
                  <Puzzle className="h-10 w-10 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                Extensions
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center relative z-10">
              <p className="text-muted-foreground">
                Enhance your content with powerful extensions. Add AI
                capabilities, advanced formatting, and custom features to your
                content.
              </p>
            </CardContent>
            <CardFooter className="flex justify-center pb-8 relative z-10">
              <Button
                asChild
                className="w-full md:w-auto transition-all hover:bg-slate-600 hover:text-white shadow-sm hover:shadow-md"
                variant="secondary"
              >
                <Link href="/content/extensions">Manage Extensions</Link>
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
