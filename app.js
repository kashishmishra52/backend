const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const User = require('./models/user'); // Ensure this path is correct for your User model
require('./config/db'); // Ensure your database connection is set up correctly

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true }, // Secure and httpOnly in production
}));

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user || null });
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', async (req, res) => {
    const { username, email, password, confirmpassword } = req.body;

    // Basic validation
    if (password !== confirmpassword) {
        return res.status(400).send('Passwords do not match');
    }

    if (!email || !password || !username) {
        return res.status(400).send('All fields are required');
    }

    try {
        // Normalize the email to lowercase
        const normalizedEmail = email.toLowerCase();

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).send('Email already registered');
        }

        const newUser = new User({ username, email: normalizedEmail, password });
        await newUser.save();
        res.redirect('/login');
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).send('Internal server error');
    }
});



app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
        return res.status(400).send('Both email and password are required');
    }

    try {
        // Normalize email to lowercase
        const normalizedEmail = email.toLowerCase();

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(400).send('User not found');
        }

        // Log the entered and stored passwords for debugging

        // Compare the entered password directly with the stored password
        if (password !== user.password) {
            return res.status(400).send('Incorrect password');
        }

        // Store minimal user info in session
        req.session.user = { id: user._id, username: user.username };
        res.redirect('/index');
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).send('Internal server error');
    }
});



app.get('/index', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('index', { user: req.session.user });
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Internal server error');
        }
        res.redirect('/');
    });
});

// Error handling for 404
app.use((req, res) => {
    res.status(404).send('Page not found');
});

// Start the server
const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

