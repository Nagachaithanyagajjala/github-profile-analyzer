require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./config/db');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`GitHub Profile Analyzer API running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    console.error('Check your MySQL connection settings in .env');
    process.exit(1);
  }
}

start();
