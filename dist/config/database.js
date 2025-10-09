"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = exports.connectToDatabase = void 0;
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Using direct URI from .env
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;
if (!MONGODB_URI) {
    throw new Error('Please define MONGODB_URI in .env file');
}
if (!DB_NAME) {
    throw new Error('Please define DB_NAME in .env file');
}
let client;
let db;
const connectToDatabase = async () => {
    if (db)
        return db;
    try {
        client = new mongodb_1.MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db(DB_NAME);
        console.log('✅ Connected to MongoDB Atlas successfully');
        return db;
    }
    catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};
exports.connectToDatabase = connectToDatabase;
const getDb = () => {
    if (!db) {
        throw new Error('Database not initialized. Call connectToDatabase first.');
    }
    return db;
};
exports.getDb = getDb;
