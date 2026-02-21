// db.js - MongoDB connection utility
const { MongoClient } = require('mongodb');

// Get connection string from environment variable
const uri = process.env.MONGODB_URI;
let client;
let db;

async function connectToDatabase() {
    // If already connected, return the connection
    if (db) {
        return db;
    }
    
    // Check if URI exists
    if (!uri) {
        console.error('❌ MONGODB_URI is not defined in environment variables');
        throw new Error('MONGODB_URI not found. Please check your .env file');
    }
    
    try {
        console.log('🔄 Connecting to MongoDB...');
        
        // Create a new MongoDB client
        client = new MongoClient(uri);
        
        // Connect to the MongoDB cluster
        await client.connect();
        console.log('✅ Connected to MongoDB successfully');
        
        // Select the database (named 'taskflow')
        db = client.db('taskflow');
        
        // Create indexes for better performance (optional)
        try {
            await db.collection('users').createIndex({ email: 1 }, { unique: true });
        } catch (e) {
            // Index might already exist
        }
        
        return db;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        throw error;
    }
}

// Function to close connection
async function closeConnection() {
    if (client) {
        await client.close();
        console.log('MongoDB connection closed');
    }
}

module.exports = { 
    connectToDatabase, 
    closeConnection 
};