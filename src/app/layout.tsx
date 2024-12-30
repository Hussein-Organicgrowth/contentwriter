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
						<div className="flex min-h-screen items-center justify-center">
							<SignInButton />
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
