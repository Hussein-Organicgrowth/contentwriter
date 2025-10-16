/**
 * Migration: Add database indexes for query optimization
 * Date: 2024-10-16
 * 
 * This migration adds indexes to optimize queries on:
 * - Product IDs (for Shopify product lookups)
 * - Content status (for filtering by draft/published/archived states)
 * 
 * Note: In this Mongoose-based application, indexes are defined in the schema
 * and created automatically. This script serves as documentation and can be
 * used to manually create indexes if needed.
 * 
 * Run with: node scripts/migrations/2024-10-add-indexes.js
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/contentwriter';

async function up() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    // 1. Add compound index for productId + isActive on pending descriptions
    console.log('\n📊 Adding indexes to pendingproductdescriptions...');
    await db.collection('pendingproductdescriptions').createIndex(
      { productId: 1, isActive: 1 },
      { background: true, name: 'productId_1_isActive_1' }
    );
    console.log('✅ Ensured index: { productId: 1, isActive: 1 }');

    // 2. Add compound index for productId + isActive on published descriptions
    console.log('\n📊 Adding indexes to publishedproductdescriptions...');
    await db.collection('publishedproductdescriptions').createIndex(
      { productId: 1, isActive: 1 },
      { background: true, name: 'productId_1_isActive_1' }
    );
    console.log('✅ Ensured index: { productId: 1, isActive: 1 }');

    // 3. Add isActive index to PublishedProductDescription
    await db.collection('publishedproductdescriptions').createIndex(
      { isActive: 1 },
      { background: true, name: 'isActive_1' }
    );
    console.log('✅ Ensured index: { isActive: 1 }');
    
    // 4. Add content.status index to Website
    console.log('\n📊 Adding indexes to websites...');
    await db.collection('websites').createIndex(
      { 'content.status': 1 },
      { background: true, name: 'content.status_1' }
    );
    console.log('✅ Ensured index: { "content.status": 1 }');
    
    // 5. Add compound index for userId + content.status
    await db.collection('websites').createIndex(
      { userId: 1, 'content.status': 1 },
      { background: true, name: 'userId_1_content.status_1' }
    );
    console.log('✅ Ensured index: { userId: 1, "content.status": 1 }');
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('\nVerify indexes with:');
    console.log('  db.publishedproductdescriptions.getIndexes()');
    console.log('  db.websites.getIndexes()');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

async function down() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    // Drop the indexes
    console.log('\n🔄 Removing indexes...');
    
    const indexesToDrop = [
      { collection: 'pendingproductdescriptions', index: 'productId_1_isActive_1' },
      { collection: 'publishedproductdescriptions', index: 'productId_1_isActive_1' },
      { collection: 'publishedproductdescriptions', index: 'isActive_1' },
      { collection: 'websites', index: 'content.status_1' },
      { collection: 'websites', index: 'userId_1_content.status_1' },
    ];
    
    for (const { collection, index } of indexesToDrop) {
      try {
        await db.collection(collection).dropIndex(index);
        console.log(`✅ Dropped index: ${collection}.${index}`);
      } catch (error) {
        console.log(`⚠️  Index ${collection}.${index} not found (may not exist)`);
      }
    }
    
    console.log('\n✅ Rollback completed successfully!');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run migration
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'down') {
    console.log('🔄 Running migration rollback (down)...\n');
    down()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    console.log('🚀 Running migration (up)...\n');
    up()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}

module.exports = { up, down };
