-- ====================================================================
-- GitHub Profile Analyzer - Database Schema
-- ====================================================================

CREATE DATABASE IF NOT EXISTS github_analyzer
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE github_analyzer;

CREATE TABLE IF NOT EXISTS profiles (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  -- Core GitHub identity
  github_id             BIGINT UNSIGNED NOT NULL,
  username              VARCHAR(100) NOT NULL,
  name                  VARCHAR(255) DEFAULT NULL,
  avatar_url            TEXT DEFAULT NULL,
  bio                   TEXT DEFAULT NULL,
  company               VARCHAR(255) DEFAULT NULL,
  location              VARCHAR(255) DEFAULT NULL,
  blog                  VARCHAR(500) DEFAULT NULL,
  twitter_username      VARCHAR(100) DEFAULT NULL,
  profile_url           VARCHAR(500) DEFAULT NULL,
  email                 VARCHAR(255) DEFAULT NULL,

  -- Raw GitHub counters
  public_repos          INT UNSIGNED DEFAULT 0,
  public_gists          INT UNSIGNED DEFAULT 0,
  followers             INT UNSIGNED DEFAULT 0,
  following             INT UNSIGNED DEFAULT 0,

  -- Derived insights (computed by this service)
  total_stars           INT UNSIGNED DEFAULT 0,
  total_forks           INT UNSIGNED DEFAULT 0,
  avg_stars_per_repo     DECIMAL(10,2) DEFAULT 0,
  top_language          VARCHAR(50) DEFAULT NULL,
  language_breakdown    JSON DEFAULT NULL,          -- e.g. {"JavaScript": 12, "Python": 5}
  most_starred_repo     VARCHAR(255) DEFAULT NULL,
  most_starred_repo_stars INT UNSIGNED DEFAULT 0,
  followers_following_ratio DECIMAL(10,2) DEFAULT 0,
  account_age_days      INT UNSIGNED DEFAULT 0,
  is_active_recently    BOOLEAN DEFAULT FALSE,       -- pushed to a repo in the last 6 months
  repos_scanned         INT UNSIGNED DEFAULT 0,      -- how many repos were factored into the insights

  -- GitHub account timestamps
  github_created_at     DATETIME DEFAULT NULL,
  github_updated_at     DATETIME DEFAULT NULL,

  -- Bookkeeping
  last_analyzed_at      DATETIME DEFAULT NULL,
  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_username (username),
  KEY idx_followers (followers),
  KEY idx_total_stars (total_stars),
  KEY idx_last_analyzed_at (last_analyzed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
