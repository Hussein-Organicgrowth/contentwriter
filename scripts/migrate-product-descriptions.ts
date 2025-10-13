/**
 * Migration script to move product descriptions from Website embedded arrays
 * to separate collections (PendingProductDescription and PublishedProductDescription)
 *
 * Run with: npx tsx scripts/migrate-product-descriptions.ts
 */

import { Website } from "../src/models/Website";
import {
  PendingProductDescription,
  PublishedProductDescription,
} from "../src/models/ProductDescription";

import mongoose, { Mongoose } from "mongoose";

const MONGODB_URI =
  "mongodb+srv://hussein:zztGE7xhOXRzoWzm@content.37x4u.mongodb.net/?retryWrites=true&w=majority&appName=content";

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// Extend the global namespace to include the mongoose cache
declare global {
  let mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = (
  global as typeof globalThis & { mongoose: MongooseCache | undefined }
).mongoose || {
  conn: null,
  promise: null,
};

async function connectToDatabase(): Promise<Mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      // Add other options if necessary
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

interface MigrationStats {
  websitesProcessed: number;
  pendingDescriptionsCreated: number;
  publishedProductsCreated: number;
  errors: Array<{ websiteName: string; error: string }>;
}

async function migrateWebsite(website: any, stats: MigrationStats) {
  console.log(`\n🔄 Processing website: ${website.name}`);
  console.log(
    `  - Pending descriptions: ${
      website.pendingProductDescriptions?.length || 0
    }`
  );
  console.log(
    `  - Published products: ${website.publishedProducts?.length || 0}`
  );
  await connectToDatabase();

  try {
    let pendingCount = 0;
    let publishedCount = 0;

    // Migrate pending product descriptions
    if (
      website.pendingProductDescriptions &&
      website.pendingProductDescriptions.length > 0
    ) {
      for (const desc of website.pendingProductDescriptions) {
        try {
          // Check if already exists
          const existing = await PendingProductDescription.findOne({
            websiteName: website.name,
            productId: desc.productId,
            isActive: true,
          });

          if (!existing) {
            await PendingProductDescription.create({
              websiteName: website.name,
              productId: desc.productId,
              oldDescription: desc.oldDescription || "",
              newDescription: desc.newDescription,
              oldSeoTitle: desc.oldSeoTitle || "",
              oldSeoDescription: desc.oldSeoDescription || "",
              newSeoTitle: desc.newSeoTitle || "",
              newSeoDescription: desc.newSeoDescription || "",
              summaryHtml: desc.summaryHtml || "",
              generatedAt: desc.generatedAt
                ? new Date(desc.generatedAt)
                : new Date(),
              isActive: true,
              version: 1,
            });
            pendingCount++;
          } else {
            console.log(
              `  ⚠️  Pending description for product ${desc.productId} already exists, skipping`
            );
          }
        } catch (error) {
          console.error(
            `  ❌ Error migrating pending description for product ${desc.productId}:`,
            error
          );
          stats.errors.push({
            websiteName: website.name,
            error: `Pending description for product ${desc.productId}: ${error}`,
          });
        }
      }
    }

    // Migrate published products
    if (website.publishedProducts && website.publishedProducts.length > 0) {
      for (const pub of website.publishedProducts) {
        try {
          // Check if already exists
          const existing = await PublishedProductDescription.findOne({
            websiteName: website.name,
            productId: pub.productId,
          });

          if (!existing) {
            await PublishedProductDescription.create({
              websiteName: website.name,
              productId: pub.productId,
              publishedAt: pub.publishedAt
                ? new Date(pub.publishedAt)
                : new Date(),
              isActive: true,
            });
            publishedCount++;
          } else {
            // Update if exists
            await PublishedProductDescription.findOneAndUpdate(
              {
                websiteName: website.name,
                productId: pub.productId,
              },
              {
                $set: {
                  publishedAt: pub.publishedAt
                    ? new Date(pub.publishedAt)
                    : new Date(),
                  isActive: true,
                },
              }
            );
            publishedCount++;
          }
        } catch (error) {
          console.error(
            `  ❌ Error migrating published product ${pub.productId}:`,
            error
          );
          stats.errors.push({
            websiteName: website.name,
            error: `Published product ${pub.productId}: ${error}`,
          });
        }
      }
    }

    // Mark website as migrated
    await Website.updateOne(
      { _id: website._id },
      {
        $set: {
          productDescriptionsMigrated: true,
          productDescriptionsMigratedAt: new Date(),
        },
      }
    );

    console.log(
      `  ✅ Migrated ${pendingCount} pending descriptions and ${publishedCount} published products`
    );

    stats.pendingDescriptionsCreated += pendingCount;
    stats.publishedProductsCreated += publishedCount;
    stats.websitesProcessed++;
  } catch (error) {
    console.error(`  ❌ Error processing website ${website.name}:`, error);
    stats.errors.push({
      websiteName: website.name,
      error: String(error),
    });
  }
}

async function verifyMigration(stats: MigrationStats) {
  console.log("\n🔍 Verifying migration...");

  // Count documents in old embedded arrays
  const websitesWithData = await Website.find({
    $or: [
      { "pendingProductDescriptions.0": { $exists: true } },
      { "publishedProducts.0": { $exists: true } },
    ],
  });

  let totalPendingInWebsites = 0;
  let totalPublishedInWebsites = 0;

  for (const website of websitesWithData) {
    totalPendingInWebsites += website.pendingProductDescriptions?.length || 0;
    totalPublishedInWebsites += website.publishedProducts?.length || 0;
  }

  // Count documents in new collections
  const totalPendingInCollection =
    await PendingProductDescription.countDocuments({ isActive: true });
  const totalPublishedInCollection =
    await PublishedProductDescription.countDocuments({ isActive: true });

  console.log("\n📊 Verification Results:");
  console.log(
    `  Old pending descriptions (in Website docs): ${totalPendingInWebsites}`
  );
  console.log(
    `  New pending descriptions (in collection): ${totalPendingInCollection}`
  );
  console.log(
    `  Old published products (in Website docs): ${totalPublishedInWebsites}`
  );
  console.log(
    `  New published products (in collection): ${totalPublishedInCollection}`
  );

  if (
    totalPendingInCollection >= totalPendingInWebsites &&
    totalPublishedInCollection >= totalPublishedInWebsites
  ) {
    console.log("  ✅ Verification passed: All data migrated successfully");
  } else {
    console.log(
      "  ⚠️  Warning: Some data may not have been migrated. Please review the logs."
    );
  }
}

async function runMigration() {
  const stats: MigrationStats = {
    websitesProcessed: 0,
    pendingDescriptionsCreated: 0,
    publishedProductsCreated: 0,
    errors: [],
  };

  try {
    await connectToDatabase();

    console.log("\n🔍 Finding websites with product descriptions...");

    // Find all websites with pending descriptions or published products
    const websites = await Website.find({
      $or: [
        { "pendingProductDescriptions.0": { $exists: true } },
        { "publishedProducts.0": { $exists: true } },
      ],
    });

    console.log(`\n📦 Found ${websites.length} websites to process`);

    if (websites.length === 0) {
      console.log("✅ No websites need migration. Exiting.");
      return;
    }

    // Process each website
    for (const website of websites) {
      await migrateWebsite(website, stats);
    }

    // Verify migration
    await verifyMigration(stats);

    // Print final statistics
    console.log("\n" + "=".repeat(60));
    console.log("📈 MIGRATION SUMMARY");
    console.log("=".repeat(60));
    console.log(`Websites processed: ${stats.websitesProcessed}`);
    console.log(
      `Pending descriptions created: ${stats.pendingDescriptionsCreated}`
    );
    console.log(
      `Published products created: ${stats.publishedProductsCreated}`
    );
    console.log(`Errors encountered: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log("\n❌ ERRORS:");
      stats.errors.forEach((err, index) => {
        console.log(`  ${index + 1}. ${err.websiteName}: ${err.error}`);
      });
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

// Run the migration
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log("\n✨ Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Fatal error:", error);
      process.exit(1);
    });
}

export { runMigration };
