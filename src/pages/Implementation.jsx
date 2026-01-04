import React, { useState } from 'react';
import { FileCode, Database, Zap, GitBranch, Server, CheckCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import CAOSBlueprint from '@/components/docs/CAOSBlueprint';

export default function Implementation() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <CAOSBlueprint />
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">CAOS-A1 Implementation Blueprints</h1>
          <p className="text-slate-400">v1.5 Architecture — External Python Service</p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-slate-800/50 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="structure">Structure</TabsTrigger>
            <TabsTrigger value="plane_b">Plane B</TabsTrigger>
            <TabsTrigger value="anchors">Anchors</TabsTrigger>
            <TabsTrigger value="api">API</TabsTrigger>
            <TabsTrigger value="schemas">Schemas</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Architecture Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="text-slate-300 space-y-4">
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                  <h3 className="text-lg font-semibold text-cyan-400 mb-2">Core Principles</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>SQLite (WAL) is the ONLY source of truth</li>
                    <li>All commits are atomic via single transaction</li>
                    <li>Server-side time authority (client time ignored)</li>
                    <li>JSONL is export-only, not authoritative</li>
                    <li>Two-phase ingestion (validate → commit)</li>
                  </ul>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                  <h3 className="text-lg font-semibold text-cyan-400 mb-2">Tech Stack (Locked)</h3>
                  <pre className="text-xs text-green-400 font-mono">
{`Language:     Python 3.11+
Framework:    FastAPI
Persistence:  SQLite (WAL mode)
Durability:   PRAGMA synchronous = FULL
Export:       Background JSONL streamer
Monitoring:   Prometheus metrics endpoint`}
                  </pre>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                  <h3 className="text-lg font-semibold text-cyan-400 mb-2">Integration with Base44</h3>
                  <p className="text-sm">Base44 frontend calls:</p>
                  <pre className="text-xs text-yellow-400 font-mono mt-2 bg-slate-950 p-2 rounded">
{`POST https://your-caos-server.com/api/message
GET  https://your-caos-server.com/api/metrics/all
GET  https://your-caos-server.com/health`}
                  </pre>
                  <p className="text-sm mt-2 text-slate-400">
                    Frontend supplies: message, session, user, images, file_urls<br/>
                    Backend supplies: timestamps, record_ids, sequences
                  </p>
                </div>

                <div className="bg-amber-900/20 border border-amber-600/50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-amber-400 mb-2">⚠️ Implementation Order (Mandatory)</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>plane_b.py — Foundation (SQLite, schema, transactions)</li>
                    <li>anchors.py — Registry, picker, normalization</li>
                    <li>anchor_maps.py — Indexing layer</li>
                    <li>amendments.py — Versioning + latest_valid</li>
                    <li>context.py — Context resolution</li>
                    <li>export.py — JSONL background exporter</li>
                    <li>main.py — FastAPI integration</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PROJECT STRUCTURE */}
          <TabsContent value="structure">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-blue-400" />
                  Project Structure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <pre className="text-sm text-green-400 font-mono bg-slate-950 p-4 rounded">
{`caos-a1-backend/
├── README.md
├── requirements.txt          # FastAPI, SQLAlchemy, Pydantic
├── .env.example
├── config.py                 # Environment config
│
├── caos_core/
│   ├── __init__.py
│   │
│   ├── plane_b.py           # ⭐ START HERE
│   │   # SQLite schema
│   │   # WAL configuration
│   │   # Transaction wrapper
│   │   # Record insert (atomic)
│   │   # Server-side timestamps
│   │   # Sequence generation
│   │   # Amendment support
│   │
│   ├── anchors.py
│   │   # Anchor registry (classes)
│   │   # Anchor picker (from message)
│   │   # Normalization rules
│   │   # Phrase candidate gates
│   │   # Temporal scoping enforcement
│   │
│   ├── anchor_maps.py
│   │   # SQLite index tables
│   │   # anchor -> record_id mapping
│   │   # Intersection queries
│   │   # Rebuild logic (shadow tables)
│   │
│   ├── amendments.py
│   │   # Amendment chain logic
│   │   # latest_valid pointer index
│   │   # Tombstone handling
│   │   # Atomic visibility flips
│   │
│   ├── context.py
│   │   # Context inheritance (session>project>user)
│   │   # Ambiguity detection
│   │   # pending_resolution lifecycle
│   │   # TTL expiry (7 days)
│   │
│   ├── export.py
│   │   # Background JSONL exporter
│   │   # Export cursor tracking
│   │   # Lag monitoring
│   │   # Idempotent replay
│   │
│   └── recall.py
│       # Explicit recall gate
│       # Intersection-only logic
│       # Confidence scoring
│       # NL -> anchor proposals
│
├── caos_api/
│   ├── __init__.py
│   │
│   ├── main.py              # FastAPI app
│   │   # POST /api/message
│   │   # GET /health
│   │   # GET /api/metrics/all
│   │   # Error handlers
│   │
│   ├── models.py            # Pydantic request/response models
│   ├── metrics.py           # Prometheus metrics
│   └── middleware.py        # CORS, logging
│
├── migrations/              # Schema migrations (Alembic)
│   ├── versions/
│   └── env.py
│
├── tests/
│   ├── test_plane_b.py
│   ├── test_anchors.py
│   ├── test_amendments.py
│   └── test_integration.py
│
└── scripts/
    ├── init_db.py           # Initialize SQLite with schema
    ├── export_to_jsonl.py   # Manual export trigger
    └── verify_integrity.py  # Parity checks

# Run locally:
$ python -m uvicorn caos_api.main:app --reload --port 8000

# Deploy:
$ docker build -t caos-a1 .
$ docker run -p 8000:8000 -v ./data:/data caos-a1`}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PLANE B */}
          <TabsContent value="plane_b">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-purple-400" />
                  plane_b.py — Foundation Module
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <pre className="text-xs text-slate-300 font-mono bg-slate-950 p-4 rounded">
{`"""
CAOS-A1 Plane B — Authoritative Storage Layer
SQLite is the ONLY source of truth. All commits are atomic.
"""
import sqlite3
from datetime import datetime, timezone
from typing import Optional, Dict, List, Any
from contextlib import contextmanager
import json

# ============================================================
# SQLite Schema (v1.0)
# ============================================================

SCHEMA_VERSION = 1

SQL_INIT = """
-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
);

-- Core records table (Plane B truth)
CREATE TABLE IF NOT EXISTS records (
    record_id TEXT PRIMARY KEY,
    lineage_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    seq INTEGER NOT NULL,
    
    -- Server-side frozen snapshot (write-start)
    ts_snapshot_iso TEXT NOT NULL,
    ts_snapshot_ms INTEGER NOT NULL,
    timezone TEXT NOT NULL,
    
    -- Metadata
    role TEXT NOT NULL,
    type TEXT NOT NULL,
    path TEXT,
    message TEXT NOT NULL,
    
    -- Amendment tracking
    superseded_by TEXT,
    status TEXT DEFAULT 'active', -- active, superseded, pending_resolution
    
    -- JSON fields
    anchors TEXT NOT NULL, -- JSON array
    meta TEXT,             -- JSON object
    
    created_at TEXT NOT NULL,
    
    UNIQUE(session_id, seq)
);

-- Session sequence counters
CREATE TABLE IF NOT EXISTS session_sequences (
    session_id TEXT PRIMARY KEY,
    last_seq INTEGER NOT NULL DEFAULT 0
);

-- Latest valid pointer (O(1) amendment resolution)
CREATE TABLE IF NOT EXISTS latest_valid (
    lineage_id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (record_id) REFERENCES records(record_id)
);

-- Amendment event log (rebuildable source)
CREATE TABLE IF NOT EXISTS amendment_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    lineage_id TEXT NOT NULL,
    old_record_id TEXT,
    new_record_id TEXT NOT NULL,
    ts_ms INTEGER NOT NULL
);

-- Export cursor (JSONL export tracking)
CREATE TABLE IF NOT EXISTS export_cursor (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_exported_seq INTEGER NOT NULL DEFAULT 0,
    last_export_ts TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_records_session ON records(session_id, seq);
CREATE INDEX IF NOT EXISTS idx_records_lineage ON records(lineage_id);
CREATE INDEX IF NOT EXISTS idx_records_status ON records(status);
CREATE INDEX IF NOT EXISTS idx_amendments ON amendment_events(lineage_id, ts_ms);
"""

# ============================================================
# Database Connection + WAL Configuration
# ============================================================

class PlaneB:
    def __init__(self, db_path: str = "./data/caos_plane_b.db"):
        self.db_path = db_path
        self._init_db()
    
    def _init_db(self):
        """Initialize database with v1.5 durability guarantees"""
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA synchronous = FULL")  # v1.5: truth-first
        conn.execute("PRAGMA foreign_keys = ON")
        
        # Initialize schema
        conn.executescript(SQL_INIT)
        
        # Record schema version
        conn.execute(
            "INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (?, ?)",
            (SCHEMA_VERSION, datetime.now(timezone.utc).isoformat())
        )
        
        # Initialize export cursor
        conn.execute(
            "INSERT OR IGNORE INTO export_cursor (id, last_exported_seq) VALUES (1, 0)"
        )
        
        conn.commit()
        conn.close()
    
    @contextmanager
    def transaction(self):
        """Atomic transaction wrapper. All commits go through here."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise
        finally:
            conn.close()
    
    # ============================================================
    # Phase 2: Atomic Commit (after validation)
    # ============================================================
    
    def commit_record(
        self,
        session_id: str,
        lineage_id: str,
        role: str,
        message: str,
        anchors: List[Dict[str, str]],
        record_type: str = "message",
        path: Optional[str] = None,
        meta: Optional[Dict] = None,
        status: str = "active"
    ) -> Dict[str, Any]:
        """
        Atomic record commit. Returns committed record.
        
        This is Phase 2 of two-phase ingestion.
        Phase 1 (validation) must occur BEFORE calling this.
        """
        with self.transaction() as conn:
            # Generate server-side timestamp (frozen at write-start)
            now = datetime.now(timezone.utc)
            ts_snapshot_iso = now.isoformat()
            ts_snapshot_ms = int(now.timestamp() * 1000)
            tz = "UTC"
            
            # Generate atomic sequence
            seq = self._next_seq(conn, session_id)
            
            # Generate record_id
            record_id = f"{session_id}_{seq}_{ts_snapshot_ms}"
            
            # Insert record
            conn.execute("""
                INSERT INTO records (
                    record_id, lineage_id, session_id, seq,
                    ts_snapshot_iso, ts_snapshot_ms, timezone,
                    role, type, path, message,
                    anchors, meta, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                record_id, lineage_id, session_id, seq,
                ts_snapshot_iso, ts_snapshot_ms, tz,
                role, record_type, path, message,
                json.dumps(anchors), json.dumps(meta or {}), status, ts_snapshot_iso
            ))
            
            # Update latest_valid pointer
            conn.execute("""
                INSERT OR REPLACE INTO latest_valid (lineage_id, record_id, updated_at)
                VALUES (?, ?, ?)
            """, (lineage_id, record_id, ts_snapshot_iso))
            
            # Log amendment event (if this supersedes something)
            # (For now, all records are new lineages)
            conn.execute("""
                INSERT INTO amendment_events (lineage_id, new_record_id, ts_ms)
                VALUES (?, ?, ?)
            """, (lineage_id, record_id, ts_snapshot_ms))
            
            return {
                "record_id": record_id,
                "lineage_id": lineage_id,
                "session_id": session_id,
                "seq": seq,
                "ts_snapshot_iso": ts_snapshot_iso,
                "ts_snapshot_ms": ts_snapshot_ms
            }
    
    def _next_seq(self, conn, session_id: str) -> int:
        """Generate next sequence for session (atomic)"""
        cursor = conn.execute(
            "SELECT last_seq FROM session_sequences WHERE session_id = ?",
            (session_id,)
        )
        row = cursor.fetchone()
        
        if row:
            next_seq = row[0] + 1
            conn.execute(
                "UPDATE session_sequences SET last_seq = ? WHERE session_id = ?",
                (next_seq, session_id)
            )
        else:
            next_seq = 1
            conn.execute(
                "INSERT INTO session_sequences (session_id, last_seq) VALUES (?, ?)",
                (session_id, next_seq)
            )
        
        return next_seq
    
    # ============================================================
    # Amendment Support
    # ============================================================
    
    def amend_record(
        self,
        old_record_id: str,
        new_message: str,
        new_anchors: List[Dict[str, str]],
        meta: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Create amendment. Old record is tombstoned, new record shares lineage_id.
        Atomically updates latest_valid pointer.
        """
        with self.transaction() as conn:
            # Get old record's lineage
            cursor = conn.execute(
                "SELECT lineage_id, session_id FROM records WHERE record_id = ?",
                (old_record_id,)
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError(f"Record {old_record_id} not found")
            
            lineage_id = row[0]
            session_id = row[1]
            
            # Mark old record as superseded
            conn.execute(
                "UPDATE records SET status = 'superseded', superseded_by = ? WHERE record_id = ?",
                (None, old_record_id)  # Will update with new_record_id after insert
            )
            
            # Create new record (same lineage)
            result = self.commit_record(
                session_id=session_id,
                lineage_id=lineage_id,
                role="user",  # Amendments are user-initiated
                message=new_message,
                anchors=new_anchors,
                meta=meta,
                status="active"
            )
            
            # Update superseded_by pointer
            conn.execute(
                "UPDATE records SET superseded_by = ? WHERE record_id = ?",
                (result["record_id"], old_record_id)
            )
            
            return result
    
    # ============================================================
    # Query Interface
    # ============================================================
    
    def get_latest_valid(self, lineage_id: str) -> Optional[Dict]:
        """O(1) lookup of current valid record for lineage"""
        with self.transaction() as conn:
            cursor = conn.execute("""
                SELECT r.* FROM records r
                JOIN latest_valid lv ON r.record_id = lv.record_id
                WHERE lv.lineage_id = ?
            """, (lineage_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def get_session_records(self, session_id: str, include_superseded: bool = False) -> List[Dict]:
        """Get all records for a session"""
        with self.transaction() as conn:
            query = "SELECT * FROM records WHERE session_id = ?"
            if not include_superseded:
                query += " AND status != 'superseded'"
            query += " ORDER BY seq ASC"
            
            cursor = conn.execute(query, (session_id,))
            return [dict(row) for row in cursor.fetchall()]


# ============================================================
# Usage Example
# ============================================================

if __name__ == "__main__":
    plane_b = PlaneB()
    
    # Commit a record
    result = plane_b.commit_record(
        session_id="sess_123",
        lineage_id="lineage_456",
        role="user",
        message="Hello CAOS",
        anchors=[
            {"class": "session", "value": "sess_123"},
            {"class": "date", "value": "2026-01-04"}
        ]
    )
    
    print("Committed:", result)
    
    # Retrieve
    records = plane_b.get_session_records("sess_123")
    print(f"Found {len(records)} records")
`}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ANCHORS */}
          <TabsContent value="anchors">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  anchors.py — Registry & Picker
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <pre className="text-xs text-slate-300 font-mono bg-slate-950 p-4 rounded">
{`"""
CAOS-A1 Anchor System
Registry, picker, normalization, phrase gates
"""
from typing import List, Dict, Optional, Set
from datetime import datetime, timezone
import re

# ============================================================
# Anchor Registry (Whitelisted Classes)
# ============================================================

ANCHOR_CLASSES = {
    "record": {"description": "Record identifier"},
    "lineage": {"description": "Amendment lineage"},
    "ts_iso": {"description": "ISO timestamp"},
    "ts_ms": {"description": "Unix timestamp (ms)"},
    "timezone": {"description": "Timezone"},
    "date": {"description": "Date (YYYY-MM-DD)"},
    "time": {"description": "Time (HH:MM)"},
    "session": {"description": "Session identifier"},
    "user": {"description": "User identifier"},
    "project": {"description": "Project identifier"},
    "role": {"description": "Message role (user/assistant)"},
    "type": {"description": "Record type"},
    "path": {"description": "File path or route"},
    "entity": {"description": "Proper noun (requires context)", "requires_context": True},
    "event": {"description": "Named event (requires temporal scope)", "requires_temporal": True},
    "holiday": {"description": "Holiday name (requires temporal scope)", "requires_temporal": True},
    "milestone": {"description": "Project milestone (requires temporal scope)", "requires_temporal": True},
    "intent": {"description": "User intent"},
    "artifact": {"description": "Generated artifact"},
    "source": {"description": "Data source"},
    "authority": {"description": "Authorization level"},
    "context": {"description": "Semantic context (tech, food, etc.)"}
}

# Stopwords (never promoted to phrase anchors)
STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
    "been", "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "should", "could", "may", "might", "must", "can", "i", "you",
    "he", "she", "it", "we", "they", "this", "that", "these", "those"
}

# ============================================================
# Anchor Picker
# ============================================================

class AnchorPicker:
    def __init__(self, ts_snapshot: datetime):
        """
        Initialize picker with frozen timestamp snapshot.
        All time-derived anchors resolve from this snapshot.
        """
        self.ts_snapshot = ts_snapshot
    
    def pick(
        self,
        message: str,
        session_id: str,
        user_id: str,
        project_id: Optional[str] = None,
        role: str = "user"
    ) -> List[Dict[str, str]]:
        """
        Pick anchors from message + context.
        Returns list of {class, value, context?} dicts.
        
        Phase 1 validation happens here:
        - Reject if required context missing
        - Reject if temporal scope missing for events
        """
        anchors = []
        
        # Automatic anchors (always present)
        anchors.extend(self._auto_anchors(session_id, user_id, project_id, role))
        
        # Time-derived anchors (from frozen snapshot)
        anchors.extend(self._time_anchors())
        
        # Extract entities, events, intents from message
        anchors.extend(self._extract_entities(message))
        anchors.extend(self._extract_events(message))
        anchors.extend(self._extract_intents(message))
        
        # Phrase candidates (not automatically promoted)
        # These would go to ephemeral staging, not returned here
        
        return anchors
    
    def _auto_anchors(self, session_id, user_id, project_id, role) -> List[Dict]:
        """Anchors that are always present"""
        anchors = [
            {"class": "session", "value": session_id},
            {"class": "user", "value": user_id},
            {"class": "role", "value": role}
        ]
        if project_id:
            anchors.append({"class": "project", "value": project_id})
        return anchors
    
    def _time_anchors(self) -> List[Dict]:
        """Time anchors from frozen snapshot"""
        return [
            {"class": "ts_iso", "value": self.ts_snapshot.isoformat()},
            {"class": "ts_ms", "value": str(int(self.ts_snapshot.timestamp() * 1000))},
            {"class": "timezone", "value": "UTC"},
            {"class": "date", "value": self.ts_snapshot.strftime("%Y-%m-%d")},
            {"class": "time", "value": self.ts_snapshot.strftime("%H:%M")}
        ]
    
    def _extract_entities(self, message: str) -> List[Dict]:
        """
        Extract proper nouns (entities).
        In production: use NER model or LLM.
        """
        # Placeholder: detect capitalized words
        entities = []
        words = re.findall(r'\\b[A-Z][a-z]+\\b', message)
        for word in set(words):
            if word.lower() not in STOPWORDS:
                # Requires context - would trigger validation error if ambiguous
                entities.append({
                    "class": "entity",
                    "value": word.lower(),
                    "context": "ambiguous"  # Placeholder
                })
        return entities
    
    def _extract_events(self, message: str) -> List[Dict]:
        """
        Extract events/holidays.
        Must enforce temporal scoping.
        """
        events = []
        
        # Known holidays with dates
        holiday_map = {
            "christmas": "12-25",
            "new year": "01-01",
            "thanksgiving": None  # Would need year-specific lookup
        }
        
        message_lower = message.lower()
        for holiday, date_suffix in holiday_map.items():
            if holiday in message_lower:
                if date_suffix:
                    # Temporally scoped
                    year = self.ts_snapshot.year
                    events.append({
                        "class": "holiday",
                        "value": f"{holiday}:{year}"
                    })
                    events.append({
                        "class": "date",
                        "value": f"{year}-{date_suffix}"
                    })
                else:
                    # Unscoped - would trigger validation error
                    raise ValueError(f"Event '{holiday}' requires temporal scope")
        
        return events
    
    def _extract_intents(self, message: str) -> List[Dict]:
        """
        Extract user intents.
        In production: use intent classifier.
        """
        intents = []
        
        # Simple keyword matching (placeholder)
        intent_keywords = {
            "recall": ["remember", "earlier", "before", "last time"],
            "create": ["create", "make", "build", "generate"],
            "query": ["what", "who", "when", "where", "how"]
        }
        
        message_lower = message.lower()
        for intent, keywords in intent_keywords.items():
            if any(kw in message_lower for kw in keywords):
                intents.append({"class": "intent", "value": intent})
        
        return intents

# ============================================================
# Normalization
# ============================================================

def normalize_anchor(anchor: Dict[str, str]) -> Dict[str, str]:
    """
    Normalize anchor values for consistency.
    """
    anchor_class = anchor["class"]
    value = anchor["value"]
    
    if anchor_class in ["entity", "event", "holiday"]:
        value = value.lower().strip()
    elif anchor_class == "date":
        # Ensure YYYY-MM-DD format
        pass  # Already validated by picker
    elif anchor_class == "time":
        # Ensure HH:MM format
        pass
    
    return {
        "class": anchor_class,
        "value": value,
        "context": anchor.get("context")
    }

# ============================================================
# Validation (Phase 1)
# ============================================================

class ValidationError(Exception):
    def __init__(self, error_type: str, message: str, required_fields: Optional[List] = None):
        self.error_type = error_type
        self.message = message
        self.required_fields = required_fields or []
        super().__init__(message)

def validate_anchors(anchors: List[Dict]) -> None:
    """
    Phase 1 validation.
    Raises ValidationError if:
    - Required context missing
    - Temporal scope missing for events
    """
    for anchor in anchors:
        anchor_class = anchor["class"]
        
        # Check if class requires context
        if ANCHOR_CLASSES.get(anchor_class, {}).get("requires_context"):
            if not anchor.get("context") or anchor["context"] == "ambiguous":
                raise ValidationError(
                    error_type="CONTEXT_REQUIRED",
                    message=f"Anchor {anchor_class}:{anchor['value']} requires explicit context",
                    required_fields=["context"]
                )
        
        # Check if class requires temporal scope
        if ANCHOR_CLASSES.get(anchor_class, {}).get("requires_temporal"):
            if ":" not in anchor["value"]:  # No year suffix
                raise ValidationError(
                    error_type="TEMPORAL_SCOPE_REQUIRED",
                    message=f"Event {anchor['value']} requires temporal scope (year)",
                    required_fields=["year"]
                )

# ============================================================
# Usage Example
# ============================================================

if __name__ == "__main__":
    now = datetime.now(timezone.utc)
    picker = AnchorPicker(ts_snapshot=now)
    
    anchors = picker.pick(
        message="Remember our Christmas 2025 plans?",
        session_id="sess_123",
        user_id="user_456",
        role="user"
    )
    
    print("Picked anchors:")
    for anchor in anchors:
        print(f"  {anchor['class']}:{anchor['value']}")
    
    # Validate
    try:
        validate_anchors(anchors)
        print("✓ Validation passed")
    except ValidationError as e:
        print(f"✗ Validation failed: {e.message}")
`}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API CONTRACT */}
          <TabsContent value="api">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Server className="w-5 h-5 text-green-400" />
                  FastAPI Contract
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <pre className="text-xs text-slate-300 font-mono bg-slate-950 p-4 rounded">
{`"""
CAOS-A1 FastAPI Server (main.py)
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

from caos_core.plane_b import PlaneB
from caos_core.anchors import AnchorPicker, validate_anchors, ValidationError

app = FastAPI(title="CAOS-A1 Memory Service", version="1.5.0")

# CORS for Base44 frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Lock down in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Plane B
plane_b = PlaneB(db_path="./data/caos_plane_b.db")

# ============================================================
# Request/Response Models
# ============================================================

class MessageRequest(BaseModel):
    message: str
    session: str
    memory_gate: Optional[Dict] = None
    images: Optional[List[Dict]] = None
    capabilities: Optional[Dict] = None

class MessageResponse(BaseModel):
    reply: str
    session: str
    record_id: Optional[str] = None
    anchors: Optional[List[Dict]] = None

class ErrorResponse(BaseModel):
    error: str
    error_type: str
    details: Optional[Dict] = None

class MetricsResponse(BaseModel):
    export: Dict
    pending_resolution: Dict
    wal: Dict
    rebuild: Dict
    tokens: Dict
    messages: Dict
    # ... other metrics

# ============================================================
# Routes
# ============================================================

@app.get("/health")
async def health_check():
    """Health check + WAL mode verification"""
    try:
        # Verify DB connection
        with plane_b.transaction() as conn:
            cursor = conn.execute("PRAGMA journal_mode")
            journal_mode = cursor.fetchone()[0]
            
            cursor = conn.execute("PRAGMA synchronous")
            synchronous = cursor.fetchone()[0]
        
        return {
            "status": "healthy",
            "journal_mode": journal_mode,
            "synchronous": synchronous,
            "version": "1.5.0"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@app.post("/api/message", response_model=MessageResponse)
async def handle_message(req: MessageRequest):
    """
    Two-phase message ingestion:
    Phase 1: Validate
    Phase 2: Commit
    """
    try:
        # Phase 1: Validation
        ts_snapshot = datetime.now(timezone.utc)
        picker = AnchorPicker(ts_snapshot=ts_snapshot)
        
        anchors = picker.pick(
            message=req.message,
            session_id=req.session,
            user_id="user_placeholder",  # From auth
            role="user"
        )
        
        # Validate anchors
        validate_anchors(anchors)
        
        # Phase 2: Atomic Commit
        lineage_id = f"lineage_{uuid.uuid4().hex[:12]}"
        
        result = plane_b.commit_record(
            session_id=req.session,
            lineage_id=lineage_id,
            role="user",
            message=req.message,
            anchors=anchors,
            record_type="message"
        )
        
        # Generate AI response (placeholder)
        reply = f"Acknowledged. Record {result['record_id']} committed."
        
        # Commit AI response
        ai_lineage = f"lineage_{uuid.uuid4().hex[:12]}"
        ai_result = plane_b.commit_record(
            session_id=req.session,
            lineage_id=ai_lineage,
            role="assistant",
            message=reply,
            anchors=picker.pick(
                message=reply,
                session_id=req.session,
                user_id="caos",
                role="assistant"
            ),
            record_type="message"
        )
        
        return MessageResponse(
            reply=reply,
            session=req.session,
            record_id=ai_result["record_id"],
            anchors=anchors
        )
        
    except ValidationError as e:
        raise HTTPException(
            status_code=400,
            detail={
                "error": e.message,
                "error_type": e.error_type,
                "required_fields": e.required_fields
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "error_type": "INTERNAL_ERROR"}
        )

@app.get("/api/metrics/all", response_model=MetricsResponse)
async def get_metrics():
    """
    Return all metrics for Console dashboard.
    Includes v1.5 requirements: export lag, pending_resolution, WAL health
    """
    with plane_b.transaction() as conn:
        # Export metrics
        cursor = conn.execute("""
            SELECT last_exported_seq, 
                   (SELECT MAX(seq) FROM records) as latest_seq,
                   last_export_ts
            FROM export_cursor WHERE id = 1
        """)
        export_row = cursor.fetchone()
        export_lag = (export_row[1] or 0) - (export_row[0] or 0)
        
        # Pending resolution count
        cursor = conn.execute("""
            SELECT COUNT(*), 
                   MAX(CAST((julianday('now') - julianday(created_at)) * 24 AS INTEGER))
            FROM records WHERE status = 'pending_resolution'
        """)
        pending_row = cursor.fetchone()
        
        # WAL stats (would use PRAGMA for real metrics)
        # Placeholder values
        
        return {
            "export": {
                "last_exported_seq": export_row[0] or 0,
                "latest_committed_seq": export_row[1] or 0,
                "lag": export_lag,
                "lag_threshold": 100,
                "health_status": "healthy" if export_lag < 100 else "degraded"
            },
            "pending_resolution": {
                "count": pending_row[0] or 0,
                "oldest_age_hours": pending_row[1] or 0,
                "count_threshold": 50,
                "ttl_expirations_24h": 0  # Would track separately
            },
            "wal": {
                "last_checkpoint_ms": 0,
                "checkpoint_lag_ms": 0,
                "write_latency_p95_ms": 0,
                "wal_size_kb": 0,
                "status": "healthy"
            },
            "rebuild": {
                "in_progress": False,
                "progress_percent": 0,
                "parity_status": "verified",
                "last_rebuild_ts": None,
                "shadow_lag": 0
            },
            "tokens": {},
            "messages": {}
        }

# ============================================================
# Run Server
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
`}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SCHEMAS */}
          <TabsContent value="schemas">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-cyan-400" />
                  Data Schemas & Contracts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-6 text-slate-300">
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                      <h3 className="text-lg font-semibold text-cyan-400 mb-3">Record Schema</h3>
                      <pre className="text-xs text-green-400 font-mono">
{`{
  "record_id": "sess_123_1_1735996800000",
  "lineage_id": "lineage_abc123",
  "session_id": "sess_123",
  "seq": 1,
  
  "ts_snapshot_iso": "2026-01-04T12:00:00Z",
  "ts_snapshot_ms": 1735996800000,
  "timezone": "UTC",
  
  "role": "user",
  "type": "message",
  "path": null,
  "message": "Hello CAOS",
  
  "anchors": [
    {"class": "session", "value": "sess_123"},
    {"class": "date", "value": "2026-01-04"},
    {"class": "intent", "value": "greeting"}
  ],
  
  "meta": {
    "provenance": "web_ui",
    "user_agent": "Mozilla/5.0..."
  },
  
  "superseded_by": null,
  "status": "active",
  "created_at": "2026-01-04T12:00:00Z"
}`}
                      </pre>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                      <h3 className="text-lg font-semibold text-cyan-400 mb-3">Anchor Schema</h3>
                      <pre className="text-xs text-green-400 font-mono">
{`{
  "class": "entity",        // Whitelisted class from registry
  "value": "apple",         // Normalized value
  "context": "tech"         // Optional context qualifier
}

// Examples:
{"class": "date", "value": "2026-01-04"}
{"class": "entity", "value": "apple", "context": "tech"}
{"class": "event", "value": "christmas:2025"}
{"class": "intent", "value": "recall"}
{"class": "session", "value": "sess_123"}`}
                      </pre>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                      <h3 className="text-lg font-semibold text-cyan-400 mb-3">Amendment Chain</h3>
                      <pre className="text-xs text-green-400 font-mono">
{`// Original record
{
  "record_id": "rec_001",
  "lineage_id": "lineage_abc",
  "message": "Original message",
  "status": "superseded",
  "superseded_by": "rec_002"
}

// Amendment (shares lineage_id)
{
  "record_id": "rec_002",
  "lineage_id": "lineage_abc",  // Same lineage
  "message": "Corrected message",
  "status": "active",
  "superseded_by": null
}

// latest_valid table
{
  "lineage_id": "lineage_abc",
  "record_id": "rec_002",       // Points to current version
  "updated_at": "2026-01-04T12:05:00Z"
}`}
                      </pre>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                      <h3 className="text-lg font-semibold text-cyan-400 mb-3">Pending Resolution</h3>
                      <pre className="text-xs text-green-400 font-mono">
{`{
  "record_id": "rec_003",
  "status": "pending_resolution",
  "message": "Tell me about apple",
  "anchors": [
    {
      "class": "entity",
      "value": "apple",
      "context": "ambiguous"  // Triggers pending_resolution
    }
  ],
  "created_at": "2026-01-04T12:00:00Z"
}

// After user resolves (within 7 days):
// Create amendment with context:tech or context:food

// After TTL expires:
// Auto-transition to context:unresolved`}
                      </pre>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                      <h3 className="text-lg font-semibold text-cyan-400 mb-3">Error Responses</h3>
                      <pre className="text-xs text-green-400 font-mono">
{`// Context Required Error
{
  "error": "Anchor entity:apple requires explicit context",
  "error_type": "CONTEXT_REQUIRED",
  "required_fields": ["context"],
  "suggestions": ["tech", "food", "music"]
}

// Temporal Scope Required
{
  "error": "Event 'christmas' requires temporal scope (year)",
  "error_type": "TEMPORAL_SCOPE_REQUIRED",
  "required_fields": ["year"]
}

// Validation Failed
{
  "error": "Invalid anchor class 'custom_class'",
  "error_type": "INVALID_ANCHOR_CLASS",
  "allowed_classes": ["entity", "event", "date", ...]
}`}
                      </pre>
                    </div>

                    <div className="bg-amber-900/20 border border-amber-600/50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-amber-400 mb-2">Integration Contract</h3>
                      <p className="text-sm mb-3">Base44 frontend must send:</p>
                      <pre className="text-xs text-slate-300 font-mono bg-slate-950 p-2 rounded">
{`POST /api/message
{
  "message": "user message",
  "session": "session_id",
  "memory_gate": {
    "allowed": true,
    "scope": "session",
    "explicit_recall": false
  },
  "images": [{"url": "..."}],  // Optional
  "capabilities": {}
}`}
                      </pre>
                      <p className="text-sm mt-3 mb-2">Backend returns:</p>
                      <pre className="text-xs text-slate-300 font-mono bg-slate-950 p-2 rounded">
{`{
  "reply": "AI response",
  "session": "session_id",  // MUST match request
  "record_id": "rec_123",
  "anchors": [...]
}`}
                      </pre>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
      </div>
    </div>
  );
}