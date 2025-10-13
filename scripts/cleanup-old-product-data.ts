/**
 * OPTIONAL Cleanup Script - Run ONLY after verifying migration success
 *
 * This removes the old embedded arrays from Website documents to save space.
 * Only run this after 1-2 weeks of stable operation with the new collections.
 *
 * Run with: npx tsx scripts/cleanup-old-product-data.ts
 */

import mongoose from "mongoose";
import { Website } from "../src/models/Website";

const MONGODB_URI =
  "mongodb+srv://hussein:zztGE7xhOXRzoWzm@content.37x4u.mongodb.net/?retryWrites=true&w=majority&appName=content";

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    throw error;
  }
}

async function cleanupOldData() {
  try {
    await connectToDatabase();

    console.log(
      "\n⚠️  WARNING: This will remove old embedded product data from Website documents."
    );
    console.log(
      "Make sure you've verified the migration is working correctly!"
    );
    console.log("\nFinding websites with old data...\n");

    // Find websites that still have old data
    const websitesWithOldData = await Website.find({
      $or: [
        { "pendingProductDescriptions.0": { $exists: true } },
        { "publishedProducts.0": { $exists: true } },
        { "pendingCollectionDescriptions.0": { $exists: true } },
      ],
    });

    console.log(
      `Found ${websitesWithOldData.length} websites with old embedded data`
    );

    let totalPending = 0;
    let totalPublished = 0;
    let totalCollections = 0;

    for (const website of websitesWithOldData) {
      totalPending += website.pendingProductDescriptions?.length || 0;
      totalPublished += website.publishedProducts?.length || 0;
      totalCollections += website.pendingCollectionDescriptions?.length || 0;
    }

    console.log("\nData to be removed:");
    console.log(`  - Pending product descriptions: ${totalPending}`);
    console.log(`  - Published products: ${totalPublished}`);
    console.log(`  - Pending collection descriptions: ${totalCollections}`);
    console.log(
      "\nThis data is now in separate collections and safe to remove from Website docs."
    );

    // Uncomment the lines below when you're ready to actually clean up
    // WARNING: Only do this after verifying everything works!

    console.log("\n🧹 Removing old embedded arrays...");

    const result = await Website.updateMany(
      {},
      {
        $unset: {
          pendingProductDescriptions: "",
          publishedProducts: "",
          pendingCollectionDescriptions: "",
        },
      }
    );

    console.log(`\n✅ Cleanup completed!`);
    console.log(`   Updated ${result.modifiedCount} website documents`);
    console.log(`   Database size should be significantly reduced`);

    console.log(
      "\n💡 To actually perform the cleanup, uncomment the cleanup code in this script."
    );
    console.log("   Review the code carefully before running!");
  } catch (error) {
    console.error("\n❌ Cleanup failed:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

if (require.main === module) {
  cleanupOldData()
    .then(() => {
      console.log("\n✨ Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Fatal error:", error);
      process.exit(1);
    });
}

export { cleanupOldData };
