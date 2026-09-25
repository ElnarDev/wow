CREATE TABLE IF NOT EXISTS connected_realms (
  id BIGINT PRIMARY KEY,
  region TEXT NOT NULL DEFAULT 'us' CHECK (region = 'us'),
  display_name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  comparison_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_default_us_realm ON connected_realms (region) WHERE is_default;
CREATE TABLE IF NOT EXISTS realms (
  id BIGINT PRIMARY KEY,
  connected_realm_id BIGINT NOT NULL REFERENCES connected_realms(id),
  region TEXT NOT NULL DEFAULT 'us' CHECK (region = 'us'),
  slug TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS realms_slug_region_idx ON realms (region, slug);
CREATE UNIQUE INDEX IF NOT EXISTS one_default_us_visible_realm ON realms (region) WHERE is_default;
CREATE TABLE IF NOT EXISTS ingestion_runs (
  id BIGSERIAL PRIMARY KEY,
  connected_realm_id BIGINT REFERENCES connected_realms(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
  source_last_modified TIMESTAMPTZ,
  error_summary TEXT
);
CREATE TABLE IF NOT EXISTS items (
  id BIGINT PRIMARY KEY, name TEXT NOT NULL, item_class_id INTEGER NOT NULL,
  item_subclass_id INTEGER, inventory_type TEXT, item_level INTEGER, required_level INTEGER,
  quality_type TEXT, quality_rank INTEGER, expansion_id INTEGER, name_es_mx TEXT,
  metadata_fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS items_armor_filters_idx ON items (item_class_id, expansion_id, quality_rank, item_level);
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS items_name_es_mx_search_idx ON items USING GIN (name_es_mx gin_trgm_ops);
CREATE TABLE IF NOT EXISTS price_snapshots (
  ingestion_run_id BIGINT NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  item_id BIGINT NOT NULL REFERENCES items(id), min_buyout_copper BIGINT NOT NULL,
  quantity BIGINT NOT NULL, listing_count INTEGER NOT NULL,
  PRIMARY KEY (ingestion_run_id, item_id)
);
CREATE INDEX IF NOT EXISTS price_snapshots_item_run_idx ON price_snapshots (item_id, ingestion_run_id DESC);

CREATE TABLE IF NOT EXISTS auction_variants (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES items(id),
  variant_key TEXT NOT NULL,
  item_context INTEGER,
  bonus_list_ids INTEGER[] NOT NULL DEFAULT '{}',
  modifiers JSONB NOT NULL DEFAULT '[]',
  tertiary_stats INTEGER[] NOT NULL DEFAULT '{}',
  effective_item_level INTEGER,
  UNIQUE (item_id, variant_key)
);
CREATE TABLE IF NOT EXISTS variant_price_snapshots (
  ingestion_run_id BIGINT NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  variant_id BIGINT NOT NULL REFERENCES auction_variants(id),
  min_buyout_copper BIGINT NOT NULL,
  quantity BIGINT NOT NULL,
  listing_count INTEGER NOT NULL,
  PRIMARY KEY (ingestion_run_id, variant_id)
);
CREATE INDEX IF NOT EXISTS variant_price_snapshots_variant_run_idx ON variant_price_snapshots (variant_id, ingestion_run_id DESC);
CREATE INDEX IF NOT EXISTS auction_variants_tertiary_stats_idx ON auction_variants USING GIN (tertiary_stats);
CREATE INDEX IF NOT EXISTS auction_variants_effective_level_idx ON auction_variants (effective_item_level);
CREATE TABLE IF NOT EXISTS variant_price_levels (
  ingestion_run_id BIGINT NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  variant_id BIGINT NOT NULL REFERENCES auction_variants(id),
  unit_price_copper BIGINT NOT NULL,
  quantity BIGINT NOT NULL,
  listing_count INTEGER NOT NULL,
  PRIMARY KEY (ingestion_run_id, variant_id, unit_price_copper)
);
CREATE INDEX IF NOT EXISTS variant_price_levels_variant_run_idx ON variant_price_levels (variant_id, ingestion_run_id DESC, unit_price_copper);
CREATE TABLE IF NOT EXISTS market_item_summaries (
  ingestion_run_id BIGINT NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  item_id BIGINT NOT NULL REFERENCES items(id), variant_id BIGINT NOT NULL REFERENCES auction_variants(id),
  effective_item_level INTEGER, min_buyout_copper BIGINT NOT NULL, quantity BIGINT NOT NULL, listing_count INTEGER NOT NULL,
  PRIMARY KEY (ingestion_run_id, item_id)
);
CREATE INDEX IF NOT EXISTS market_item_summaries_run_sort_idx ON market_item_summaries (ingestion_run_id, min_buyout_copper, quantity, listing_count);
CREATE TABLE IF NOT EXISTS wow_token_snapshots (
  id BIGSERIAL PRIMARY KEY,
  price_copper BIGINT NOT NULL,
  provider_updated_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS wow_token_snapshots_captured_at_idx ON wow_token_snapshots (captured_at DESC);
