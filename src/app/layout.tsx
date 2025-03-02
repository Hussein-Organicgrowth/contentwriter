import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import {
	ClerkProvider,
	SignedIn,
	SignedOut,
	SignInButton,
} from "@clerk/nextjs";
import { Sidebar } from "@/components/Sidebar";
import Image from "next/image";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "Content generator for organicgrowth ",
	description: "Helps our customers generate content for their websites",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ClerkProvider>
			<html lang="en">
				<body className={inter.className}>
					<SignedOut>
						<div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4">
							<div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-lg">
								<div className="mb-6 flex flex-col items-center">
									{/* You can replace with your actual logo */}
									<div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											className="h-8 w-8 text-emerald-600"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round">
											<path d="M12 2L2 7l10 5 10-5-10-5z" />
											<path d="M2 17l10 5 10-5" />
											<path d="M2 12l10 5 10-5" />
										</svg>
									</div>
									<h1 className="mb-1 text-2xl font-bold text-gray-900">
										Copybuddy
									</h1>
									<p className="text-center text-gray-600">
										Organic Growth Platform
									</p>
								</div>

								<div className="mb-6 space-y-4 text-center">
									<h2 className="text-lg font-medium text-gray-800">
										Welcome to your content solution
									</h2>
									<p className="text-sm text-gray-600">
										Generate SEO-optimized content for your websites, product
										descriptions, and collections with AI-powered tools.
									</p>
								</div>

								<div className="flex justify-center">
									<SignInButton mode="modal">
										<button className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
											Sign in to continue
											<svg
												xmlns="http://www.w3.org/2000/svg"
												className="ml-2 h-4 w-4"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round">
												<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
												<polyline points="10 17 15 12 10 7" />
												<line x1="15" y1="12" x2="3" y2="12" />
											</svg>
										</button>
									</SignInButton>
								</div>
							</div>
						</div>
					</SignedOut>
					<SignedIn>
						<div className="flex h-screen">
							<Sidebar />
							<main className="flex-1 overflow-y-auto">{children}</main>
						</div>
					</SignedIn>
					<Toaster position="top-center" />
				</body>
			</html>
		</ClerkProvider>
	);
}
