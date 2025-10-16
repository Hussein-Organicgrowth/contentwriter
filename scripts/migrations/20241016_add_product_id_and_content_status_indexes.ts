import mongoose from "mongoose";
import type { Collection, CreateIndexesOptions } from "mongodb";

type IndexDefinition = {
  name: string;
  key: Record<string, 1 | -1>;
  options?: CreateIndexesOptions;
};

const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://localhost:27017/contentwriter";

const PENDING_COLLECTION = "pendingproductdescriptions";
const PUBLISHED_COLLECTION = "publishedproductdescriptions";
const WEBSITE_COLLECTION = "websites";

const pendingIndexes: IndexDefinition[] = [
  { name: "pending_productId_isActive", key: { productId: 1, isActive: 1 } },
];

const publishedIndexes: IndexDefinition[] = [
  { name: "published_productId_isActive", key: { productId: 1, isActive: 1 } },
];

const websiteIndexes: IndexDefinition[] = [
  {
    name: "website_content_status_by_name",
    key: { name: 1, "content.status": 1 },
  },
];

async function connect(): Promise<void> {
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB");
}

async function disconnect(): Promise<void> {
  await mongoose.disconnect();
  console.log("👋 Disconnected from MongoDB");
}

async function ensureIndexes(
  collection: Collection,
  indexes: IndexDefinition[]
): Promise<void> {
  for (const index of indexes) {
    const exists = await collection.indexExists(index.name);
    if (exists) {
      console.log(
        `ℹ️  Index ${index.name} already exists on ${collection.collectionName}`
      );
      continue;
    }

    await collection.createIndex(index.key, {
      ...(index.options ?? {}),
      name: index.name,
    });

    console.log(
      `✅ Created index ${index.name} on ${collection.collectionName}`
    );
  }
}

async function dropIndexes(
  collection: Collection,
  indexes: IndexDefinition[]
): Promise<void> {
  for (const index of indexes) {
    const exists = await collection.indexExists(index.name);

    if (!exists) {
      console.log(
        `ℹ️  Index ${index.name} does not exist on ${collection.collectionName}`
      );
      continue;
    }

    await collection.dropIndex(index.name);
    console.log(
      `🗑️  Dropped index ${index.name} on ${collection.collectionName}`
    );
  }
}

async function up(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection is not ready");
  }

  await ensureIndexes(db.collection(PENDING_COLLECTION), pendingIndexes);
  await ensureIndexes(db.collection(PUBLISHED_COLLECTION), publishedIndexes);
  await ensureIndexes(db.collection(WEBSITE_COLLECTION), websiteIndexes);
}

async function down(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection is not ready");
  }

  await dropIndexes(db.collection(PENDING_COLLECTION), pendingIndexes);
  await dropIndexes(db.collection(PUBLISHED_COLLECTION), publishedIndexes);
  await dropIndexes(db.collection(WEBSITE_COLLECTION), websiteIndexes);
}

async function run(): Promise<void> {
  const direction = (process.argv[2] ?? "up").toLowerCase();

  if (direction !== "up" && direction !== "down") {
    console.error("Invalid direction. Use 'up' or 'down'.");
    process.exit(1);
  }

  await connect();

  try {
    if (direction === "up") {
      console.log("🚀 Applying product ID and content status indexes...");
      await up();
      console.log("🎉 Index creation completed");
    } else {
      console.log("⏪ Rolling back product ID and content status indexes...");
      await down();
      console.log("✅ Index removal completed");
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await disconnect();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error("💥 Unexpected error:", error);
    process.exit(1);
  });
}
