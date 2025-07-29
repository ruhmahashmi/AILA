DROP TABLE IF EXISTS lecture_processing;

CREATE TABLE lecture_processing (
    id TEXT PRIMARY KEY,
    course_id TEXT,
    file_name TEXT,
    week INTEGER,
    status TEXT,
    progress INTEGER,
    result TEXT,
    error TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE knowledge_graph (
    id VARCHAR(36) PRIMARY KEY,
    course_id VARCHAR(36),
    week INTEGER,
    node_data TEXT,
    edge_data TEXT
);
