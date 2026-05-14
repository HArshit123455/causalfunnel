import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | null = null;

export async function startTestDb(): Promise<string> {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  return uri;
}

export async function stopTestDb(): Promise<void> {
  await mongoose.disconnect();
  await mongod?.stop();
  mongod = null;
}

export async function clearDb(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const c of Object.values(collections)) await c.deleteMany({});
}
