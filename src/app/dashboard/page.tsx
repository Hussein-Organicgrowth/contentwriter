"use client";

import React from "react";
import { useAuth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { IWebsite } from "@/models/Website";
import Link from "next/link";

async function getWebsites() {
	try {
		const response = await fetch("/api/website", {
			cache: "no-store",
		});
		if (!response.ok) throw new Error("Failed to fetch websites");
		const data = await response.json();
		return data.websites as IWebsite[];
	} catch (error) {
		console.error("Error fetching websites:", error);
		return [];
	}
}

export default function DashboardPage() {
	const { userId } = useAuth();
	if (!userId) redirect("/sign-in");

	const [websites, setWebsites] = React.useState<IWebsite[]>([]);

	React.useEffect(() => {
		getWebsites().then(setWebsites);
	}, []);

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="flex justify-between items-center mb-8">
				<h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
					Your Websites
				</h1>
				<Link
					href="/create"
					className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity">
					Create New Website
				</Link>
			</div>

			{websites.length === 0 ? (
				<div className="text-center py-12">
					<h2 className="text-2xl font-semibold text-gray-600 dark:text-gray-400 mb-4">
						No websites created yet
					</h2>
					<p className="text-gray-500 dark:text-gray-500 mb-6">
						Get started by creating your first website
					</p>
					<Link
						href="/create"
						className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:opacity-90 transition-opacity">
						Create Website
					</Link>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{websites.map((website) => (
						<div
							key={website._id}
							className="bg-white dark:bg-gray-800/50 rounded-xl p-6 shadow-lg backdrop-blur-lg border border-gray-200 dark:border-gray-700">
							<h2 className="text-xl font-semibold mb-2">{website.name}</h2>
							<p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
								{website.description || "No description provided"}
							</p>
							<div className="space-y-2">
								<div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
									<svg
										className="w-4 h-4 mr-2"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
										/>
									</svg>
									<a
										href={website.website}
										target="_blank"
										rel="noopener noreferrer"
										className="hover:text-blue-500 transition-colors">
										{website.website}
									</a>
								</div>
								<div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
									<svg
										className="w-4 h-4 mr-2"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
										/>
									</svg>
									{website.content.length} Content Pieces
								</div>
							</div>
							<div className="mt-4 flex justify-end">
								<Link
									href={`/dashboard/${website._id}`}
									className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm">
									View Details →
								</Link>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
