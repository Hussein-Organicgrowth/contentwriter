import Dashboard from "@/components/dashboard/dashboard";
import { Website } from "@/models/Website";
import { currentUser } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongodb";
import { Suspense } from "react";

async function getWebsites() {
  const user = await currentUser();
  await connectToDatabase();

  const [ownedWebsites, sharedWebsites] = await Promise.all([
    Website.find({ userId: user?.id }).sort({ createdAt: -1 }),
    Website.find({ sharedUsers: user?.emailAddresses[0]?.emailAddress }).sort({
      createdAt: -1,
    }),
  ]);

  return {
    websites: JSON.parse(JSON.stringify(ownedWebsites)),
    sharedWebsites: JSON.parse(JSON.stringify(sharedWebsites)),
  };
}

export default async function DashboardPage() {
  const { websites, sharedWebsites } = await getWebsites();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Dashboard websites={websites} sharedWebsites={sharedWebsites} />
    </Suspense>
  );
}
