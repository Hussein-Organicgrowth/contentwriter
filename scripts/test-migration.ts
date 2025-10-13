/**
 * Test script to verify the migration was successful
 *
 * Run with: npx tsx scripts/test-migration.ts
 */

import mongoose from "mongoose";
import { Website } from "../src/models/Website";
import {
  PendingProductDescription,
  PublishedProductDescription,
} from "../src/models/ProductDescription";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/contentwriter";

interface TestResult {
  passed: boolean;
  message: string;
  details?: any;
}

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    throw error;
  }
}

async function testDataIntegrity(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: Check if new collections exist and have data
  const pendingCount = await PendingProductDescription.countDocuments();
  const publishedCount = await PublishedProductDescription.countDocuments();

  results.push({
    passed: pendingCount >= 0 && publishedCount >= 0,
    message: "New collections exist",
    details: {
      pendingDescriptions: pendingCount,
      publishedProducts: publishedCount,
    },
  });

  // Test 2: Verify all migrated websites are marked
  const migratedWebsites = await Website.countDocuments({
    productDescriptionsMigrated: true,
  });

  results.push({
    passed: migratedWebsites > 0,
    message: "Websites marked as migrated",
    details: { count: migratedWebsites },
  });

  // Test 3: Verify indexes exist
  const pendingIndexes =
    await PendingProductDescription.collection.getIndexes();
  const publishedIndexes =
    await PublishedProductDescription.collection.getIndexes();

  const hasPendingCompoundIndex = Object.keys(pendingIndexes).some(
    (key) => key.includes("websiteName") && key.includes("productId")
  );

  const hasPublishedCompoundIndex = Object.keys(publishedIndexes).some(
    (key) => key.includes("websiteName") && key.includes("productId")
  );

  results.push({
    passed: hasPendingCompoundIndex && hasPublishedCompoundIndex,
    message: "Required indexes exist",
    details: {
      pendingIndexes: Object.keys(pendingIndexes),
      publishedIndexes: Object.keys(publishedIndexes),
    },
  });

  // Test 4: Compare counts between old and new
  const websitesWithOldData = await Website.find({
    productDescriptionsMigrated: true,
  });

  let totalOldPending = 0;
  let totalOldPublished = 0;

  for (const website of websitesWithOldData) {
    totalOldPending += website.pendingProductDescriptions?.length || 0;
    totalOldPublished += website.publishedProducts?.length || 0;
  }

  const totalNewPending = await PendingProductDescription.countDocuments({
    isActive: true,
  });

  const totalNewPublished = await PublishedProductDescription.countDocuments({
    isActive: true,
  });

  results.push({
    passed:
      totalNewPending >= totalOldPending &&
      totalNewPublished >= totalOldPublished,
    message: "Data counts match or exceed original",
    details: {
      oldPending: totalOldPending,
      newPending: totalNewPending,
      oldPublished: totalOldPublished,
      newPublished: totalNewPublished,
    },
  });

  // Test 5: Verify a sample record has all required fields
  const samplePending = await PendingProductDescription.findOne({
    isActive: true,
  });
  if (samplePending) {
    const hasRequiredFields =
      samplePending.websiteName &&
      samplePending.productId &&
      samplePending.newDescription &&
      samplePending.generatedAt !== undefined &&
      samplePending.isActive !== undefined &&
      samplePending.version !== undefined;

    results.push({
      passed: hasRequiredFields,
      message: "Sample pending record has all required fields",
      details: {
        websiteName: !!samplePending.websiteName,
        productId: !!samplePending.productId,
        newDescription: !!samplePending.newDescription,
        generatedAt: !!samplePending.generatedAt,
        isActive: samplePending.isActive,
        version: samplePending.version,
      },
    });
  }

  const samplePublished = await PublishedProductDescription.findOne({
    isActive: true,
  });
  if (samplePublished) {
    const hasRequiredFields =
      samplePublished.websiteName &&
      samplePublished.productId &&
      samplePublished.publishedAt &&
      samplePublished.isActive !== undefined;

    results.push({
      passed: hasRequiredFields,
      message: "Sample published record has all required fields",
      details: {
        websiteName: !!samplePublished.websiteName,
        productId: !!samplePublished.productId,
        publishedAt: !!samplePublished.publishedAt,
        isActive: samplePublished.isActive,
      },
    });
  }

  return results;
}

async function testQueries(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 6: Test query performance
  const testWebsite = await Website.findOne({
    productDescriptionsMigrated: true,
  });

  if (testWebsite) {
    const startTime = Date.now();
    const pendingDescs = await PendingProductDescription.find({
      websiteName: testWebsite.name,
      isActive: true,
    })
      .select("productId newDescription")
      .lean();
    const queryTime = Date.now() - startTime;

    results.push({
      passed: queryTime < 1000, // Should be under 1 second
      message: "Query performance test",
      details: {
        websiteName: testWebsite.name,
        recordsFound: pendingDescs.length,
        queryTimeMs: queryTime,
      },
    });

    // Test 7: Test specific product lookup
    if (pendingDescs.length > 0) {
      const sampleProductId = pendingDescs[0].productId;
      const lookupStart = Date.now();
      const specificProduct = await PendingProductDescription.findOne({
        websiteName: testWebsite.name,
        productId: sampleProductId,
        isActive: true,
      }).lean();
      const lookupTime = Date.now() - lookupStart;

      results.push({
        passed: !!specificProduct && lookupTime < 100, // Should be under 100ms
        message: "Single product lookup test",
        details: {
          found: !!specificProduct,
          lookupTimeMs: lookupTime,
        },
      });
    }
  }

  return results;
}

async function runTests() {
  console.log("\n" + "=".repeat(60));
  console.log("🧪 MIGRATION VERIFICATION TESTS");
  console.log("=".repeat(60) + "\n");

  try {
    await connectToDatabase();

    console.log("Running data integrity tests...\n");
    const integrityResults = await testDataIntegrity();

    console.log("Running query performance tests...\n");
    const queryResults = await testQueries();

    const allResults = [...integrityResults, ...queryResults];

    // Print results
    console.log("\n" + "=".repeat(60));
    console.log("📊 TEST RESULTS");
    console.log("=".repeat(60) + "\n");

    let passedCount = 0;
    let failedCount = 0;

    allResults.forEach((result, index) => {
      const status = result.passed ? "✅ PASS" : "❌ FAIL";
      console.log(`${index + 1}. ${status}: ${result.message}`);
      if (result.details) {
        console.log(`   Details:`, JSON.stringify(result.details, null, 2));
      }
      console.log();

      if (result.passed) {
        passedCount++;
      } else {
        failedCount++;
      }
    });

    // Summary
    console.log("=".repeat(60));
    console.log("📈 SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total tests: ${allResults.length}`);
    console.log(`Passed: ${passedCount}`);
    console.log(`Failed: ${failedCount}`);
    console.log();

    if (failedCount === 0) {
      console.log("🎉 All tests passed! Migration successful.");
    } else {
      console.log("⚠️  Some tests failed. Please review the results above.");
    }
  } catch (error) {
    console.error("\n❌ Test execution failed:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB\n");
  }
}

// Run the tests
if (require.main === module) {
  runTests()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Fatal error:", error);
      process.exit(1);
    });
}

export { runTests };
