"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import {
<<<<<<< HEAD
	HomeIcon,
	DocumentIcon,
	DocumentDuplicateIcon,
=======
  HomeIcon,
  ViewColumnsIcon,
  DocumentPlusIcon,
  DocumentDuplicateIcon,
>>>>>>> 7363db49769275f397a2419658ca7012cb39298f
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";

export function Sidebar() {
<<<<<<< HEAD
	const pathname = usePathname();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Prevent hydration mismatch by not rendering until mounted
	if (!mounted) {
		return (
			<div className="flex h-screen w-64 flex-col bg-white border-r border-gray-200">
				<div className="flex h-16 shrink-0 items-center justify-between px-6 border-b">
					<span className="text-lg font-semibold">Content Generator</span>
				</div>
				<div className="flex-1" />
			</div>
		);
	}
=======
  const [companyName, setCompanyName] = useState<string | null>(null);
>>>>>>> 7363db49769275f397a2419658ca7012cb39298f

  useEffect(() => {
    const company = localStorage.getItem("company");
    if (company) {
      try {
        setCompanyName(company);
      } catch (error) {
        console.error("Error parsing company data:", error);
      }
    }
  }, []);

<<<<<<< HEAD
			<div className="flex flex-col justify-between flex-1 p-6">
				<nav className="space-y-6">
					<div>
						<h2 className="text-sm font-semibold text-gray-500">
							Generate Content
						</h2>
						<div className="mt-3 space-y-3">
							<Link
								href="/generate-single"
								className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
									pathname === "/generate-single"
										? "bg-blue-50 text-blue-600"
										: "text-gray-700 hover:bg-gray-50"
								}`}>
								<DocumentIcon className="w-5 h-5" />
								<span>Single Content</span>
							</Link>
							<Link
								href="/generate-bulk"
								className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
									pathname === "/generate-bulk"
										? "bg-blue-50 text-blue-600"
										: "text-gray-700 hover:bg-gray-50"
								}`}>
								<DocumentDuplicateIcon className="w-5 h-5" />
								<span>Bulk Content</span>
							</Link>
						</div>
					</div>

					<div>
						<h2 className="text-sm font-semibold text-gray-500">Navigation</h2>
						<div className="mt-3 space-y-3">
							<Link
								href="/dashboard"
								className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
									pathname === "/dashboard"
										? "bg-blue-50 text-blue-600"
										: "text-gray-700 hover:bg-gray-50"
								}`}>
								<HomeIcon className="w-5 h-5" />
								<span>Dashboard</span>
							</Link>
						</div>
					</div>
				</nav>
=======
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
              <Link
                href="/dashboard"
                className="flex items-center space-x-3 p-2 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <HomeIcon className="w-5 h-5" />
                <span>Dashboard</span>
              </Link>
            </div>
          </div>

          {companyName ? (
            <>
              <div>
                <h2 className="text-sm font-semibold text-gray-500">
                  Current Company
                </h2>
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <p className="text-blue-700 font-medium">{companyName}</p>
                </div>
              </div>
>>>>>>> 7363db49769275f397a2419658ca7012cb39298f

              <div>
                <h2 className="text-sm font-semibold text-gray-500">
                  Content Actions
                </h2>
                <div className="mt-3 space-y-3">
                  <Link
                    href="/view-content"
                    className="flex items-center space-x-3 p-2 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    <ViewColumnsIcon className="w-5 h-5" />
                    <span>View All Content</span>
                  </Link>
                  <Link
                    href="/generate-single"
                    className="flex items-center space-x-3 p-2 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    <DocumentPlusIcon className="w-5 h-5" />
                    <span>Generate Single Content</span>
                  </Link>
                  <Link
                    href="/generate-bulk"
                    className="flex items-center space-x-3 p-2 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    <DocumentDuplicateIcon className="w-5 h-5" />
                    <span>Generate Bulk Content</span>
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
