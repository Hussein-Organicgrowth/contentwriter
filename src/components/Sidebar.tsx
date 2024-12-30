"use client";

import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { HomeIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

const steps = [
	{ id: 1, name: "Company Details", path: "/" },
	{ id: 2, name: "Website Analysis", path: "/analyze" },
	{ id: 3, name: "Content Generation", path: "/content" },
	{ id: 4, name: "Review & Export", path: "/review" },
];

export function Sidebar() {
	const pathname = usePathname();
	const currentStep = steps.findIndex((step) => step.path === pathname) + 1;

	return (
		<div className="flex h-screen w-64 flex-col bg-white border-r border-gray-200">
			<div className="flex h-16 shrink-0 items-center justify-between px-6 border-b">
				<span className="text-lg font-semibold">Content Generator</span>
			</div>

			<div className="flex flex-col justify-between flex-1 p-6">
				<nav className="space-y-6">
					<div>
						<h2 className="text-sm font-semibold text-gray-500">Progress</h2>
						<div className="mt-3 space-y-3">
							{steps.map((step) => {
								const isActive = step.path === pathname;
								const isCompleted = step.id < currentStep;

								return (
									<Link
										key={step.id}
										href={step.path}
										className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
											isActive
												? "bg-blue-50 text-blue-600"
												: "text-gray-700 hover:bg-gray-50"
										}`}>
										<div
											className={`flex-shrink-0 ${
												isActive ? "text-blue-600" : "text-gray-400"
											}`}>
											{isCompleted ? (
												<CheckCircleIcon className="w-5 h-5 text-green-500" />
											) : (
												<span className="flex items-center justify-center w-5 h-5 rounded-full border border-current">
													{step.id}
												</span>
											)}
										</div>
										<span>{step.name}</span>
									</Link>
								);
							})}
						</div>
					</div>

					<div>
						<h2 className="text-sm font-semibold text-gray-500">Navigation</h2>
						<div className="mt-3 space-y-3">
							<Link
								href="/dashboard"
								className="flex items-center space-x-3 p-2 rounded-lg text-gray-700 hover:bg-gray-50">
								<HomeIcon className="w-5 h-5" />
								<span>Dashboard</span>
							</Link>
						</div>
					</div>
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
