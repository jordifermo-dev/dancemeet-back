import dns from 'node:dns';
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Same DNS override as connectMongoose() (see mongoose.config.ts) - without it
// this script hits querySrv ECONNREFUSED on machines where Node's DNS client
// resolves through a local resolver that refuses SRV/TXT lookups.
dns.setServers(['1.1.1.1', '8.8.8.8']);

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

async function testConnection(): Promise<void> {
  if (!MONGODB_URI) {
    console.error('❌ Error: MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  if (!MONGODB_DB_NAME) {
    console.error('❌ Error: MONGODB_DB_NAME not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Successfully connected to MongoDB');

    // Test database access
    const db = client.db(MONGODB_DB_NAME);
    console.log(`✅ Successfully accessed database: ${MONGODB_DB_NAME}`);

    // List collections
    const collections = await db.listCollections().toArray();
    console.log(`✅ Collections found: ${collections.length}`);
    if (collections.length > 0) {
      console.log('📋 Collections:');
      collections.forEach((col) => console.log(`   - ${col.name}`));
    }

    // Ping the server
    const adminDb = client.db('admin');
    const pingResult = await adminDb.command({ ping: 1 });
    console.log('✅ Ping successful:', pingResult);

    console.log('\n✅ All connection tests passed!');
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Connection closed');
  }
}

// Run the test
testConnection();
