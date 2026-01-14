import { MongoClient, Db } from "mongodb";

const options = {};

let clientPromise: Promise<MongoClient> | null = null;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  if (process.env.NODE_ENV === "development") {
    // In development, use a global variable to preserve the client across HMR
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  } else {
    // In production, create a new client (lazy)
    if (!clientPromise) {
      const client = new MongoClient(uri, options);
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

// Default export for backward compatibility - this will be lazily evaluated
const clientPromiseProxy = {
  then: (resolve: (value: MongoClient) => void, reject: (reason: unknown) => void) =>
    getClientPromise().then(resolve, reject),
  catch: (reject: (reason: unknown) => void) =>
    getClientPromise().catch(reject),
};

export default clientPromiseProxy as unknown as Promise<MongoClient>;

export async function getDatabase(dbName: string = "main"): Promise<Db> {
  const client = await getClientPromise();
  return client.db(dbName);
}

/**
 * Close the MongoDB connection
 * Call this when your script/process is done to allow graceful exit
 */
export async function closeConnection(): Promise<void> {
  try {
    if (global._mongoClientPromise) {
      const client = await global._mongoClientPromise;
      await client.close();
      global._mongoClientPromise = undefined;
    }
    if (clientPromise) {
      const client = await clientPromise;
      await client.close();
      clientPromise = null;
    }
  } catch (error) {
    // Ignore errors during close
  }
}
