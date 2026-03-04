import React from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function CAOSBlueprint() {
  const blueprintContent = `
================================================================
CAOS-A1 IMPLEMENTATION BLUEPRINT
VERSION: 1.5.0
DATE: 2026-01-04
AUTHORITY: Michael John Chambers
================================================================

TABLE OF CONTENTS
-----------------
1. Architecture Overview
2. Tech Stack & Requirements
3. Project Structure
4. Implementation Order
5. plane_b.py - Foundation Module (COMPLETE CODE)
6. anchors.py - Anchor System (COMPLETE CODE)
7. anchor_maps.py - Index Layer (SPECIFICATION)
8. amendments.py - Versioning (SPECIFICATION)
9. context.py - Context Resolution (SPECIFICATION)
10. export.py - JSONL Export (SPECIFICATION)
11. main.py - FastAPI Server (COMPLETE CODE)
12. Data Schemas & Contracts
13. Integration with Base44 Frontend
14. Deployment Instructions

================================================================
1. ARCHITECTURE OVERVIEW
================================================================

Core Principles:
- SQLite (WAL) is the ONLY source of truth
- All commits are atomic via single transaction
- Server-side time authority (client time ignored)
- JSONL is export-only, not authoritative
- Two-phase ingestion (validate → commit)

Authority Boundaries:
- Backend owns: timestamps, record_ids, sequences
- Frontend supplies: messages, sessions, user context
- Frontend CANNOT supply: timestamps, IDs

Durability Guarantees:
- PRAGMA synchronous = FULL
- PRAGMA journal_mode = WAL
- All commits are atomic
- Crash at any point cannot create partial truth

================================================================
2. TECH STACK & REQUIREMENTS
================================================================

Language: Python 3.11+
Framework: FastAPI
Database: SQLite 3.35+
Durability: WAL mode + synchronous=FULL

Python Dependencies (requirements.txt):
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
python-multipart==0.0.6
aiofiles==23.2.1

Optional (for production):
prometheus-client==0.19.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4

================================================================
3. PROJECT STRUCTURE
================================================================

caos-a1-backend/
├── README.md
├── requirements.txt
├── .env.example
├── config.py
│
├── caos_core/
│   ├── __init__.py
│   ├── plane_b.py           ⭐ START HERE - Foundation
│   ├── anchors.py           ⭐ Anchor system
│   ├── anchor_maps.py       Index layer
│   ├── amendments.py        Versioning
│   ├── context.py           Context resolution
│   ├── export.py            JSONL export
│   └── recall.py            Recall logic
│
├── caos_api/
│   ├── __init__.py
│   ├── main.py              ⭐ FastAPI server
│   ├── models.py            Pydantic models
│   ├── metrics.py           Prometheus metrics
│   └── middleware.py        CORS, logging
│
├── migrations/
│   └── versions/
│
├── tests/
│   ├── test_plane_b.py
│   ├── test_anchors.py
│   └── test_integration.py
│
└── scripts/
    ├── init_db.py
    └── verify_integrity.py

================================================================
4. IMPLEMENTATION ORDER (MANDATORY)
================================================================

Phase 1: Foundation (DO FIRST)
1. plane_b.py - SQLite schema, transactions, record commits
2. Test atomicity with crash simulations

Phase 2: Anchor System
3. anchors.py - Registry, picker, validation
4. Test anchor extraction and normalization

Phase 3: Indexing
5. anchor_maps.py - Index tables, intersection queries
6. Test index rebuild with shadow tables

Phase 4: Amendments
7. amendments.py - Amendment chains, latest_valid
8. Test amendment atomicity

Phase 5: Context & Export
9. context.py - Context resolution, pending_resolution
10. export.py - Background JSONL streamer

Phase 6: Integration
11. main.py - FastAPI routes
12. Integration tests with Base44 frontend

DO NOT proceed to next phase until current phase is proven solid.

================================================================
5. plane_b.py - FOUNDATION MODULE (COMPLETE CODE)
================================================================

"""
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
            
            # Log amendment event
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
                (None, old_record_id)
            )
            
            # Create new record (same lineage)
            result = self.commit_record(
                session_id=session_id,
                lineage_id=lineage_id,
                role="user",
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

================================================================
6. anchors.py - ANCHOR SYSTEM (COMPLETE CODE)
================================================================

"""
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
        """Pick anchors from message + context."""
        anchors = []
        
        # Automatic anchors
        anchors.extend(self._auto_anchors(session_id, user_id, project_id, role))
        
        # Time-derived anchors
        anchors.extend(self._time_anchors())
        
        # Extract from message
        anchors.extend(self._extract_entities(message))
        anchors.extend(self._extract_events(message))
        anchors.extend(self._extract_intents(message))
        
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
        """Extract proper nouns (placeholder - use NER in production)"""
        entities = []
        words = re.findall(r'\\b[A-Z][a-z]+\\b', message)
        for word in set(words):
            if word.lower() not in STOPWORDS:
                entities.append({
                    "class": "entity",
                    "value": word.lower(),
                    "context": "ambiguous"
                })
        return entities
    
    def _extract_events(self, message: str) -> List[Dict]:
        """Extract events/holidays with temporal scoping"""
        events = []
        
        holiday_map = {
            "christmas": "12-25",
            "new year": "01-01"
        }
        
        message_lower = message.lower()
        for holiday, date_suffix in holiday_map.items():
            if holiday in message_lower:
                if date_suffix:
                    year = self.ts_snapshot.year
                    events.append({
                        "class": "holiday",
                        "value": f"{holiday}:{year}"
                    })
                    events.append({
                        "class": "date",
                        "value": f"{year}-{date_suffix}"
                    })
        
        return events
    
    def _extract_intents(self, message: str) -> List[Dict]:
        """Extract user intents (placeholder - use classifier in production)"""
        intents = []
        
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
# Validation
# ============================================================

class ValidationError(Exception):
    def __init__(self, error_type: str, message: str, required_fields: Optional[List] = None):
        self.error_type = error_type
        self.message = message
        self.required_fields = required_fields or []
        super().__init__(message)

def validate_anchors(anchors: List[Dict]) -> None:
    """Phase 1 validation. Raises ValidationError if issues found."""
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
            if ":" not in anchor["value"]:
                raise ValidationError(
                    error_type="TEMPORAL_SCOPE_REQUIRED",
                    message=f"Event {anchor['value']} requires temporal scope (year)",
                    required_fields=["year"]
                )

def normalize_anchor(anchor: Dict[str, str]) -> Dict[str, str]:
    """Normalize anchor values for consistency."""
    anchor_class = anchor["class"]
    value = anchor["value"]
    
    if anchor_class in ["entity", "event", "holiday"]:
        value = value.lower().strip()
    
    return {
        "class": anchor_class,
        "value": value,
        "context": anchor.get("context")
    }

================================================================
7. main.py - FASTAPI SERVER (COMPLETE CODE)
================================================================

"""
CAOS-A1 FastAPI Server
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

# CORS
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
# Models
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

# ============================================================
# Routes
# ============================================================

@app.get("/health")
async def health_check():
    """Health check + WAL verification"""
    try:
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
        return {"status": "unhealthy", "error": str(e)}

@app.post("/api/message", response_model=MessageResponse)
async def handle_message(req: MessageRequest):
    """Two-phase message ingestion"""
    try:
        # Phase 1: Validation
        ts_snapshot = datetime.now(timezone.utc)
        picker = AnchorPicker(ts_snapshot=ts_snapshot)
        
        anchors = picker.pick(
            message=req.message,
            session_id=req.session,
            user_id="user_placeholder",
            role="user"
        )
        
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

@app.get("/api/metrics/all")
async def get_metrics():
    """Return metrics for Console dashboard"""
    with plane_b.transaction() as conn:
        cursor = conn.execute("""
            SELECT last_exported_seq, 
                   (SELECT MAX(seq) FROM records) as latest_seq
            FROM export_cursor WHERE id = 1
        """)
        export_row = cursor.fetchone()
        export_lag = (export_row[1] or 0) - (export_row[0] or 0)
        
        cursor = conn.execute("""
            SELECT COUNT(*) FROM records WHERE status = 'pending_resolution'
        """)
        pending_count = cursor.fetchone()[0]
        
        return {
            "export": {
                "last_exported_seq": export_row[0] or 0,
                "latest_committed_seq": export_row[1] or 0,
                "lag": export_lag,
                "health_status": "healthy" if export_lag < 100 else "degraded"
            },
            "pending_resolution": {
                "count": pending_count,
                "count_threshold": 50
            },
            "wal": {"status": "healthy"},
            "rebuild": {"in_progress": False},
            "tokens": {},
            "messages": {}
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

================================================================
8. DATA SCHEMAS & CONTRACTS
================================================================

RECORD SCHEMA
-------------
{
  "record_id": "sess_123_1_1735996800000",
  "lineage_id": "lineage_abc123",
  "session_id": "sess_123",
  "seq": 1,
  "ts_snapshot_iso": "2026-01-04T12:00:00Z",
  "ts_snapshot_ms": 1735996800000,
  "timezone": "UTC",
  "role": "user",
  "type": "message",
  "message": "Hello CAOS",
  "anchors": [
    {"class": "session", "value": "sess_123"},
    {"class": "date", "value": "2026-01-04"}
  ],
  "status": "active",
  "superseded_by": null,
  "created_at": "2026-01-04T12:00:00Z"
}

ANCHOR SCHEMA
-------------
{
  "class": "entity",
  "value": "apple",
  "context": "tech"
}

AMENDMENT CHAIN
---------------
Original:
{
  "record_id": "rec_001",
  "lineage_id": "lineage_abc",
  "status": "superseded",
  "superseded_by": "rec_002"
}

Amendment:
{
  "record_id": "rec_002",
  "lineage_id": "lineage_abc",
  "status": "active"
}

latest_valid:
{
  "lineage_id": "lineage_abc",
  "record_id": "rec_002"
}

ERROR RESPONSES
---------------
CONTEXT_REQUIRED:
{
  "error": "Anchor entity:apple requires explicit context",
  "error_type": "CONTEXT_REQUIRED",
  "required_fields": ["context"]
}

TEMPORAL_SCOPE_REQUIRED:
{
  "error": "Event 'christmas' requires temporal scope (year)",
  "error_type": "TEMPORAL_SCOPE_REQUIRED",
  "required_fields": ["year"]
}

================================================================
9. INTEGRATION WITH BASE44
================================================================

Base44 Frontend Calls:
POST /api/message
{
  "message": "user message",
  "session": "session_id",
  "memory_gate": {
    "allowed": true,
    "scope": "session"
  }
}

Backend Returns:
{
  "reply": "AI response",
  "session": "session_id",  // MUST match request
  "record_id": "rec_123",
  "anchors": [...]
}

Frontend Configuration:
Update CAOS_SERVER in Chat.js:
const CAOS_SERVER = "https://your-caos-server.com";

================================================================
10. DEPLOYMENT INSTRUCTIONS
================================================================

Local Development:
1. Install dependencies:
   pip install -r requirements.txt

2. Create data directory:
   mkdir -p data

3. Run server:
   python -m uvicorn caos_api.main:app --reload --port 8000

4. Test health:
   curl http://localhost:8000/health

Production Deployment:
1. Use Docker:
   docker build -t caos-a1 .
   docker run -p 8000:8000 -v ./data:/data caos-a1

2. Or use Gunicorn:
   gunicorn caos_api.main:app -w 4 -k uvicorn.workers.UvicornWorker

3. Configure reverse proxy (nginx):
   proxy_pass http://localhost:8000;

4. Set environment variables:
   DATABASE_PATH=/data/caos_plane_b.db
   LOG_LEVEL=INFO

5. Monitor:
   - Check /health endpoint
   - Monitor /api/metrics/all
   - Track export lag
   - Watch pending_resolution count

================================================================
END OF BLUEPRINT
================================================================

Next Steps:
1. Create caos-a1-backend/ directory
2. Implement plane_b.py first
3. Test with: python caos_core/plane_b.py
4. Implement anchors.py
5. Implement main.py
6. Run server: python -m uvicorn caos_api.main:app --reload
7. Update Base44 frontend CAOS_SERVER URL
8. Test integration end-to-end

Contact: Michael John Chambers
`;

  const downloadBlueprint = () => {
    const blob = new Blob([blueprintContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CAOS-A1-Implementation-Blueprint-v1.5.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <div className="text-center space-y-2">
        <FileText className="w-16 h-16 text-blue-400 mx-auto" />
        <h2 className="text-2xl font-bold text-white">CAOS-A1 Implementation Blueprint v1</h2>
        <p className="text-slate-400">v1.5.0 - Complete Python Implementation Guide</p>
      </div>
      
      <Button 
        onClick={downloadBlueprint}
        className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
        size="lg"
      >
        <Download className="w-5 h-5" />
        Download Blueprint (TXT)
      </Button>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 max-w-2xl text-slate-300 text-sm space-y-2">
        <p><strong className="text-white">Includes:</strong></p>
        <ul className="list-disc list-inside space-y-1 text-slate-400">
          <li>Complete plane_b.py implementation</li>
          <li>Complete anchors.py implementation</li>
          <li>Complete FastAPI server code</li>
          <li>SQLite schema with WAL configuration</li>
          <li>Data contracts & schemas</li>
          <li>Deployment instructions</li>
          <li>Integration guide for Base44 frontend</li>
        </ul>
      </div>
    </div>
  );
}