export function getMongoConfig() {
  return {
    uri: process.env.MONGODB_URI || '',
    dbName: process.env.MONGODB_DB_NAME || 'DanceMeetDB',
  };
}
