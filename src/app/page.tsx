import Dashboard from "@/components/dashboard/dashboard";
import { Website } from "@/models/Website";
import { currentUser } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongodb";
import { Suspense } from "react";

async function getWebsites() {
  const user = await currentUser();
  await connectToDatabase();

  // IMPORTANT: Exclude large arrays that aren't needed for the homepage
  const projection = {
    pendingProductDescriptions: 0,
    publishedProducts: 0,
    pendingCollectionDescriptions: 0,
    content: 0, // Exclude - not needed for homepage, load only when viewing content
  };

  const [ownedWebsites, sharedWebsites] = await Promise.all([
    Website.find({ userId: user?.id }, projection).sort({ createdAt: -1 }),
    Website.find(
      { sharedUsers: user?.emailAddresses[0]?.emailAddress },
      projection
    ).sort({
      createdAt: -1,
    }),
  ]);

  return {
    websites: JSON.parse(JSON.stringify(ownedWebsites)),
    sharedWebsites: JSON.parse(JSON.stringify(sharedWebsites)),
  };
}
export default async function Home() {
  const { websites, sharedWebsites } = await getWebsites();

  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <Dashboard websites={websites} sharedWebsites={sharedWebsites} />
      </Suspense>
    </div>
  );
}
