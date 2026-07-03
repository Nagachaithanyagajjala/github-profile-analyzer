const express = require('express');
const controller = require('../controllers/profileController');

const router = express.Router();

// Trigger analysis of a GitHub username (fetches from GitHub + saves to MySQL)
router.post('/analyze/:username', controller.analyzeProfile);

// List all stored/analyzed profiles
router.get('/', controller.listProfiles);

// Get a single stored profile
router.get('/:username', controller.getProfile);

// Delete a stored profile
router.delete('/:username', controller.deleteProfile);

module.exports = router;
