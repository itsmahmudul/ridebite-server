import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectToDatabase } from './config/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
connectToDatabase();

// Basic route
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'RideBite Server is running!',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚗 RideBite Server running on port ${PORT}`);
});