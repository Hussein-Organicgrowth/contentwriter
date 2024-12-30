import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import {
	ClerkProvider,
	SignedIn,
	SignedOut,
	SignInButton,
	UserButton,
} from "@clerk/nextjs";

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
						<SignInButton />
					</SignedOut>
					<SignedIn>
						<UserButton />
					</SignedIn>
					<Toaster position="top-center" />
					{children}
				</body>
			</html>
		</ClerkProvider>
	);
}
