import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

// Using direct URI from .env
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;

if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI in .env file');
}

if (!DB_NAME) {
  throw new Error('Please define DB_NAME in .env file');
}

let client: MongoClient;
let db: Db;

export const connectToDatabase = async (): Promise<Db> => {
  if (db) return db;

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('✅ Connected to MongoDB Atlas successfully');
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

export const getDb = (): Db => {
  if (!db) {
    throw new Error('Database not initialized. Call connectToDatabase first.');
  }
  return db;
};