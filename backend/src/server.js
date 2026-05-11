const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/import', require('./routes/import'));
app.use('/api/history', require('./routes/history'));
app.use('/api/data', require('./routes/data'));
app.use('/api/metas', require('./routes/metas'));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

// Serve static files from the frontend directory as root
const frontendPath = path.join(__dirname, '../../frontend');

app.get('/sw.js', (req, res) => {
    res.sendFile(path.join(frontendPath, 'sw.js'));
});

app.get('/manifest.json', (req, res) => {
    res.sendFile(path.join(frontendPath, 'manifest.json'));
});

app.use(express.static(frontendPath));



app.listen(PORT, (err) => {
    if (err) {
        console.error('Failed to start server:', err);
    } else {
        console.log(`🚀 Server is running on port ${PORT}`);
        console.log(`📂 Serving frontend from: ${frontendPath}`);
    }
});
