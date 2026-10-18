PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS elections (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, status TEXT NOT NULL,
  district_id TEXT, municipality TEXT, announced_on TEXT, voting_on TEXT,
  official_url TEXT NOT NULL, complete_candidates INTEGER NOT NULL DEFAULT 0,
  last_updated TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS districts (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, municipality TEXT, prefecture TEXT NOT NULL DEFAULT '沖縄県'
);
CREATE TABLE IF NOT EXISTS parties (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, kana TEXT, age INTEGER, official_site TEXT,
  affiliation TEXT, career_json TEXT, photo_path TEXT, photo_page INTEGER,
  photo_match_status TEXT NOT NULL DEFAULT 'unverified', photo_reuse_status TEXT NOT NULL DEFAULT 'pending_rights',
  profile_missing_json TEXT, profile_extraction_status TEXT NOT NULL DEFAULT 'not_attempted',
  x_url TEXT, x_source_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS candidacies (
  id TEXT PRIMARY KEY, election_id TEXT NOT NULL REFERENCES elections(id), candidate_id TEXT NOT NULL REFERENCES candidates(id),
  district_id TEXT REFERENCES districts(id), party_id TEXT REFERENCES parties(id), status TEXT NOT NULL, ballot_number INTEGER,
  UNIQUE(election_id,candidate_id)
);
CREATE TABLE IF NOT EXISTS candidacy_sources (
  candidacy_id TEXT NOT NULL REFERENCES candidacies(id), source_id TEXT NOT NULL REFERENCES sources(id),
  PRIMARY KEY(candidacy_id,source_id)
);
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY, url TEXT NOT NULL, title TEXT, source_type TEXT NOT NULL, excerpt TEXT,
  page_number INTEGER, retrieved_at TEXT NOT NULL, verified_at TEXT, verification_status TEXT NOT NULL,
  content_hash TEXT, UNIQUE(url,content_hash)
);
CREATE TABLE IF NOT EXISTS pledges (
  id TEXT PRIMARY KEY, candidacy_id TEXT NOT NULL REFERENCES candidacies(id), title TEXT, body TEXT NOT NULL,
  category TEXT, source_id TEXT NOT NULL REFERENCES sources(id), source_excerpt TEXT NOT NULL, source_page INTEGER,
  evidence_scope TEXT NOT NULL DEFAULT 'bulletin_excerpt',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS pledge_sources (
  pledge_id TEXT NOT NULL REFERENCES pledges(id), source_id TEXT NOT NULL REFERENCES sources(id),
  PRIMARY KEY(pledge_id,source_id)
);
CREATE TABLE IF NOT EXISTS collection_jobs (
  id TEXT PRIMARY KEY, status TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT,
  search_queries INTEGER NOT NULL DEFAULT 0, tokens INTEGER NOT NULL DEFAULT 0,
  processed INTEGER NOT NULL DEFAULT 0, estimated_cost_usd REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS collection_errors (
  id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES collection_jobs(id), stage TEXT NOT NULL,
  error_type TEXT NOT NULL, message TEXT NOT NULL, source_url TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS crawl_cache (
  url TEXT PRIMARY KEY, etag TEXT, last_modified TEXT, content BLOB NOT NULL, content_type TEXT,
  content_hash TEXT NOT NULL, last_checked TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS candidacies_election_idx ON candidacies(election_id);
CREATE INDEX IF NOT EXISTS sources_status_idx ON sources(verification_status);
