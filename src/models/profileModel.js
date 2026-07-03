const { pool } = require('../config/db');

/**
 * Insert a new profile, or update it if the username already exists.
 * Returns the profile row after the write.
 */
async function upsertProfile(insights) {
  const sql = `
    INSERT INTO profiles (
      github_id, username, name, avatar_url, bio, company, location, blog,
      twitter_username, profile_url, email,
      public_repos, public_gists, followers, following,
      total_stars, total_forks, avg_stars_per_repo, top_language, language_breakdown,
      most_starred_repo, most_starred_repo_stars, followers_following_ratio,
      account_age_days, is_active_recently, repos_scanned,
      github_created_at, github_updated_at, last_analyzed_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, NOW()
    )
    ON DUPLICATE KEY UPDATE
      github_id = VALUES(github_id),
      name = VALUES(name),
      avatar_url = VALUES(avatar_url),
      bio = VALUES(bio),
      company = VALUES(company),
      location = VALUES(location),
      blog = VALUES(blog),
      twitter_username = VALUES(twitter_username),
      profile_url = VALUES(profile_url),
      email = VALUES(email),
      public_repos = VALUES(public_repos),
      public_gists = VALUES(public_gists),
      followers = VALUES(followers),
      following = VALUES(following),
      total_stars = VALUES(total_stars),
      total_forks = VALUES(total_forks),
      avg_stars_per_repo = VALUES(avg_stars_per_repo),
      top_language = VALUES(top_language),
      language_breakdown = VALUES(language_breakdown),
      most_starred_repo = VALUES(most_starred_repo),
      most_starred_repo_stars = VALUES(most_starred_repo_stars),
      followers_following_ratio = VALUES(followers_following_ratio),
      account_age_days = VALUES(account_age_days),
      is_active_recently = VALUES(is_active_recently),
      repos_scanned = VALUES(repos_scanned),
      github_created_at = VALUES(github_created_at),
      github_updated_at = VALUES(github_updated_at),
      last_analyzed_at = NOW();
  `;

  const params = [
    insights.github_id,
    insights.username,
    insights.name,
    insights.avatar_url,
    insights.bio,
    insights.company,
    insights.location,
    insights.blog,
    insights.twitter_username,
    insights.profile_url,
    insights.email,
    insights.public_repos,
    insights.public_gists,
    insights.followers,
    insights.following,
    insights.total_stars,
    insights.total_forks,
    insights.avg_stars_per_repo,
    insights.top_language,
    JSON.stringify(insights.language_breakdown || {}),
    insights.most_starred_repo,
    insights.most_starred_repo_stars,
    insights.followers_following_ratio,
    insights.account_age_days,
    insights.is_active_recently,
    insights.repos_scanned,
    insights.github_created_at,
    insights.github_updated_at,
  ];

  await pool.query(sql, params);
  return findByUsername(insights.username);
}

async function findByUsername(username) {
  const [rows] = await pool.query('SELECT * FROM profiles WHERE username = ? LIMIT 1', [
    username,
  ]);
  return rows[0] || null;
}

async function deleteByUsername(username) {
  const [result] = await pool.query('DELETE FROM profiles WHERE username = ?', [username]);
  return result.affectedRows > 0;
}

/**
 * Paginated list with optional search-by-username and sorting.
 */
async function findAll({ page = 1, limit = 10, search = '', sortBy = 'created_at', order = 'DESC' }) {
  const allowedSortColumns = [
    'created_at',
    'followers',
    'public_repos',
    'total_stars',
    'username',
    'account_age_days',
  ];
  const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const offset = (page - 1) * limit;

  const whereClause = search ? 'WHERE username LIKE ?' : '';
  const searchParam = `%${search}%`;

  const [rows] = await pool.query(
    `SELECT * FROM profiles ${whereClause} ORDER BY ${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`,
    search ? [searchParam, Number(limit), Number(offset)] : [Number(limit), Number(offset)]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM profiles ${whereClause}`,
    search ? [searchParam] : []
  );

  return {
    data: rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / limit),
    },
  };
}

module.exports = {
  upsertProfile,
  findByUsername,
  deleteByUsername,
  findAll,
};
