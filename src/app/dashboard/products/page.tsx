"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "react-hot-toast";
import DOMPurify from "isomorphic-dompurify";

interface ShopifyProduct {
	id: string;
	title: string;
	body_html: string;
	vendor: string;
	status: string;
	images: { src: string }[];
}

type StatusType = "all" | "active" | "archived" | "draft";
type LanguageType =
	| "en-US"
	| "en-GB"
	| "es"
	| "fr"
	| "de"
	| "it"
	| "pt"
	| "nl"
	| "pl"
	| "sv"
	| "da"
	| "no"
	| "fi";
type CountryType =
	| "US"
	| "GB"
	| "CA"
	| "AU"
	| "DE"
	| "FR"
	| "ES"
	| "IT"
	| "NL"
	| "SE"
	| "NO"
	| "DK"
	| "FI"
	| "PL"
	| "BR"
	| "MX";

export default function ProductsPage() {
	const [isConnected, setIsConnected] = useState(false);
	const [products, setProducts] = useState<ShopifyProduct[]>([]);
	const [filteredProducts, setFilteredProducts] = useState<ShopifyProduct[]>(
		[]
	);
	const [storeName, setStoreName] = useState("");
	const [accessToken, setAccessToken] = useState("");
	const [company, setCompany] = useState<string>("");
	const [selectedStatus, setSelectedStatus] = useState<StatusType>("all");
	const [isGenerating, setIsGenerating] = useState<{ [key: string]: boolean }>(
		{}
	);
	const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
		new Set()
	);
	const [isBulkGenerating, setIsBulkGenerating] = useState(false);
	const [selectedLanguage, setSelectedLanguage] = useState<LanguageType>("da");
	const [selectedCountry, setSelectedCountry] = useState<CountryType>("DK");

	useEffect(() => {
		// Get company from localStorage
		const storedCompany = localStorage.getItem("company");
		if (storedCompany) {
			setCompany(storedCompany);
			checkShopifyConnection(storedCompany);
		}
	}, []);

	useEffect(() => {
		filterProducts();
	}, [selectedStatus, products]);

	const filterProducts = () => {
		if (selectedStatus === "all") {
			setFilteredProducts(products);
		} else {
			setFilteredProducts(
				products.filter(
					(product) => product.status.toLowerCase() === selectedStatus
				)
			);
		}
	};

	const toggleProductSelection = (productId: string) => {
		const newSelected = new Set(selectedProducts);
		if (newSelected.has(productId)) {
			newSelected.delete(productId);
		} else {
			newSelected.add(productId);
		}
		setSelectedProducts(newSelected);
	};

	const toggleAllProducts = () => {
		if (selectedProducts.size === filteredProducts.length) {
			setSelectedProducts(new Set());
		} else {
			setSelectedProducts(new Set(filteredProducts.map((p) => p.id)));
		}
	};

	const checkShopifyConnection = async (companyName: string) => {
		try {
			const response = await fetch(
				`/api/platform/shopify/test?company=${companyName}`
			);
			const data = await response.json();
			setIsConnected(data.connected);
			if (data.connected) {
				fetchProducts(companyName);
			}
		} catch (error) {
			console.error("Error checking Shopify connection:", error);
		}
	};

	const handleConnect = async () => {
		if (!company) {
			toast.error("Company information not found");
			return;
		}

		try {
			const response = await fetch("/api/platform/shopify/settings", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					credentials: {
						storeName,
						accessToken,
					},
					enabled: true,
					company,
				}),
			});

			if (response.ok) {
				toast.success("Successfully connected to Shopify");
				setIsConnected(true);
				fetchProducts(company);
			} else {
				throw new Error("Failed to connect");
			}
		} catch (error) {
			toast.error("Failed to connect to Shopify");
		}
	};

	const fetchProducts = async (companyName: string) => {
		try {
			const response = await fetch(
				`/api/platform/shopify/products?company=${companyName}`
			);
			const data = await response.json();
			setProducts(data.products);
			setFilteredProducts(data.products);
		} catch (error) {
			console.error("Error fetching products:", error);
			toast.error("Failed to fetch products");
		}
	};

	const generateAndUpdateDescription = async (product: ShopifyProduct) => {
		try {
			setIsGenerating({ ...isGenerating, [product.id]: true });

			const generateResponse = await fetch("/api/generate/description", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					title: product.title,
					company,
					existingDescription: product.body_html || "",
					language: selectedLanguage,
					targetCountry: selectedCountry,
				}),
			});

			if (!generateResponse.ok) {
				throw new Error("Failed to generate description");
			}

			const { description } = await generateResponse.json();

			const updateResponse = await fetch("/api/platform/shopify/update", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					productId: product.id,
					description,
					company,
				}),
			});

			if (!updateResponse.ok) {
				throw new Error("Failed to update product");
			}

			const { product: updatedProduct } = await updateResponse.json();

			const updatedProducts = products.map((p) =>
				p.id === product.id ? updatedProduct : p
			);
			setProducts(updatedProducts);
			filterProducts();

			toast.success("Product description updated successfully");
			return true;
		} catch (error) {
			console.error("Error updating product description:", error);
			toast.error("Failed to update product description");
			return false;
		} finally {
			setIsGenerating({ ...isGenerating, [product.id]: false });
		}
	};

	const handleBulkGenerate = async () => {
		if (selectedProducts.size === 0) {
			toast.error("Please select products to generate descriptions");
			return;
		}

		setIsBulkGenerating(true);
		let successCount = 0;
		let failCount = 0;

		try {
			const selectedProductsList = filteredProducts.filter((p) =>
				selectedProducts.has(p.id)
			);

			for (const product of selectedProductsList) {
				const success = await generateAndUpdateDescription(product);
				if (success) {
					successCount++;
				} else {
					failCount++;
				}

				toast.success(
					`Progress: ${successCount + failCount}/${selectedProducts.size}`
				);
			}

			toast.success(
				`Completed! Success: ${successCount}, Failed: ${failCount}`
			);
		} catch (error) {
			console.error("Error in bulk generation:", error);
			toast.error("Failed to complete bulk generation");
		} finally {
			setIsBulkGenerating(false);
			setSelectedProducts(new Set());
		}
	};

	const renderHTML = (html: string) => {
		const sanitizedHTML = DOMPurify.sanitize(html);
		return <div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />;
	};

	const LanguageSelector = () => (
		<div className="flex items-center gap-2">
			<Label>Language:</Label>
			<Select
				value={selectedLanguage}
				onValueChange={(value: LanguageType) => setSelectedLanguage(value)}>
				<SelectTrigger className="w-[180px]">
					<SelectValue placeholder="Select language" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="en-US">English (US)</SelectItem>
					<SelectItem value="en-GB">English (UK)</SelectItem>
					<SelectItem value="es">Spanish</SelectItem>
					<SelectItem value="fr">French</SelectItem>
					<SelectItem value="de">German</SelectItem>
					<SelectItem value="it">Italian</SelectItem>
					<SelectItem value="pt">Portuguese</SelectItem>
					<SelectItem value="nl">Dutch</SelectItem>
					<SelectItem value="pl">Polish</SelectItem>
					<SelectItem value="sv">Swedish</SelectItem>
					<SelectItem value="da">Danish</SelectItem>
					<SelectItem value="no">Norwegian</SelectItem>
					<SelectItem value="fi">Finnish</SelectItem>
				</SelectContent>
			</Select>
		</div>
	);

	const CountrySelector = () => (
		<div className="flex items-center gap-2">
			<Label>Market:</Label>
			<Select
				value={selectedCountry}
				onValueChange={(value: CountryType) => setSelectedCountry(value)}>
				<SelectTrigger className="w-[180px]">
					<SelectValue placeholder="Select market" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="US">United States</SelectItem>
					<SelectItem value="GB">United Kingdom</SelectItem>
					<SelectItem value="CA">Canada</SelectItem>
					<SelectItem value="AU">Australia</SelectItem>
					<SelectItem value="DE">Germany</SelectItem>
					<SelectItem value="FR">France</SelectItem>
					<SelectItem value="ES">Spain</SelectItem>
					<SelectItem value="IT">Italy</SelectItem>
					<SelectItem value="NL">Netherlands</SelectItem>
					<SelectItem value="SE">Sweden</SelectItem>
					<SelectItem value="NO">Norway</SelectItem>
					<SelectItem value="DK">Denmark</SelectItem>
					<SelectItem value="FI">Finland</SelectItem>
					<SelectItem value="PL">Poland</SelectItem>
					<SelectItem value="BR">Brazil</SelectItem>
					<SelectItem value="MX">Mexico</SelectItem>
				</SelectContent>
			</Select>
		</div>
	);

	if (!company) {
		return (
			<div className="container mx-auto py-10">
				<h1 className="text-3xl font-bold mb-8">Error</h1>
				<p>Company information not found. Please try logging in again.</p>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-10">
			<h1 className="text-3xl font-bold mb-8">Shopify Products</h1>

			{!isConnected ? (
				<Card>
					<CardHeader>
						<CardTitle>Connect to Shopify</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="storeName">Store Name</Label>
							<Input
								id="storeName"
								placeholder="your-store-name.myshopify.com"
								value={storeName}
								onChange={(e) => setStoreName(e.target.value)}
							/>
							<p className="text-sm text-gray-500">
								Enter your full Shopify store URL (e.g.,
								your-store.myshopify.com)
							</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="accessToken">Access Token</Label>
							<Input
								id="accessToken"
								type="password"
								placeholder="shpat_xxxxx"
								value={accessToken}
								onChange={(e) => setAccessToken(e.target.value)}
							/>
							<p className="text-sm text-gray-500">
								You can find this in your Shopify admin under Apps → Develop
								apps → Your App → API credentials
							</p>
						</div>
						<Button onClick={handleConnect} variant="secondary">
							Connect to Shopify
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-6">
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center gap-4">
							<Button
								onClick={() => fetchProducts(company)}
								variant="secondary">
								Refresh Products
							</Button>
							<div className="flex items-center gap-2">
								<Label htmlFor="status-filter">Status:</Label>
								<Select
									value={selectedStatus}
									onValueChange={(value: StatusType) =>
										setSelectedStatus(value)
									}>
									<SelectTrigger className="w-[180px]">
										<SelectValue placeholder="Select status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Products</SelectItem>
										<SelectItem value="active">Active</SelectItem>
										<SelectItem value="draft">Draft</SelectItem>
										<SelectItem value="archived">Archived</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<LanguageSelector />
							<CountrySelector />
						</div>
						<div className="flex items-center gap-4">
							<div className="text-sm text-gray-500">
								Selected: {selectedProducts.size} of {filteredProducts.length}{" "}
								products
							</div>
							<Button
								variant="secondary"
								onClick={handleBulkGenerate}
								disabled={selectedProducts.size === 0 || isBulkGenerating}>
								{isBulkGenerating ? "Generating..." : "Generate Selected"}
							</Button>
						</div>
					</div>

					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-[50px]">
										<Checkbox
											checked={
												selectedProducts.size === filteredProducts.length
											}
											onCheckedChange={toggleAllProducts}
										/>
									</TableHead>
									<TableHead className="w-[100px]">Image</TableHead>
									<TableHead>Product Name</TableHead>
									<TableHead className="max-w-[400px]">
										Current Description
									</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredProducts.map((product) => (
									<TableRow key={product.id}>
										<TableCell>
											<Checkbox
												checked={selectedProducts.has(product.id)}
												onCheckedChange={() =>
													toggleProductSelection(product.id)
												}
											/>
										</TableCell>
										<TableCell>
											{product.images[0] && (
												<img
													src={product.images[0].src}
													alt={product.title}
													className="w-[80px] h-[80px] object-cover rounded-md"
												/>
											)}
										</TableCell>
										<TableCell className="font-medium">
											{product.title}
										</TableCell>
										<TableCell className="max-w-[400px]">
											<div className="max-h-[200px] overflow-y-auto prose prose-sm">
												{product.body_html ? (
													renderHTML(product.body_html)
												) : (
													<span className="text-gray-500 italic">
														No description available
													</span>
												)}
											</div>
										</TableCell>
										<TableCell>
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
													product.status === "active"
														? "bg-green-100 text-green-800"
														: product.status === "draft"
														? "bg-yellow-100 text-yellow-800"
														: "bg-gray-100 text-gray-800"
												}`}>
												{product.status}
											</span>
										</TableCell>
										<TableCell className="text-right">
											<Button
												variant="secondary"
												size="sm"
												onClick={() => generateAndUpdateDescription(product)}
												disabled={isGenerating[product.id]}>
												{isGenerating[product.id]
													? "Generating..."
													: "Generate Description"}
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</div>
			)}
		</div>
	);
}
