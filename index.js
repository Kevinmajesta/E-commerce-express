// Import environment variables
require('dotenv').config();

// Import express
const express = require('express');

// Import bodyParser
const bodyParser = require('body-parser');

// Import cors
const cors = require('cors');

// Import Mongoose database connection function
const connectDB = require('./database');

// Import Redis client (This import ensures Redis connection is initiated)
const redisClient = require('./database/redisClient');

// Import main router
const router = require('./routes');

// Initialize Express app
const app = express();

// Call function to connect to MongoDB
connectDB();

// Use CORS middleware
app.use(cors());

// Use body-parser to handle form data (urlencoded)
app.use(bodyParser.urlencoded({ extended: false }));

// Use body-parser to handle JSON data
app.use(bodyParser.json());

// Define port
const port = 3000;

// Simple route
app.get('/', (req, res) => {
  // Pesan ini akan menunjukkan bahwa server terhubung ke MongoDB DAN Redis
  res.send('Hello World! Server terhubung dengan MongoDB dan Redis.');
});

// Define API routes
app.use('/api', router);

// Start server
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});