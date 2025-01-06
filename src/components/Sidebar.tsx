"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import {
	HomeIcon,
	ViewColumnsIcon,
	DocumentPlusIcon,
	DocumentDuplicateIcon,
	ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function Sidebar() {
	const [companyName, setCompanyName] = useState<string | null>(null);
	const [companyId, setCompanyId] = useState<string | null>(null);
	const pathname = usePathname();
	const router = useRouter();

	useEffect(() => {
		const storedCompany = localStorage.getItem("company");
		const storedCompanyId = localStorage.getItem("companyId");

		if (storedCompany && storedCompanyId) {
			setCompanyName(storedCompany);
			setCompanyId(storedCompanyId);
		}
	}, [pathname]);

	const handleDashboardClick = (e: React.MouseEvent) => {
		e.preventDefault();
		router.push("/dashboard");
		router.refresh();
	};

	return (
		<div className="flex h-screen w-64 flex-col bg-white border-r border-gray-200">
			<div className="flex h-16 shrink-0 items-center justify-between px-6 border-b">
				<span className="text-lg font-semibold">Content Generator</span>
			</div>

			<div className="flex flex-col justify-between flex-1 p-6">
				<nav className="space-y-6">
					<div>
						<h2 className="text-sm font-semibold text-gray-500">Navigation</h2>
						<div className="mt-3">
							<button
								onClick={handleDashboardClick}
								className="flex items-center space-x-3 p-2 rounded-lg text-gray-700 hover:bg-gray-50 w-full text-left">
								<HomeIcon className="w-5 h-5" />
								<span>Dashboard</span>
							</button>
						</div>
					</div>

					{companyName && companyId ? (
						<>
							<div>
								<h2 className="text-sm font-semibold text-gray-500">
									Current Company
								</h2>
								<div className="mt-2 p-3 bg-blue-50 rounded-lg">
									<p className="text-blue-700 font-medium">{companyName}</p>
								</div>
							</div>

							<div>
								<h2 className="text-sm font-semibold text-gray-500">
									Content Actions
								</h2>
								<div className="mt-3 space-y-3">
									<Link
										href="/dashboard/viewcontent"
										className="flex items-center space-x-3 p-2 rounded-lg text-gray-700 hover:bg-gray-50">
										<ViewColumnsIcon className="w-5 h-5" />
										<span>View All Content</span>
									</Link>
									<Link
										href="/content/singlecontent"
										className="flex items-center space-x-3 p-2 rounded-lg text-gray-700 hover:bg-gray-50">
										<DocumentPlusIcon className="w-5 h-5" />
										<span>Generate Single Content</span>
									</Link>
									<Link
										href="/content/bulkcontent"
										className="flex items-center space-x-3 p-2 rounded-lg text-gray-700 hover:bg-gray-50">
										<DocumentDuplicateIcon className="w-5 h-5" />
										<span>Generate Bulk Content</span>
									</Link>
									<Link
										href="/content/rewrite"
										className="flex items-center space-x-3 p-2 rounded-lg text-gray-700 hover:bg-gray-50">
										<ArrowPathIcon className="w-5 h-5" />
										<span>Rewrite Content</span>
									</Link>
								</div>
							</div>
						</>
					) : (
						<div className="p-4 bg-blue-50 rounded-lg">
							<p className="text-sm text-blue-700">
								Please select a company from the dashboard to access content
								generation features.
							</p>
						</div>
					)}
				</nav>

				<div className="flex items-center space-x-4">
					<UserButton afterSignOutUrl="/" />
					<div className="text-sm text-gray-700">
						<p className="font-medium">Account</p>
					</div>
				</div>
			</div>
		</div>
	);
}
