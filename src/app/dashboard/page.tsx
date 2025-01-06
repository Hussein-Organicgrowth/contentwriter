import Dashboard from "@/components/dashboard/dashboard";
import { Website } from "@/models/Website";
import { currentUser } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongodb";
import { Suspense } from "react";

async function getWebsites() {
	const user = await currentUser();
	await connectToDatabase();

	const websiteDocs = await Website.find({ userId: user?.id }).sort({
		createdAt: -1,
	});

	return JSON.parse(JSON.stringify(websiteDocs));
}

export default async function DashboardPage() {
	const websites = await getWebsites();

	return (
		<Suspense fallback={<div>Loading...</div>}>
			<Dashboard websites={websites} />
		</Suspense>
	);
}
