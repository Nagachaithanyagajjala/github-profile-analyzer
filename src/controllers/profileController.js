const profileService = require('../services/profileService');

const USERNAME_REGEX = /^[a-zA-Z0-9-]{1,39}$/;

function validateUsername(username) {
  return typeof username === 'string' && USERNAME_REGEX.test(username);
}

/**
 * POST /api/profiles/analyze/:username
 * Fetches fresh data from GitHub, computes insights, saves/updates in MySQL.
 */
async function analyzeProfile(req, res, next) {
  try {
    const { username } = req.params;
    if (!validateUsername(username)) {
      return res.status(400).json({ success: false, message: 'Invalid GitHub username format.' });
    }

    const profile = await profileService.analyzeAndStore(username);
    return res.status(200).json({ success: true, data: profile });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/profiles
 * Lists all stored profiles. Supports ?page=&limit=&search=&sortBy=&order=
 */
async function listProfiles(req, res, next) {
  try {
    const { page = 1, limit = 10, search = '', sortBy = 'created_at', order = 'DESC' } = req.query;

    const parsedLimit = Math.min(Number(limit) || 10, 100); // cap page size
    const parsedPage = Math.max(Number(page) || 1, 1);

    const result = await profileService.listProfiles({
      page: parsedPage,
      limit: parsedLimit,
      search: String(search).trim(),
      sortBy,
      order,
    });

    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/profiles/:username
 * Returns the stored (already-analyzed) profile from MySQL.
 */
async function getProfile(req, res, next) {
  try {
    const { username } = req.params;
    if (!validateUsername(username)) {
      return res.status(400).json({ success: false, message: 'Invalid GitHub username format.' });
    }

    const profile = await profileService.getStoredProfile(username);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: `No analyzed profile found for '${username}'. Try POST /api/profiles/analyze/${username} first.`,
      });
    }

    return res.status(200).json({ success: true, data: profile });
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/profiles/:username
 * Removes a stored profile.
 */
async function deleteProfile(req, res, next) {
  try {
    const { username } = req.params;
    const deleted = await profileService.deleteProfile(username);
    if (!deleted) {
      return res.status(404).json({ success: false, message: `No stored profile for '${username}'.` });
    }
    return res.status(200).json({ success: true, message: `Profile '${username}' deleted.` });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  analyzeProfile,
  listProfiles,
  getProfile,
  deleteProfile,
};
