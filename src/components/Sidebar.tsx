"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import {
	HomeIcon,
	ViewColumnsIcon,
	DocumentPlusIcon,
	DocumentDuplicateIcon,
	ArrowPathIcon,
	Cog6ToothIcon,
	ArrowsUpDownIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function Sidebar() {
	const [companyName, setCompanyName] = useState<string | null>(null);
	const [companyId, setCompanyId] = useState<string | null>(null);
	const pathname = usePathname();
	const router = useRouter();
	const { user } = useUser();

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
				<span className="text-lg font-semibold">TekstFlow </span>
			</div>

			<div className="flex flex-col justify-between flex-1 p-6">
				<nav className="space-y-6">
					<div>
						<h2 className="text-sm font-semibold text-gray-500">Navigation</h2>
						<div className="mt-3">
							<button
								onClick={handleDashboardClick}
								className={`flex items-center space-x-3 p-2 rounded-lg w-full text-left transition-colors ${
									pathname === "/dashboard"
										? "bg-blue-50 text-blue-700"
										: "text-gray-700 hover:bg-gray-50"
								}`}>
								<HomeIcon className="w-5 h-5" />
								<span>Dashboard</span>
							</button>
						</div>
					</div>

					{companyName && companyId ? (
						<>
							<div>
								<h2 className="text-sm font-semibold text-gray-500">
									Aktuel Virksomhed
								</h2>
								<div className="mt-2 p-3 bg-blue-50 rounded-lg">
									<p className="text-blue-700 font-medium">{companyName}</p>
								</div>
							</div>

							<div>
								<h2 className="text-sm font-semibold text-gray-500">
									Indhold Handlinger
								</h2>
								<div className="mt-3 space-y-3">
									<Link
										href="/dashboard/viewcontent"
										className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
											pathname === "/dashboard/viewcontent"
												? "bg-blue-50 text-blue-700"
												: "text-gray-700 hover:bg-gray-50"
										}`}>
										<ViewColumnsIcon className="w-5 h-5" />
										<span>Se Alt Indhold</span>
									</Link>
									<Link
										href="/content/singlecontent"
										className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
											pathname === "/content/singlecontent"
												? "bg-blue-50 text-blue-700"
												: "text-gray-700 hover:bg-gray-50"
										}`}>
										<DocumentPlusIcon className="w-5 h-5" />
										<span>Generer Enkelt Indhold</span>
									</Link>
									<Link
										href="/content/bulkcontent"
										className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
											pathname === "/content/bulkcontent"
												? "bg-blue-50 text-blue-700"
												: "text-gray-700 hover:bg-gray-50"
										}`}>
										<DocumentDuplicateIcon className="w-5 h-5" />
										<span>Generer Masse Indhold</span>
									</Link>
									<Link
										href="/content/rewrite"
										className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
											pathname === "/content/rewrite"
												? "bg-blue-50 text-blue-700"
												: "text-gray-700 hover:bg-gray-50"
										}`}>
										<ArrowPathIcon className="w-5 h-5" />
										<span>Omskriv Indhold</span>
									</Link>
								</div>
							</div>

							<div>
								<h2 className="text-sm font-semibold text-gray-500">System</h2>
								<div className="mt-3 space-y-3">
									<Link
										href="/dashboard/settings"
										className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
											pathname === "/dashboard/settings"
												? "bg-blue-50 text-blue-700"
												: "text-gray-700 hover:bg-gray-50"
										}`}>
										<Cog6ToothIcon className="w-5 h-5" />
										<span>Settings</span>
									</Link>
									<Link
										href="/dashboard/settings/workflow"
										className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
											pathname === "/dashboard/settings/workflow"
												? "bg-blue-50 text-blue-700"
												: "text-gray-700 hover:bg-gray-50"
										}`}>
										<ArrowsUpDownIcon className="w-5 h-5" />
										<span>Workflow</span>
									</Link>
								</div>
							</div>
						</>
					) : (
						<div className="p-4 bg-blue-50 rounded-lg">
							<p className="text-sm text-blue-700">
								Vælg venligst en virksomhed fra dashboardet for at få adgang til
								indholdsgenereringsfunktioner.
							</p>
						</div>
					)}
				</nav>

				<div>
					<div className="flex flex-col items-center justify-center mb-6 pb-6 border-b border-gray-200">
						<Link
							href="https://organicgrowth.dk"
							target="_blank"
							className="flex flex-col items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
							<span className="text-sm text-gray-500">Udviklet af</span>
							<Image
								src="https://organicgrowth.dk/wp-content/uploads/logo.svg"
								alt="Organic Growth Logo"
								width={100}
								height={30}
								className="w-auto h-8"
							/>
						</Link>
					</div>

					<div className="flex items-center gap-4 p-2 rounded-lg hover:bg-gray-50">
						<UserButton afterSignOutUrl="/" />
						<div className="flex flex-col min-w-0">
							<p className="text-sm font-medium text-gray-700 truncate">
								{user?.fullName || "Velkommen"}
							</p>
							<p className="text-xs text-gray-500 truncate">
								{user?.primaryEmailAddress?.emailAddress}
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
