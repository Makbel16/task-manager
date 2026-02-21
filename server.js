// Load environment variables FIRST
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const { connectToDatabase } = require('./db');
const { ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// Debug: Check if environment variables are loaded
console.log('✅ Server starting...');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Found ✓' : 'Not found ✗');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? 'Found ✓' : 'Not found ✗');

// ==================== MIDDLEWARE - ORDER IS CRITICAL ====================

// Trust proxy - required for Vercel
app.set('trust proxy', 1);

// 1. CORS middleware first
app.use(cors({
    origin: 'https://task-manager-beta-green-62.vercel.app',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 2. JSON parser for API requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Static files middleware
app.use(express.static('public'));

// ==================== EXPLICIT STATIC FILE ROUTES ====================
// Serve CSS files explicitly
app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'style.css'));
});
app.get('/login.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.css'));
});
app.get('/signup.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.css'));
});
app.get('/dashb.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashb.css'));
});

// Serve JavaScript files explicitly
app.get('/auth.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'auth.js'));
});
app.get('/dashboard.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.js'));
});
app.get('/script.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'script.js'));
});

// Serve images explicitly
app.get('/image1.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'image1.png'));
});
// ==================== END EXPLICIT ROUTES ====================

// 4. Logging middleware (for debugging)
app.use((req, res, next) => {
    console.log(`📝 ${req.method} ${req.url} - Session: ${req.sessionID || 'none'}`);
    next();
});

// ==================== SESSION MIDDLEWARE - FIXED FOR VERCEL ====================
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true, // Vercel uses HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'none', // Allow cross-site requests
        domain: '.vercel.app' // Share cookie across vercel.app subdomains
    }
}));

// Session debug middleware
app.use((req, res, next) => {
    console.log('🔍 Session Debug:', {
        sessionID: req.sessionID,
        userId: req.session.userId,
        cookie: req.session.cookie
    });
    next();
});

// ==================== HTML ROUTES ====================

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve signup page
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Serve dashboard page (with auth check)
app.get('/dashboard', (req, res) => {
    console.log('🚪 Dashboard access attempt - User ID:', req.session.userId);
    if (!req.session.userId) {
        console.log('⛔ Unauthenticated access to dashboard, redirecting to login');
        return res.redirect('/login');
    }
    console.log('✅ Authenticated access to dashboard');
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ==================== API ROOT ROUTE ====================
app.get('/api', (req, res) => {
    res.json({ 
        message: 'TaskFlow API is running',
        endpoints: {
            auth: '/api/auth/*',
            tasks: '/api/tasks'
        }
    });
});

// ==================== TEST SESSION ENDPOINT ====================
app.get('/api/test-session', (req, res) => {
    res.json({
        sessionID: req.sessionID,
        userId: req.session.userId,
        session: req.session,
        cookies: req.headers.cookie
    });
});

// ==================== AUTHENTICATION MIDDLEWARE ====================
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
}

// ==================== AUTH ROUTES ====================

// Signup
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        const db = await connectToDatabase();
        const usersCollection = db.collection('users');
        
        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = {
            username,
            email,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };
        
        const result = await usersCollection.insertOne(newUser);
        
        res.status(201).json({ 
            message: 'User created successfully',
            user: {
                id: result.insertedId.toString(),
                username,
                email
            }
        });
        
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Failed to create account' });
    }
});

// Login - FIXED with session
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        const db = await connectToDatabase();
        const usersCollection = db.collection('users');
        
        const user = await usersCollection.findOne({ email });
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Set session
        req.session.userId = user._id.toString();
        req.session.username = user.username;
        
        // Save session explicitly
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ error: 'Failed to create session' });
            }
            
            console.log('✅ Session created for user:', email);
            console.log('Session ID:', req.sessionID);
            console.log('User ID:', req.session.userId);
            
            res.json({ 
                message: 'Login successful',
                user: {
                    id: user._id.toString(),
                    username: user.username,
                    email: user.email
                }
            });
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to logout' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Logout successful' });
    });
});

// Get current user
app.get('/api/auth/me', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const db = await connectToDatabase();
        const usersCollection = db.collection('users');
        
        const user = await usersCollection.findOne({ 
            _id: new ObjectId(req.session.userId) 
        });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            id: user._id.toString(),
            username: user.username,
            email: user.email
        });
        
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// ==================== TASK ROUTES ====================

// Get all tasks
app.get('/api/tasks', isAuthenticated, async (req, res) => {
    try {
        const db = await connectToDatabase();
        const tasksCollection = db.collection('tasks');
        
        const tasks = await tasksCollection
            .find({ userId: req.session.userId })
            .sort({ createdAt: -1 })
            .toArray();
        
        const formattedTasks = tasks.map(task => ({
            id: task._id.toString(),
            title: task.title,
            description: task.description || '',
            priority: task.priority || 'medium',
            category: task.category || 'general',
            dueDate: task.dueDate || null,
            completed: task.completed || false,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        }));
        
        res.json(formattedTasks);
        
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// Get single task
app.get('/api/tasks/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const db = await connectToDatabase();
        const tasksCollection = db.collection('tasks');
        
        const task = await tasksCollection.findOne({ 
            _id: new ObjectId(id),
            userId: req.session.userId 
        });
        
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        res.json({
            id: task._id.toString(),
            title: task.title,
            description: task.description || '',
            priority: task.priority || 'medium',
            category: task.category || 'general',
            dueDate: task.dueDate || null,
            completed: task.completed || false,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        });
        
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ error: 'Failed to fetch task' });
    }
});

// Create task
app.post('/api/tasks', isAuthenticated, async (req, res) => {
    try {
        const { title, description, priority, dueDate, category } = req.body;
        
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Title is required' });
        }
        
        const db = await connectToDatabase();
        const tasksCollection = db.collection('tasks');
        
        const newTask = {
            userId: req.session.userId,
            title: title.trim(),
            description: description?.trim() || '',
            priority: priority || 'medium',
            category: category || 'general',
            dueDate: dueDate || null,
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        const result = await tasksCollection.insertOne(newTask);
        
        res.status(201).json({
            id: result.insertedId.toString(),
            ...newTask
        });
        
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Update task
app.put('/api/tasks/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        delete updates.id;
        delete updates._id;
        
        updates.updatedAt = new Date().toISOString();
        
        const db = await connectToDatabase();
        const tasksCollection = db.collection('tasks');
        
        const result = await tasksCollection.updateOne(
            { 
                _id: new ObjectId(id),
                userId: req.session.userId 
            },
            { $set: updates }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        const updatedTask = await tasksCollection.findOne({ _id: new ObjectId(id) });
        
        res.json({
            id: updatedTask._id.toString(),
            title: updatedTask.title,
            description: updatedTask.description,
            priority: updatedTask.priority,
            category: updatedTask.category,
            dueDate: updatedTask.dueDate,
            completed: updatedTask.completed,
            createdAt: updatedTask.createdAt,
            updatedAt: updatedTask.updatedAt
        });
        
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// Delete task
app.delete('/api/tasks/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        
        const db = await connectToDatabase();
        const tasksCollection = db.collection('tasks');
        
        const result = await tasksCollection.deleteOne({ 
            _id: new ObjectId(id),
            userId: req.session.userId 
        });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        res.json({ message: 'Task deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// ==================== EXPORT FOR VERCEL ====================
module.exports = app;

// Only listen locally
if (!process.env.VERCEL) {
    connectToDatabase().then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    }).catch(error => {
        console.error('❌ Failed to start server:', error);
    });
}