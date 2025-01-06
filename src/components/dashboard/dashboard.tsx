"use client";

import { Globe, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { IWebsite } from "@/models/Website";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	CardFooter,
} from "@/components/ui/card";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AddCompanyDialog } from "@/components/AddCompanyDialog";

interface DashboardProps {
	websites: IWebsite[];
}

export default function Dashboard({
	websites: initialWebsites,
}: DashboardProps) {
	const [websites, setWebsites] = useState<IWebsite[]>(initialWebsites);
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		setWebsites(initialWebsites);
	}, [initialWebsites, pathname]);

	const handleCompanySelect = (website: IWebsite) => {
		localStorage.setItem("company", website.name);
		localStorage.setItem("companyId", website._id as string);
	};

	const handleDeleteWebsite = async (websiteId: string) => {
		try {
			const response = await fetch(`/api/website?id=${websiteId}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				throw new Error("Failed to delete website");
			}

			setWebsites(websites.filter((website) => website._id !== websiteId));
			toast.success("Website deleted successfully");
		} catch (error) {
			toast.error("Failed to delete website");
			console.error("Error deleting website:", error);
		}
	};

	// Force a refresh when navigating to dashboard
	useEffect(() => {
		if (pathname === "/dashboard") {
			router.refresh();
		}
	}, [pathname, router]);

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
				{websites.map((website) => (
					<div key={website._id}>
						<Card className="hover:bg-muted/50 transition-colors">
							<CardHeader className="flex flex-row items-center gap-4">
								<div className="relative h-12 w-12 flex items-center justify-center rounded-lg border bg-card">
									<Image
										src={`https://www.google.com/s2/favicons?domain=${website.website}&sz=64`}
										alt={`${website.name} favicon`}
										width={32}
										height={32}
										className="h-8 w-8"
										onError={(e) => {
											const target = e.target as HTMLElement;
											target.style.display = "none";
											target.parentElement
												?.querySelector(".fallback-icon")
												?.classList.remove("hidden");
										}}
									/>
									<Globe className="h-8 w-8 fallback-icon hidden absolute" />
								</div>
								<div className="space-y-1 flex-1">
									<CardTitle>{website.name}</CardTitle>
									<CardDescription>{website.website}</CardDescription>
								</div>
								<AlertDialog>
									<AlertDialogTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="text-destructive hover:text-destructive hover:bg-destructive/10">
											<Trash2 className="h-4 w-4" />
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>Are you sure?</AlertDialogTitle>
											<AlertDialogDescription>
												This action cannot be undone. This will permanently
												delete {website.name} and all its associated content.
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>Cancel</AlertDialogCancel>
											<AlertDialogAction
												onClick={() =>
													handleDeleteWebsite(website._id as string)
												}
												className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
												Delete
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</CardHeader>
							<CardContent>
								<div className="text-sm text-muted-foreground line-clamp-3 overflow-hidden">
									{website.description ||
										"View existing content or create new content for your company"}
								</div>
							</CardContent>
							<CardFooter className="flex gap-2">
								<Button
									variant="outline"
									className="w-full"
									onClick={() => {
										handleCompanySelect(website);
									}}
									asChild>
									<Link href="/dashboard/viewcontent">View Content</Link>
								</Button>
								<Button
									className="w-full"
									variant="secondary"
									onClick={() => {
										handleCompanySelect(website);
									}}
									asChild>
									<Link href="/content">Create Content</Link>
								</Button>
							</CardFooter>
						</Card>
					</div>
				))}

				{websites.length === 0 && (
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
