// db.js - MongoDB connection utility
const { MongoClient } = require('mongodb');

// Get connection string from environment variable
const uri = process.env.MONGODB_URI;
let client;
let db;

async function connectToDatabase() {
    // If already connected, return the connection
    if (db) {
        console.log('✅ Using existing database connection');
        return db;
    }
    
    // Check if URI exists
    if (!uri) {
        console.error('❌ MONGODB_URI is not defined in environment variables');
        console.error('Available env vars:', Object.keys(process.env).join(', '));
        throw new Error('MONGODB_URI not found. Please check your .env file');
    }
    
    console.log('🔄 Connecting to MongoDB...');
    console.log('URI starts with:', uri.substring(0, 30) + '...');
    
    try {
        // Create a new MongoDB client with timeout options
        client = new MongoClient(uri, {
            connectTimeoutMS: 10000,
            serverSelectionTimeoutMS: 10000
        });
        
        // Connect to the MongoDB cluster
        await client.connect();
        console.log('✅ Connected to MongoDB successfully');
        
        // Select the database (named 'taskflow')
        db = client.db('taskflow');
        console.log('✅ Using database: taskflow');
        
        // Test connection by listing collections
        try {
            const collections = await db.listCollections().toArray();
            console.log('📚 Available collections:', collections.map(c => c.name).join(', ') || 'none');
        } catch (listError) {
            console.log('⚠️ Could not list collections:', listError.message);
        }
        
        // Create indexes for better performance
        try {
            await db.collection('users').createIndex({ email: 1 }, { unique: true });
            console.log('✅ Created/verified email index on users collection');
        } catch (e) {
            console.log('ℹ️ Email index already exists or could not be created:', e.message);
        }
        
        try {
            await db.collection('tasks').createIndex({ userId: 1 });
            console.log('✅ Created/verified userId index on tasks collection');
        } catch (e) {
            console.log('ℹ️ UserId index already exists or could not be created');
        }
        
        return db;
    } catch (error) {
        console.error('❌❌❌ MongoDB connection error ❌❌❌');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error stack:', error.stack);
        
        // Specific error handling
        if (error.name === 'MongoServerSelectionError') {
            console.error('⚠️ Could not reach MongoDB server. Check:');
            console.error('   1. Network connection to the internet');
            console.error('   2. MongoDB Atlas IP whitelist - add 0.0.0.0/0');
            console.error('   3. Username/password in connection string is correct');
            console.error('   4. Cluster is running (check MongoDB Atlas dashboard)');
        } else if (error.name === 'MongoParseError') {
            console.error('⚠️ Connection string is malformed. Check:');
            console.error('   1. No spaces in the connection string');
            console.error('   2. Password doesn\'t contain special characters that need escaping');
            console.error('   3. Format is correct: mongodb+srv://username:password@cluster...');
        } else if (error.code === 18 || error.message.includes('authentication')) {
            console.error('⚠️ Authentication failed. Check:');
            console.error('   1. Username is correct');
            console.error('   2. Password is correct');
            console.error('   3. Database user has appropriate permissions');
        }
        
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