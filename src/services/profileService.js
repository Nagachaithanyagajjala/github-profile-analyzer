const githubService = require('./githubService');
const profileModel = require('../models/profileModel');

/**
 * Analyze a GitHub username (fresh fetch from GitHub) and persist/update it in MySQL.
 */
async function analyzeAndStore(username) {
  const insights = await githubService.analyzeGithubUser(username);
  const savedProfile = await profileModel.upsertProfile(insights);
  return savedProfile;
}

/**
 * Get a single stored profile from the DB (no GitHub call).
 */
async function getStoredProfile(username) {
  return profileModel.findByUsername(username);
}

/**
 * List stored profiles with pagination/search/sort.
 */
async function listProfiles(query) {
  return profileModel.findAll(query);
}

async function deleteProfile(username) {
  return profileModel.deleteByUsername(username);
}

module.exports = {
  analyzeAndStore,
  getStoredProfile,
  listProfiles,
  deleteProfile,
};
