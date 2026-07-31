import { MongoClient, Db } from 'mongodb';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{
  client: MongoClient;
  db: Db;
}> {
  if (cachedClient && cachedDb) {
    console.log('📦 Using cached MongoDB connection');
    return { client: cachedClient, db: cachedDb };
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'DanceMeetDB';

  if (!uri) {
    throw new Error('MONGODB_URI is not configured');
  }

  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log(`Database: ${dbName}`);

    const client = new MongoClient(uri);

    await client.connect();

    const db = client.db(dbName);

    await db.admin().ping();

    cachedClient = client;
    cachedDb = db;

    console.log(`✅ Successfully connected to ${dbName} database`);

    return {
      client: cachedClient,
      db: cachedDb,
    };
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();

    cachedClient = null;
    cachedDb = null;

    console.log('🔌 Disconnected from MongoDB');
  }
}

export function getDatabase(): Db {
  if (!cachedDb) {
    throw new Error(
      'Database not connected. Call connectToDatabase first.',
    );
  }

  return cachedDb;
}

export function getClient(): MongoClient {
  if (!cachedClient) {
    throw new Error(
      'Database client not initialized. Call connectToDatabase first.',
    );
  }

  return cachedClient;
}