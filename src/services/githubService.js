const axios = require('axios');

const GITHUB_API_BASE = 'https://api.github.com';
const REPO_SCAN_LIMIT = Number(process.env.GITHUB_REPO_SCAN_LIMIT) || 300;

function buildHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'github-profile-analyzer-app',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

class GitHubApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'GitHubApiError';
    this.statusCode = statusCode;
  }
}

/**
 * Fetch the raw public profile for a GitHub username.
 */
async function fetchGithubUser(username) {
  try {
    const { data } = await axios.get(`${GITHUB_API_BASE}/users/${encodeURIComponent(username)}`, {
      headers: buildHeaders(),
    });
    return data;
  } catch (err) {
    if (err.response) {
      if (err.response.status === 404) {
        throw new GitHubApiError(`GitHub user '${username}' not found.`, 404);
      }
      if (err.response.status === 403) {
        throw new GitHubApiError(
          'GitHub API rate limit exceeded. Add a GITHUB_TOKEN to increase your limit.',
          429
        );
      }
      throw new GitHubApiError(`GitHub API error: ${err.response.status}`, err.response.status);
    }
    throw new GitHubApiError('Unable to reach GitHub API.', 502);
  }
}

/**
 * Fetch all public repos for a user, paginated, up to REPO_SCAN_LIMIT.
 */
async function fetchAllRepos(username) {
  const repos = [];
  let page = 1;
  const perPage = 100;

  while (repos.length < REPO_SCAN_LIMIT) {
    const { data } = await axios.get(
      `${GITHUB_API_BASE}/users/${encodeURIComponent(username)}/repos`,
      {
        headers: buildHeaders(),
        params: { per_page: perPage, page, sort: 'updated' },
      }
    );

    if (!data.length) break;
    repos.push(...data);
    if (data.length < perPage) break; // last page
    page += 1;
  }

  return repos.slice(0, REPO_SCAN_LIMIT);
}

/**
 * Compute derived insights from a user's repo list.
 */
function computeRepoInsights(repos) {
  let totalStars = 0;
  let totalForks = 0;
  const languageCounts = {};
  let mostStarredRepo = null;
  let mostStarredRepoStars = -1;
  let mostRecentPush = null;

  for (const repo of repos) {
    if (repo.fork) continue; // don't count forked repos toward "your" stats

    totalStars += repo.stargazers_count || 0;
    totalForks += repo.forks_count || 0;

    if (repo.language) {
      languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
    }

    if ((repo.stargazers_count || 0) > mostStarredRepoStars) {
      mostStarredRepoStars = repo.stargazers_count || 0;
      mostStarredRepo = repo.name;
    }

    if (repo.pushed_at) {
      const pushedDate = new Date(repo.pushed_at);
      if (!mostRecentPush || pushedDate > mostRecentPush) {
        mostRecentPush = pushedDate;
      }
    }
  }

  const nonForkCount = repos.filter((r) => !r.fork).length;
  const topLanguage =
    Object.entries(languageCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const isActiveRecently = mostRecentPush ? mostRecentPush > sixMonthsAgo : false;

  return {
    totalStars,
    totalForks,
    avgStarsPerRepo: nonForkCount > 0 ? Number((totalStars / nonForkCount).toFixed(2)) : 0,
    topLanguage,
    languageBreakdown: languageCounts,
    mostStarredRepo,
    mostStarredRepoStars: mostStarredRepoStars < 0 ? 0 : mostStarredRepoStars,
    isActiveRecently,
    reposScanned: repos.length,
  };
}

function computeAccountAgeDays(createdAt) {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  const now = new Date();
  return Math.max(0, Math.floor((now - created) / (1000 * 60 * 60 * 24)));
}

/**
 * Full analysis pipeline: fetch profile + repos, then merge into one insights object.
 */
async function analyzeGithubUser(username) {
  const user = await fetchGithubUser(username);
  const repos = await fetchAllRepos(username);
  const repoInsights = computeRepoInsights(repos);
  const accountAgeDays = computeAccountAgeDays(user.created_at);
  const followersFollowingRatio =
    user.following > 0 ? Number((user.followers / user.following).toFixed(2)) : user.followers;

  return {
    github_id: user.id,
    username: user.login,
    name: user.name,
    avatar_url: user.avatar_url,
    bio: user.bio,
    company: user.company,
    location: user.location,
    blog: user.blog,
    twitter_username: user.twitter_username,
    profile_url: user.html_url,
    email: user.email,

    public_repos: user.public_repos || 0,
    public_gists: user.public_gists || 0,
    followers: user.followers || 0,
    following: user.following || 0,

    total_stars: repoInsights.totalStars,
    total_forks: repoInsights.totalForks,
    avg_stars_per_repo: repoInsights.avgStarsPerRepo,
    top_language: repoInsights.topLanguage,
    language_breakdown: repoInsights.languageBreakdown,
    most_starred_repo: repoInsights.mostStarredRepo,
    most_starred_repo_stars: repoInsights.mostStarredRepoStars,
    followers_following_ratio: followersFollowingRatio,
    account_age_days: accountAgeDays,
    is_active_recently: repoInsights.isActiveRecently,
    repos_scanned: repoInsights.reposScanned,

    github_created_at: user.created_at ? new Date(user.created_at) : null,
    github_updated_at: user.updated_at ? new Date(user.updated_at) : null,
  };
}

module.exports = {
  GitHubApiError,
  fetchGithubUser,
  fetchAllRepos,
  analyzeGithubUser,
};
