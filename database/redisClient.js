// database/redisClient.js

const redis = require('redis');

// Get Redis configuration from environment variables
const redisHost = process.env.REDIS_HOST ;
const redisPort = process.env.REDIS_PORT;

const redisClient = redis.createClient({
  socket: {
    host: redisHost,
    port: redisPort,
  }
});

redisClient.on('connect', () => console.log('Connected to Redis!'));
redisClient.on('error', err => console.error('Redis Client Error:', err));

// Connect to Redis when this module is required
(async () => {
  await redisClient.connect();
})();

module.exports = redisClient;