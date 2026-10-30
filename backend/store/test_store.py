"""
Durable Test Store (SQLite Persistent)
MOSIP Decode 2026 - Problem Statement 2: Inji Interoperability Playground

Provides thread-safe and multi-process persistent state tracking for active and historical
interoperability test runs and OAuth state parameters.
Backs all sessions with an ACID SQLite database so tests survive process recycles,
container rebuilds, multi-worker servers, and browser navigation redirects.
"""

import os
import json
import sqlite3
import uuid
import urllib.parse
from threading import RLock
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone


class DurableTestStore:
    def __init__(self, db_path: Optional[str] = None):
        self._lock = RLock()
        if db_path:
            self._db_path = db_path
        else:
            env_path = os.getenv("TEST_STORE_DB_PATH")
            if env_path:
                self._db_path = env_path
            else:
                backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                repo_root = os.path.dirname(backend_dir)
                if os.path.exists(os.path.join(repo_root, "data")):
                    self._db_path = os.path.join(repo_root, "data", "test_store.db")
                else:
                    self._db_path = os.path.join(backend_dir, "data", "test_store.db")

        # Ensure parent directory exists
        db_dir = os.path.dirname(self._db_path)
        if db_dir and not os.path.exists(db_dir):
            try:
                os.makedirs(db_dir, exist_ok=True)
            except Exception:
                pass

        self._init_db()

    @property
    def db_path(self) -> str:
        return self._db_path

    def configure_db_path(self, new_path: str):
        """Allows test runners to point the store to an isolated SQLite database."""
        with self._lock:
            self._db_path = new_path
            db_dir = os.path.dirname(new_path)
            if db_dir and not os.path.exists(db_dir):
                os.makedirs(db_dir, exist_ok=True)
            self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        """Creates a connection with row factory and busy timeout."""
        conn = sqlite3.connect(self._db_path, timeout=10.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        try:
            conn.execute("PRAGMA busy_timeout = 5000;")
            conn.execute("PRAGMA synchronous = NORMAL;")
        except Exception:
            pass
        return conn

    def _init_db(self):
        """Initializes database schema with indexing on test_id and oauth_state."""
        with self._lock:
            with self._get_connection() as conn:
                try:
                    conn.execute("PRAGMA journal_mode = DELETE;")
                except Exception:
                    pass
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS tests (
                        test_id TEXT PRIMARY KEY,
                        oauth_state TEXT,
                        status TEXT,
                        issuer TEXT,
                        wallet TEXT,
                        verifier TEXT,
                        credential_format TEXT,
                        expected_outcome TEXT,
                        outcome TEXT,
                        created_at TEXT,
                        updated_at TEXT,
                        data_json TEXT NOT NULL
                    );
                """)
                conn.execute("CREATE INDEX IF NOT EXISTS idx_tests_oauth_state ON tests(oauth_state);")
                conn.execute("CREATE INDEX IF NOT EXISTS idx_tests_created_at ON tests(created_at);")

                conn.execute("""
                    CREATE TABLE IF NOT EXISTS events (
                        event_id TEXT PRIMARY KEY,
                        test_id TEXT NOT NULL,
                        event_type TEXT,
                        message TEXT,
                        timestamp TEXT,
                        payload_json TEXT,
                        FOREIGN KEY (test_id) REFERENCES tests(test_id) ON DELETE CASCADE
                    );
                """)
                conn.execute("CREATE INDEX IF NOT EXISTS idx_events_test_id ON events(test_id);")
                conn.commit()

    def create_test(
        self,
        issuer: str,
        wallet: str,
        verifier: str,
        credential_format: str,
        expected_outcome: str = "PASS",
        protocol_steps: Optional[List[Dict[str, Any]]] = None,
        test_id: Optional[str] = None,
        code_verifier: Optional[str] = None,
        oauth_state: Optional[str] = None,
        redirect_uri: Optional[str] = None,
        code_challenge: Optional[str] = None
    ) -> Dict[str, Any]:
        """Creates a new test session with durable SQLite persistence."""
        session_id = test_id or str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        total_steps = len(protocol_steps) if protocol_steps else 8
        test_data = {
            "test_id": session_id,
            "created_at": now,
            "updated_at": now,
            "started_at": now,
            "completed_at": None,
            "status": "RUNNING",  # IDLE, RUNNING, COMPLETED, RESET
            "issuer": issuer,
            "wallet": wallet,
            "verifier": verifier,
            "credential_format": credential_format,
            "expected_outcome": expected_outcome,
            "current_step_index": 0,
            "total_steps": total_steps,
            "completed_steps_count": 0,
            "pending_steps_count": total_steps,
            "steps": protocol_steps or [],
            "outcome": None,  # PASS, FAIL, VALID, INVALID, VALID BUT EXPIRED
            "error": None,
            "is_simulation": True,
            "note": "Sandbox simulation run. Real Inji integrations ready to connect.",
            "duration_ms": 0.0,
            "code_verifier": code_verifier,
            "code_challenge": code_challenge,
            "oauth_state": oauth_state,
            "redirect_uri": redirect_uri
        }

        init_event = {
            "event_id": str(uuid.uuid4()),
            "timestamp": now,
            "event_type": "TEST_INITIALIZED",
            "message": f"Test session {session_id} created for {issuer} -> {wallet} -> {verifier} ({credential_format})",
            "payload": {}
        }

        with self._lock:
            with self._get_connection() as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO tests (
                        test_id, oauth_state, status, issuer, wallet, verifier,
                        credential_format, expected_outcome, outcome, created_at, updated_at, data_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    session_id, oauth_state, test_data["status"], issuer, wallet, verifier,
                    credential_format, expected_outcome, None, now, now, json.dumps(test_data)
                ))

                conn.execute("""
                    INSERT INTO events (event_id, test_id, event_type, message, timestamp, payload_json)
                    VALUES (?, ?, ?, ?, ?, ?);
                """, (
                    init_event["event_id"], session_id, init_event["event_type"],
                    init_event["message"], now, json.dumps(init_event.get("payload", {}))
                ))
                conn.commit()

        return test_data

    def get_test(self, test_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves test details by ID from durable store."""
        if not test_id:
            return None
        with self._lock:
            with self._get_connection() as conn:
                cur = conn.execute("SELECT data_json FROM tests WHERE test_id = ?;", (test_id,))
                row = cur.fetchone()
                if row:
                    try:
                        return json.loads(row["data_json"])
                    except Exception:
                        pass
        return None

    def get_test_by_state(self, state: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves test details by OAuth state parameter with robust multi-variant matching.
        Supports exact string, URL-decoded, trimmed, and unquoted formats.
        """
        if not state or not isinstance(state, str):
            return None

        clean = state.strip()
        unquoted = urllib.parse.unquote(clean)
        unquoted_stripped = unquoted.strip("\"'")
        quoted = urllib.parse.quote(clean)

        candidates = list(dict.fromkeys([
            state,
            clean,
            unquoted,
            unquoted_stripped,
            quoted,
            clean.strip("\"'")
        ]))

        with self._lock:
            with self._get_connection() as conn:
                # 1. Fast indexed lookup by candidate states
                placeholders = ",".join("?" for _ in candidates)
                cur = conn.execute(f"SELECT data_json, oauth_state FROM tests WHERE oauth_state IN ({placeholders}) ORDER BY created_at DESC LIMIT 1;", candidates)
                row = cur.fetchone()
                if row:
                    try:
                        return json.loads(row["data_json"])
                    except Exception:
                        pass

                # 2. Resilient fallback scan for URL-encoded equality
                cur = conn.execute("SELECT data_json, oauth_state FROM tests WHERE oauth_state IS NOT NULL ORDER BY created_at DESC;")
                for r in cur.fetchall():
                    stored_state = r["oauth_state"]
                    if stored_state:
                        stored_unquoted = urllib.parse.unquote(stored_state).strip("\"'")
                        if stored_unquoted in candidates or stored_state in candidates:
                            try:
                                return json.loads(r["data_json"])
                            except Exception:
                                pass

        return None

    def get_events(self, test_id: str) -> List[Dict[str, Any]]:
        """Returns all recorded events for a given test session."""
        if not test_id:
            return []
        events = []
        with self._lock:
            with self._get_connection() as conn:
                cur = conn.execute(
                    "SELECT event_id, timestamp, event_type, message, payload_json FROM events WHERE test_id = ? ORDER BY timestamp ASC;",
                    (test_id,)
                )
                for row in cur.fetchall():
                    payload = {}
                    if row["payload_json"]:
                        try:
                            payload = json.loads(row["payload_json"])
                        except Exception:
                            pass
                    events.append({
                        "event_id": row["event_id"],
                        "timestamp": row["timestamp"],
                        "event_type": row["event_type"],
                        "message": row["message"],
                        "payload": payload
                    })
        return events

    def add_event(
        self,
        test_id: str,
        event_type: str,
        message: str,
        payload: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """Appends a new event and updates the test session's updated_at timestamp."""
        now = datetime.now(timezone.utc).isoformat()
        event = {
            "event_id": str(uuid.uuid4()),
            "timestamp": now,
            "event_type": event_type,
            "message": message,
            "payload": payload or {}
        }

        with self._lock:
            with self._get_connection() as conn:
                # Confirm test exists
                cur = conn.execute("SELECT data_json FROM tests WHERE test_id = ?;", (test_id,))
                row = cur.fetchone()
                if not row:
                    return None

                conn.execute("""
                    INSERT INTO events (event_id, test_id, event_type, message, timestamp, payload_json)
                    VALUES (?, ?, ?, ?, ?, ?);
                """, (
                    event["event_id"], test_id, event_type, message, now, json.dumps(event["payload"])
                ))

                try:
                    test_data = json.loads(row["data_json"])
                    test_data["updated_at"] = now
                    conn.execute(
                        "UPDATE tests SET updated_at = ?, data_json = ? WHERE test_id = ?;",
                        (now, json.dumps(test_data), test_id)
                    )
                except Exception:
                    pass

                conn.commit()

        return event

    def add_events_batch(
        self,
        test_id: str,
        events_list: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Appends multiple events in a single SQLite transaction to eliminate per-step commit overhead."""
        if not test_id or not events_list:
            return []
        now = datetime.now(timezone.utc).isoformat()
        created_events: List[Dict[str, Any]] = []

        with self._lock:
            with self._get_connection() as conn:
                cur = conn.execute("SELECT data_json FROM tests WHERE test_id = ?;", (test_id,))
                row = cur.fetchone()
                if not row:
                    return []

                rows_to_insert = []
                for item in events_list:
                    ev_id = str(uuid.uuid4())
                    ev_ts = item.get("timestamp") or now
                    ev_type = item.get("event_type", "EVENT")
                    ev_msg = item.get("message", "")
                    ev_payload = item.get("payload") or {}
                    created_events.append({
                        "event_id": ev_id,
                        "timestamp": ev_ts,
                        "event_type": ev_type,
                        "message": ev_msg,
                        "payload": ev_payload
                    })
                    rows_to_insert.append((
                        ev_id, test_id, ev_type, ev_msg, ev_ts, json.dumps(ev_payload)
                    ))

                conn.executemany("""
                    INSERT INTO events (event_id, test_id, event_type, message, timestamp, payload_json)
                    VALUES (?, ?, ?, ?, ?, ?);
                """, rows_to_insert)

                try:
                    test_data = json.loads(row["data_json"])
                    test_data["updated_at"] = now
                    conn.execute(
                        "UPDATE tests SET updated_at = ?, data_json = ? WHERE test_id = ?;",
                        (now, json.dumps(test_data), test_id)
                    )
                except Exception:
                    pass

                conn.commit()

        return created_events

    def claim_oauth_callback(self, test_id: str) -> tuple[bool, Optional[Dict[str, Any]]]:
        """
        Atomically claims the OAuth callback execution for a test session.
        Returns (claimed: bool, session_data: Optional[Dict]).
        If the callback has already been claimed, processed, or completed, returns (False, session_data)
        so duplicate callbacks or browser refreshes never trigger duplicate token exchange, credential
        issuance, or VP submission.
        """
        if not test_id:
            return False, None
        now = datetime.now(timezone.utc).isoformat()
        with self._lock:
            with self._get_connection() as conn:
                try:
                    conn.execute("BEGIN IMMEDIATE;")
                except Exception:
                    pass
                cur = conn.execute("SELECT data_json FROM tests WHERE test_id = ?;", (test_id,))
                row = cur.fetchone()
                if not row:
                    conn.rollback()
                    return False, None

                try:
                    test_data = json.loads(row["data_json"])
                except Exception:
                    conn.rollback()
                    return False, None

                if (
                    test_data.get("callback_processed") is True
                    or test_data.get("callback_in_progress") is True
                    or test_data.get("auth_code_consumed") is True
                    or test_data.get("status") == "COMPLETED"
                ):
                    conn.rollback()
                    return False, test_data

                test_data["callback_in_progress"] = True
                test_data["auth_code_consumed"] = True
                test_data["updated_at"] = now

                conn.execute("""
                    UPDATE tests SET
                        updated_at = ?,
                        data_json = ?
                    WHERE test_id = ?;
                """, (now, json.dumps(test_data), test_id))
                conn.commit()
                return True, test_data

    def update_test(self, test_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Applies field updates to an existing test session in durable storage."""
        now = datetime.now(timezone.utc).isoformat()
        with self._lock:
            with self._get_connection() as conn:
                cur = conn.execute("SELECT data_json FROM tests WHERE test_id = ?;", (test_id,))
                row = cur.fetchone()
                if not row:
                    return None

                try:
                    test_data = json.loads(row["data_json"])
                except Exception:
                    test_data = {}

                test_data.update(updates)
                test_data["updated_at"] = now
                if not test_data.get("started_at"):
                    test_data["started_at"] = test_data.get("created_at") or now

                # Keep completed_at and step counts accurate
                steps = test_data.get("steps") or []
                completed_count = sum(
                    1 for s in steps
                    if (isinstance(s, dict) and 0 < s.get("status", 0) < 400 and s.get("status") != 428)
                )
                pending_count = len(steps) - completed_count if steps else 0
                test_data["completed_steps_count"] = completed_count
                test_data["pending_steps_count"] = pending_count

                if test_data.get("status") == "COMPLETED":
                    if not test_data.get("completed_at"):
                        test_data["completed_at"] = now
                elif test_data.get("status") in ["RUNNING", "AWAITING_AUTHORIZATION", "AWAITING_CREDENTIAL", "PENDING_VERIFICATION", "RESET"]:
                    test_data["completed_at"] = None

                status = test_data.get("status")
                outcome = test_data.get("outcome")
                oauth_state = test_data.get("oauth_state")

                conn.execute("""
                    UPDATE tests SET
                        status = ?,
                        outcome = ?,
                        oauth_state = ?,
                        updated_at = ?,
                        data_json = ?
                    WHERE test_id = ?;
                """, (status, outcome, oauth_state, now, json.dumps(test_data), test_id))
                conn.commit()
                return test_data

    def reset_test(self, test_id: str) -> Optional[Dict[str, Any]]:
        """Resets the state of a test session to IDLE."""
        now = datetime.now(timezone.utc).isoformat()
        with self._lock:
            with self._get_connection() as conn:
                cur = conn.execute("SELECT data_json FROM tests WHERE test_id = ?;", (test_id,))
                row = cur.fetchone()
                if not row:
                    return None

                try:
                    test_data = json.loads(row["data_json"])
                except Exception:
                    test_data = {}

                test_data["status"] = "RESET"
                test_data["current_step_index"] = 0
                test_data["outcome"] = None
                test_data["updated_at"] = now

                conn.execute("""
                    UPDATE tests SET
                        status = 'RESET',
                        outcome = NULL,
                        updated_at = ?,
                        data_json = ?
                    WHERE test_id = ?;
                """, (now, json.dumps(test_data), test_id))

                conn.execute("""
                    INSERT INTO events (event_id, test_id, event_type, message, timestamp, payload_json)
                    VALUES (?, ?, ?, ?, ?, ?);
                """, (
                    str(uuid.uuid4()), test_id, "TEST_RESET", f"Test session {test_id} has been reset.", now, "{}"
                ))
                conn.commit()
                return test_data

    def list_tests(self) -> List[Dict[str, Any]]:
        """Returns all test sessions ordered by most recent update/execution descending."""
        tests = []
        with self._lock:
            with self._get_connection() as conn:
                cur = conn.execute("SELECT data_json FROM tests ORDER BY updated_at DESC, created_at DESC;")
                for row in cur.fetchall():
                    try:
                        tests.append(json.loads(row["data_json"]))
                    except Exception:
                        pass
        return tests

    def get_state_digest(self) -> Dict[str, Any]:
        """Returns a lightweight digest of the latest test store state for real-time SSE streaming."""
        with self._lock:
            with self._get_connection() as conn:
                cur = conn.execute(
                    "SELECT COUNT(*) AS cnt, MAX(updated_at) AS max_upd FROM tests;"
                )
                row = cur.fetchone()
                cnt = int(row["cnt"]) if row and row["cnt"] is not None else 0
                max_upd = row["max_upd"] if row else None
                latest_id = None
                latest_status = None
                latest_outcome = None
                latest_step_index = 0
                latest_duration_ms = 0.0
                completed_steps_count = 0
                pending_steps_count = 0
                if cnt > 0:
                    cur2 = conn.execute(
                        "SELECT test_id, status, outcome, data_json FROM tests ORDER BY updated_at DESC, created_at DESC LIMIT 1;"
                    )
                    r2 = cur2.fetchone()
                    if r2:
                        latest_id = r2["test_id"]
                        latest_status = r2["status"]
                        latest_outcome = r2["outcome"]
                        try:
                            dj = json.loads(r2["data_json"])
                            latest_step_index = dj.get("current_step_index", 0)
                            latest_duration_ms = dj.get("duration_ms", 0.0)
                            completed_steps_count = dj.get("completed_steps_count", 0)
                            pending_steps_count = dj.get("pending_steps_count", 0)
                        except Exception:
                            pass
                return {
                    "total_tests": cnt,
                    "latest_updated_at": max_upd,
                    "latest_test_id": latest_id,
                    "latest_status": latest_status,
                    "latest_outcome": latest_outcome,
                    "latest_step_index": latest_step_index,
                    "latest_duration_ms": latest_duration_ms,
                    "completed_steps_count": completed_steps_count,
                    "pending_steps_count": pending_steps_count
                }


# Global singleton instance with durable SQLite storage
test_store = DurableTestStore()

# Backward compatibility alias
InMemoryTestStore = DurableTestStore
__all__ = ["test_store", "DurableTestStore", "InMemoryTestStore"]
