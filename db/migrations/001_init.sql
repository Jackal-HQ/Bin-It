CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE cities (
    id serial PRIMARY KEY,
    slug text UNIQUE NOT NULL,
    name text NOT NULL,
    center geography(Point, 4326) NOT NULL,
    bbox double precision []
);
CREATE TABLE tickets (
    id text PRIMARY KEY,
    city_id int REFERENCES cities(id),
    centroid geography(Point, 4326) NOT NULL,
    label text,
    max_severity int DEFAULT 0,
    report_count int DEFAULT 1,
    status text DEFAULT 'received',
    first_seen timestamptz DEFAULT now(),
    last_seen timestamptz DEFAULT now()
);
CREATE TABLE reports (
    id text PRIMARY KEY,
    city_id int REFERENCES cities(id),
    ticket_id text REFERENCES tickets(id),
    geom geography(Point, 4326) NOT NULL,
    photo_url text,
    note text,
    label text,
    severity int,
    embedding vector(512),
    device_id text,
    is_synthetic boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);
CREATE TABLE bins (
    id serial PRIMARY KEY,
    city_id int REFERENCES cities(id),
    geom geography(Point, 4326) NOT NULL,
    source text NOT NULL -- osm, city or proposed
);
CREATE TABLE cell_scores (
    city_id int REFERENCES cities(id),
    h3_cell text,
    centroid geography(Point, 4326) NOT NULL,
    expected_overflow real,
    reports_per_1k real,
    under_reported boolean,
    demand real,
    computed_at timestamptz DEFAULT now(),
    PRIMARY KEY (city_id, h3_cell)
);
CREATE TABLE bin_candidates (
    id serial PRIMARY KEY,
    city_id int REFERENCES cities(id),
    geom geography(Point, 4326) NOT NULL,
    rank int,
    gain real,
    nearest_bin_m real,
    nearby_reports int,
    rationale text,
    computed_at timestamptz DEFAULT now()
);
CREATE INDEX ON reports USING gist (geom);
CREATE INDEX ON bins USING gist (geom);
CREATE INDEX ON cell_scores USING gist (centroid);
CREATE INDEX ON reports USING hnsw (embedding vector_cosine_ops);