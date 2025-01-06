import { FileText, Files } from "lucide-react";
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
		<div className="min-h-screen bg-background p-4 md:p-8 lg:p-12">
			<div className="mx-auto max-w-5xl">
				<div className="mb-8 text-center">
					<h1 className="text-3xl font-bold tracking-tight md:text-4xl">
						Choose Your Content Type
					</h1>
					<p className="mt-2 text-muted-foreground">
						Select how you want to create your content
					</p>
				</div>
				<div className="grid gap-6 md:grid-cols-2">
					<Card className="relative overflow-hidden transition-all hover:shadow-lg">
						<CardHeader className="text-center">
							<div className="mb-4 flex justify-center">
								<FileText className="h-12 w-12 text-primary" />
							</div>
							<CardTitle className="text-2xl">Single Content</CardTitle>
						</CardHeader>
						<CardContent className="text-center">
							<p className="text-muted-foreground">
								Create and edit individual pieces of content one at a time.
								Perfect for detailed, focused work.
							</p>
						</CardContent>
						<CardFooter className="flex justify-center">
							<Button asChild className="w-full md:w-auto" variant="secondary">
								<Link href="/content/singlecontent">Create Single Content</Link>
							</Button>
						</CardFooter>
					</Card>
					<Card className="relative overflow-hidden transition-all hover:shadow-lg">
						<CardHeader className="text-center">
							<div className="mb-4 flex justify-center">
								<Files className="h-12 w-12 text-primary" />
							</div>
							<CardTitle className="text-2xl">Bulk Content</CardTitle>
						</CardHeader>
						<CardContent className="text-center">
							<p className="text-muted-foreground">
								Create multiple pieces of content at once. Ideal for batch
								processing and mass content creation.
							</p>
						</CardContent>
						<CardFooter className="flex justify-center">
							<Button asChild className="w-full md:w-auto" variant="secondary">
								<Link href="/content/bulkcontent">Create Bulk Content</Link>
							</Button>
						</CardFooter>
					</Card>
				</div>
			</div>
		</div>
	);
}
