"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import {
  HomeIcon,
  ViewColumnsIcon,
  DocumentPlusIcon,
  DocumentDuplicateIcon,
  Cog6ToothIcon,
  ArrowsUpDownIcon,
  Bars3Icon,
  XMarkIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function Sidebar() {
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();

  // Function to update company info from localStorage
  const updateCompanyInfo = () => {
    if (typeof window !== "undefined") {
      const storedCompany = localStorage.getItem("company");
      const storedCompanyId = localStorage.getItem("companyId");

      if (storedCompany && storedCompanyId) {
        setCompanyName(storedCompany);
        setCompanyId(storedCompanyId);
      } else {
        // Clear state if no company is selected
        setCompanyName(null);
        setCompanyId(null);
      }
    }
  };

  // Update company info when component mounts and when pathname changes
  useEffect(() => {
    updateCompanyInfo();
  }, [pathname]);

  // Set up a storage event listener to update when localStorage changes
  useEffect(() => {
    // Function to handle storage changes
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "company" || event.key === "companyId") {
        updateCompanyInfo();
      }
    };

    // Only add event listener on client side
    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);

      // Check for changes every second (as a fallback)
      const interval = setInterval(updateCompanyInfo, 1000);

      return () => {
        window.removeEventListener("storage", handleStorageChange);
        clearInterval(interval);
      };
    }
  }, []);

  const handleDashboardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push("/dashboard");
    router.refresh();
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileMenu}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-md"
      >
        {isMobileMenuOpen ? (
          <XMarkIcon className="w-6 h-6" />
        ) : (
          <Bars3Icon className="w-6 h-6" />
        )}
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-screen overflow-y-scroll w-64 bg-gray-50 border-r border-gray-200 z-40 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:relative lg:block`}
      >
        <div className="h-16 p-10 border-b flex items-center justify-center">
          {/* <span className="text-lg font-semibold">TekstFlow </span> */}
          <Image
            src="/copybuddy_logo_dark_text.svg"
            alt="CopyBuddy Logo"
            width={100}
            height={100}
            className="flex-grow"
          />
        </div>

        <div className="flex flex-col justify-between flex-1 p-6 overflow-y-auto">
          <nav className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-500">
                Navigation
              </h2>
              <div className="mt-3">
                <button
                  onClick={handleDashboardClick}
                  className={`flex items-center space-x-3 p-2 rounded-lg w-full text-left transition-colors hover:bg-accent hover:text-primary ${
                    pathname === "/dashboard"
                      ? "text-primary"
                      : "transparent"
                  }`}
                >
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
                  <div className="mt-2 p-3 bg-accent rounded-lg">
                    <p className="text-primary font-sm">{companyName}</p>
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-gray-500">
                    Indhold Handlinger
                  </h2>
                  <div className="mt-3 space-y-3">
                    <Link
                      href="/dashboard/viewcontent"
                      className={`flex items-center space-x-3 p-2 rounded-lg transition-colors hover:bg-accent hover:text-primary ${
                        pathname === "/dashboard/viewcontent"
                          ? "text-primary"
                          : "transparent"
                      }`}
                    >
                      <ViewColumnsIcon className="w-5 h-5" />
                      <span>Se Alt Indhold</span>
                    </Link>
                    <Link
                      href="/content/singlecontent"
                      className={`flex items-center space-x-3 p-2 rounded-lg transition-colors hover:bg-accent hover:text-primary ${
                        pathname === "/content/singlecontent"
                          ? "text-primary"
                          : "transparent"
                      }`}
                    >
                      <DocumentPlusIcon className="w-5 h-5" />
                      <span>Generer Enkelt Indhold</span>
                    </Link>
                    <Link
                      href="/content/bulkcontent"
                      className={`flex items-center space-x-3 p-2 rounded-lg transition-colors hover:bg-accent hover:text-primary ${
                        pathname === "/content/bulkcontent"
                          ? "text-primary"
                          : "transparent"
                      }`}
                    >
                      <DocumentDuplicateIcon className="w-5 h-5" />
                      <span>Generer Masse Indhold</span>
                    </Link>
                    <Link
                      href="/dashboard/webshop"
                      className={`flex items-center space-x-3 p-2 rounded-lg transition-colors hover:bg-accent hover:text-primary ${
                        pathname === "/dashboard/webshop"
                          ? "text-primary"
                          : "transparent"
                      }`}
                    >
                      <ShoppingBagIcon className="w-5 h-5" />
                      <span>Webshop</span>
                    </Link>
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-gray-500">
                    System
                  </h2>
                  <div className="mt-3 space-y-3">
                    <Link
                      href="/dashboard/settings"
                      className={`flex items-center space-x-3 p-2 rounded-lg transition-colors hover:bg-accent hover:text-primary ${
                        pathname === "/dashboard/settings"
                          ? "text-primary"
                          : "transparent"
                      }`}
                    >
                      <Cog6ToothIcon className="w-5 h-5" />
                      <span>Settings</span>
                    </Link>

                    <Link
                      href="/dashboard/settings/workflow"
                      className={`flex items-center space-x-3 p-2 rounded-lg transition-colors hover:bg-accent hover:text-primary ${
                        pathname === "/dashboard/settings/workflow"
                          ? "text-primary"
                          : "transparent"
                      }`}
                    >
                      <ArrowsUpDownIcon className="w-5 h-5" />
                      <span>Workflow</span>
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-700">
                  Vælg venligst en virksomhed fra dashboardet for at få adgang
                  til indholdsgenereringsfunktioner.
                </p>
              </div>
            )}
          </nav>

          <div>
            <div className="flex flex-col items-center justify-center mb-6 pb-6 border-b border-gray-200">
              <Link
                href="https://organicgrowth.dk"
                target="_blank"
                className="flex flex-col items-center gap-2 opacity-70 hover:opacity-100 transition-opacity"
              >
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
    </>
  );
}
