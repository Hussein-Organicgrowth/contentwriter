/**
 * Check the size of Website documents to see why queries are slow
 *
 * Run with: npx tsx scripts/check-document-sizes.ts
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function checkDocumentSizes() {
  try {
    await connectToDatabase();

    console.log("\n📊 Analyzing Website document sizes...\n");

    const websites = await Website.find({}).lean();

    console.log(`Found ${websites.length} websites\n`);

    let totalSize = 0;
    let maxSize = 0;
    let maxSizeWebsite = "";

    const sizes: { name: string; size: number; details: any }[] = [];

    for (const website of websites) {
      const jsonString = JSON.stringify(website);
      const sizeInBytes = Buffer.byteLength(jsonString, "utf8");

      const details = {
        pendingProductDescriptions:
          website.pendingProductDescriptions?.length || 0,
        publishedProducts: website.publishedProducts?.length || 0,
        content: website.content?.length || 0,
        pendingCollectionDescriptions:
          website.pendingCollectionDescriptions?.length || 0,
      };

      sizes.push({
        name: website.name,
        size: sizeInBytes,
        details,
      });

      totalSize += sizeInBytes;

      if (sizeInBytes > maxSize) {
        maxSize = sizeInBytes;
        maxSizeWebsite = website.name;
      }
    }

    // Sort by size (largest first)
    sizes.sort((a, b) => b.size - a.size);

    console.log("📈 TOP 10 LARGEST WEBSITES:\n");
    sizes.slice(0, 10).forEach((item, index) => {
      console.log(`${index + 1}. ${item.name}`);
      console.log(`   Size: ${formatBytes(item.size)}`);
      console.log(
        `   Pending descriptions: ${item.details.pendingProductDescriptions}`
      );
      console.log(`   Published products: ${item.details.publishedProducts}`);
      console.log(`   Content items: ${item.details.content}`);
      console.log(
        `   Collection descriptions: ${item.details.pendingCollectionDescriptions}`
      );
      console.log();
    });

    console.log("=".repeat(60));
    console.log("📊 SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total websites: ${websites.length}`);
    console.log(`Total size: ${formatBytes(totalSize)}`);
    console.log(`Average size: ${formatBytes(totalSize / websites.length)}`);
    console.log(`Largest website: ${maxSizeWebsite} (${formatBytes(maxSize)})`);
    console.log();

    // Calculate potential savings
    let potentialSavings = 0;
    sizes.forEach((item) => {
      if (
        item.details.pendingProductDescriptions > 0 ||
        item.details.publishedProducts > 0
      ) {
        // Rough estimate: each product description is ~2KB
        const productDataSize =
          item.details.pendingProductDescriptions * 2048 +
          item.details.publishedProducts * 500;
        potentialSavings += productDataSize;
      }
    });

    console.log("💡 POTENTIAL SAVINGS IF YOU CLEAN UP:");
    console.log(`   Current total: ${formatBytes(totalSize)}`);
    console.log(`   Estimated savings: ${formatBytes(potentialSavings)}`);
    console.log(
      `   After cleanup: ${formatBytes(totalSize - potentialSavings)}`
    );
    console.log(
      `   Reduction: ${((potentialSavings / totalSize) * 100).toFixed(1)}%`
    );
    console.log();

    if (potentialSavings > 1024 * 1024) {
      console.log("⚠️  WARNING: Your documents are TOO LARGE!");
      console.log("   This is why queries are taking 4+ minutes.");
      console.log("   Run the cleanup script IMMEDIATELY:");
      console.log("   npx tsx scripts/cleanup-old-product-data.ts");
    }
  } catch (error) {
    console.error("\n❌ Analysis failed:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

if (require.main === module) {
  checkDocumentSizes()
    .then(() => {
      console.log("\n✨ Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Fatal error:", error);
      process.exit(1);
    });
}

export { checkDocumentSizes };
