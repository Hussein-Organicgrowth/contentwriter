"use client";

import { Globe, Trash2, Users, Check, Edit } from "lucide-react";
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
import { ShareDialog } from "@/components/ShareDialog";
import { EditWebsiteDialog } from "@/components/EditWebsiteDialog";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";

interface DashboardProps {
	websites: IWebsite[];
	sharedWebsites: IWebsite[];
}

type TabType = "owned" | "shared";

export default function Dashboard({
	websites: initialOwnedWebsites,
	sharedWebsites: initialSharedWebsites,
}: DashboardProps) {
	const [ownedWebsites, setOwnedWebsites] =
		useState<IWebsite[]>(initialOwnedWebsites);
	const [sharedWebsites, setSharedWebsites] = useState<IWebsite[]>(
		initialSharedWebsites
	);
	const [selectedWebsiteId, setSelectedWebsiteId] = useState<string | null>(
		null
	);
	const [activeTab, setActiveTab] = useState<TabType>("owned");
	const router = useRouter();
	const pathname = usePathname();

	// Initialize selectedWebsiteId from localStorage once the component is mounted
	useEffect(() => {
		// Only access localStorage on the client side
		const savedCompanyId =
			typeof window !== "undefined" ? localStorage.getItem("companyId") : null;
		setSelectedWebsiteId(savedCompanyId);
	}, []);

	useEffect(() => {
		setOwnedWebsites(initialOwnedWebsites);
		setSharedWebsites(initialSharedWebsites);
	}, [initialOwnedWebsites, initialSharedWebsites, pathname]);

	// Set active tab based on which list has items
	useEffect(() => {
		if (ownedWebsites.length === 0 && sharedWebsites.length > 0) {
			setActiveTab("shared");
		}
	}, [ownedWebsites.length, sharedWebsites.length]);

	const handleCompanySelect = (website: IWebsite) => {
		const websiteId = website._id?.toString() || "";

		// Only access localStorage on the client side
		if (typeof window !== "undefined") {
			localStorage.setItem("company", website.name);
			localStorage.setItem("companyId", websiteId);
		}

		// Redirect the user to the content page
		router.push("/content");
		setSelectedWebsiteId(websiteId);

		// Show a toast notification to confirm selection
		toast.success(`${website.name} selected`);
	};

	const handleDeleteWebsite = async (websiteId: string) => {
		try {
			const response = await fetch(`/api/website?id=${websiteId}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				throw new Error("Failed to delete website");
			}

			setOwnedWebsites(
				ownedWebsites.filter((website) => website._id !== websiteId)
			);

			// If the deleted website was selected, clear the selection
			if (selectedWebsiteId === websiteId) {
				// Only access localStorage on the client side
				if (typeof window !== "undefined") {
					localStorage.removeItem("company");
					localStorage.removeItem("companyId");
				}
				setSelectedWebsiteId(null);
			}

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

	// Render a website card
	const renderWebsiteCard = (website: IWebsite, isOwned: boolean) => {
		const websiteId = website._id?.toString() || "";
		const isSelected = selectedWebsiteId === websiteId;

		return (
			<div key={websiteId}>
				<Card
					className={`transition-colors cursor-pointer relative ${
						isSelected
							? "ring-2 ring-primary border-primary bg-blue-50 shadow-md"
							: "hover:bg-muted/50"
					} ${!isOwned ? "border-dashed" : ""}`}
					onClick={(e) => {
						// Only select if not clicking on a button or link
						if (
							!(e.target as HTMLElement).closest(
								'button, a, [role="button"], [data-dialog-content]'
							)
						) {
							handleCompanySelect(website);
						}
					}}>
					{isSelected && (
						<div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-sm">
							<Check className="h-4 w-4" />
						</div>
					)}
					<CardHeader
						className={`flex flex-row items-center gap-4 ${
							isSelected ? "pb-3" : ""
						}`}>
						<div
							className={`relative h-12 w-12 flex items-center justify-center rounded-lg border ${
								isSelected ? "bg-white" : "bg-card"
							}`}>
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
							<CardTitle className={isSelected ? "text-blue-700" : ""}>
								{website.name}
							</CardTitle>
							<CardDescription>{website.website}</CardDescription>
						</div>
						{isOwned && (
							<div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
								{website.sharedUsers?.length > 0 ? (
									<HoverCard>
										<HoverCardTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												className={`${
													isSelected
														? "text-blue-600 hover:text-blue-700 hover:bg-blue-100"
														: "text-muted-foreground hover:text-primary"
												} relative`}>
												<Users className="h-4 w-4" />
												<span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 text-xs flex items-center justify-center">
													{website.sharedUsers.length}
												</span>
											</Button>
										</HoverCardTrigger>
										<HoverCardContent className="w-80">
											<div className="space-y-1">
												<h4 className="text-sm font-semibold">Shared with</h4>
												<div className="text-sm text-muted-foreground">
													{website.sharedUsers.map((email) => (
														<div
															key={email}
															className="flex items-center justify-between py-1">
															<span>{email}</span>
															<Button
																variant="ghost"
																size="sm"
																className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
																onClick={async () => {
																	try {
																		const response = await fetch(
																			`/api/website/share`,
																			{
																				method: "DELETE",
																				headers: {
																					"Content-Type": "application/json",
																				},
																				body: JSON.stringify({
																					websiteId: website._id,
																					email,
																				}),
																			}
																		);

																		if (!response.ok) {
																			throw new Error("Failed to remove user");
																		}

																		// Update the local state
																		const updatedWebsites = [...ownedWebsites];
																		const websiteIndex =
																			updatedWebsites.findIndex(
																				(w) => w._id === website._id
																			);

																		if (websiteIndex !== -1) {
																			// Create a new array of shared users without the removed email
																			const filteredSharedUsers =
																				updatedWebsites[
																					websiteIndex
																				].sharedUsers.filter(
																					(e) => e !== email
																				);

																			// Update the website with the new sharedUsers array
																			// This preserves the IWebsite type
																			updatedWebsites[
																				websiteIndex
																			].sharedUsers = filteredSharedUsers;
																			setOwnedWebsites(updatedWebsites);
																		}

																		toast.success("User removed successfully");
																	} catch (error) {
																		console.error(
																			"Error removing user:",
																			error
																		);
																		toast.error("Failed to remove user");
																	}
																}}>
																Remove
															</Button>
														</div>
													))}
												</div>
											</div>
										</HoverCardContent>
									</HoverCard>
								) : null}
								<ShareDialog
									website={website}
									onShare={() => router.refresh()}
								/>
								{isOwned && (
									<EditWebsiteDialog
										website={website}
										onUpdate={() => {
											router.refresh();
											// Update the local state
											const updatedWebsites = [...ownedWebsites];
											const websiteIndex = updatedWebsites.findIndex(
												(w) => w._id === website._id
											);
											if (websiteIndex !== -1) {
												// Refresh the page to get the updated data
												router.refresh();
											}
										}}
									/>
								)}
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
												onClick={() => handleDeleteWebsite(websiteId)}
												className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
												Delete
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</div>
						)}
					</CardHeader>
					<CardContent>
						<div
							className={`text-sm leading-relaxed rounded-lg p-3 min-h-[80px] flex items-center ${
								isSelected
									? "bg-white text-blue-700"
									: "bg-muted/30 text-muted-foreground/80"
							}`}>
							<p className="line-clamp-3">
								{website.description ||
									"View existing content or create new content for your company"}
							</p>
						</div>
					</CardContent>
					<CardFooter className={`flex gap-2 ${isSelected ? "pt-3" : ""}`}>
						<Button
							variant={isSelected ? "secondary" : "outline"}
							className="w-full"
							onClick={() => {
								handleCompanySelect(website);
							}}
							asChild>
							<Link href="/dashboard/viewcontent">View Content</Link>
						</Button>
						<Button
							className="w-full"
							variant={isSelected ? "outline" : "secondary"}
							onClick={() => {
								handleCompanySelect(website);
							}}
							asChild>
							<Link href="/content">Create Content</Link>
						</Button>
					</CardFooter>
				</Card>
			</div>
		);
	};

	return (
		<div className="container mx-auto p-6">
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Companies</h1>
					<p className="text-muted-foreground">
						Select a company to start creating content
					</p>
				</div>
				<AddCompanyDialog />
			</div>

			{(ownedWebsites.length > 0 || sharedWebsites.length > 0) && (
				<div className="mb-6">
					<div className="border-b flex">
						<button
							onClick={() => setActiveTab("owned")}
							className={`px-4 py-2 font-medium text-sm transition-colors relative ${
								activeTab === "owned"
									? "text-primary border-b-2 border-primary"
									: "text-muted-foreground hover:text-foreground"
							}`}>
							My Companies
							{ownedWebsites.length > 0 && (
								<span className="ml-2 bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
									{ownedWebsites.length}
								</span>
							)}
						</button>
						<button
							onClick={() => setActiveTab("shared")}
							className={`px-4 py-2 font-medium text-sm transition-colors relative ${
								activeTab === "shared"
									? "text-primary border-b-2 border-primary"
									: "text-muted-foreground hover:text-foreground"
							}`}>
							Shared with me
							{sharedWebsites.length > 0 && (
								<span className="ml-2 bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
									{sharedWebsites.length}
								</span>
							)}
						</button>
					</div>
				</div>
			)}

			{/* Tab Content */}
			{activeTab === "owned" && (
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{ownedWebsites.map((website) => renderWebsiteCard(website, true))}
				</div>
			)}

			{activeTab === "shared" && (
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{sharedWebsites.map((website) => renderWebsiteCard(website, false))}
				</div>
			)}

			{ownedWebsites.length === 0 && sharedWebsites.length === 0 && (
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
	);
}
