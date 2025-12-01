import os
import uuid
import json
import logging
import threading
from datetime import datetime
from typing import Optional, List, Dict, Any, Set

import asyncio
import bcrypt
import psycopg
from psycopg.rows import dict_row
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.websockets import WebSocketState
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# LOGGING
# ---------------------------------------------------------------------------

logger = logging.getLogger("med_ocr_backend")
logging.basicConfig(level=logging.INFO)

# ---------------------------------------------------------------------------
# DB CONFIG
# ---------------------------------------------------------------------------

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "med_ocr_db")
DB_USER = os.getenv("DB_USER", "admin")
DB_PASSWORD = os.getenv("DB_PASSWORD", "Redcats10112003*")


def get_connection() -> psycopg.Connection:
    """Open a new PostgreSQL connection using psycopg v3."""
    return psycopg.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        row_factory=dict_row,
    )


# ---------------------------------------------------------------------------
# DB SCHEMA BOOTSTRAP (IDEMPOTENT)
# ---------------------------------------------------------------------------

def init_db() -> None:
    """
    Create tables if they do not exist, ensure medication_key exists,
    set up NOTIFY trigger for medications changes,
    and ensure name/email/display_name/password_hash live on users.
    """

    # USERS owns first_name, last_name, email, display_name, password_hash
    ddl_users = """
    CREATE TABLE IF NOT EXISTS users (
        id             SERIAL PRIMARY KEY,
        user_key       TEXT UNIQUE NOT NULL,
        email          TEXT,
        display_name   TEXT,
        first_name     TEXT,
        last_name      TEXT,
        password_hash  TEXT,
        created_at     TIMESTAMPTZ DEFAULT NOW(),
        updated_at     TIMESTAMPTZ DEFAULT NOW()
    );
    """

    # USER_PROFILES now only holds extra info, not name/email/display_name
    ddl_profiles = """
    CREATE TABLE IF NOT EXISTS user_profiles (
        id           SERIAL PRIMARY KEY,
        user_key     TEXT NOT NULL REFERENCES users(user_key) ON DELETE CASCADE,
        nickname     TEXT,
        age          INTEGER,
        gender       TEXT,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        updated_at   TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (user_key)
    );
    """

    ddl_meds = """
    CREATE TABLE IF NOT EXISTS medications (
        id              SERIAL PRIMARY KEY,
        user_key        TEXT NOT NULL REFERENCES users(user_key) ON DELETE CASCADE,
        medication_key  TEXT UNIQUE,
        drug_name       TEXT,
        strength        TEXT,
        route           TEXT,
        instruction     TEXT,
        frequency_text  TEXT,
        qty_text        TEXT,
        refills_text    TEXT,
        is_active       BOOLEAN DEFAULT TRUE,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
    );
    """

    ddl_events = """
    CREATE TABLE IF NOT EXISTS med_events (
        id            SERIAL PRIMARY KEY,
        user_key      TEXT NOT NULL REFERENCES users(user_key) ON DELETE CASCADE,
        medication_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
        event_time    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        event_type    TEXT NOT NULL,
        source        TEXT,
        metadata      JSONB,
        created_at    TIMESTAMPTZ DEFAULT NOW()
    );
    """

    ddl_user_settings = """
    CREATE TABLE IF NOT EXISTS user_settings (
        id              SERIAL PRIMARY KEY,
        user_key        TEXT NOT NULL REFERENCES users(user_key) ON DELETE CASCADE,
        confirmation_window_minutes INTEGER DEFAULT 30,
        use_rfid_confirmation       BOOLEAN DEFAULT FALSE,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (user_key)
    );
    """

    alter_medication_key = """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'medications'
              AND column_name = 'medication_key'
        ) THEN
            ALTER TABLE medications
                ADD COLUMN medication_key TEXT;
        END IF;
    END$$;
    """

    # Ensure password_hash + first_name + last_name exist on users for existing DBs
    alter_users_add_cols = """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'first_name'
        ) THEN
            ALTER TABLE users ADD COLUMN first_name TEXT;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'last_name'
        ) THEN
            ALTER TABLE users ADD COLUMN last_name TEXT;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'password_hash'
        ) THEN
            ALTER TABLE users ADD COLUMN password_hash TEXT;
        END IF;
    END$$;
    """

    # Migrate name/email/display_name from user_profiles to users if those columns exist
    migrate_profiles_to_users = """
    DO $$
    BEGIN
        BEGIN
            UPDATE users u
            SET
                first_name   = COALESCE(u.first_name, p.first_name),
                last_name    = COALESCE(u.last_name,  p.last_name),
                email        = COALESCE(u.email,      p.email),
                display_name = COALESCE(u.display_name, p.display_name),
                updated_at   = NOW()
            FROM user_profiles p
            WHERE p.user_key = u.user_key;
        EXCEPTION
            WHEN undefined_column THEN
                -- On fresh DBs these columns never existed, so just ignore.
                NULL;
        END;
    END$$;
    """

    # Drop obsolete columns from user_profiles if they still exist
    alter_profiles_drop_cols = """
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user_profiles' AND column_name = 'first_name'
        ) THEN
            ALTER TABLE user_profiles DROP COLUMN first_name;
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user_profiles' AND column_name = 'last_name'
        ) THEN
            ALTER TABLE user_profiles DROP COLUMN last_name;
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user_profiles' AND column_name = 'email'
        ) THEN
            ALTER TABLE user_profiles DROP COLUMN email;
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user_profiles' AND column_name = 'display_name'
        ) THEN
            ALTER TABLE user_profiles DROP COLUMN display_name;
        END IF;
    END$$;
    """

    # Trigger function + trigger for NOTIFY
    ddl_notify_function = """
    CREATE OR REPLACE FUNCTION notify_medications_change() RETURNS trigger AS $$
    DECLARE
        payload_json JSON;
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            payload_json = json_build_object(
                'table', TG_TABLE_NAME,
                'operation', TG_OP,
                'id', OLD.id,
                'user_key', OLD.user_key
            );
        ELSE
            payload_json = json_build_object(
                'table', TG_TABLE_NAME,
                'operation', TG_OP,
                'id', NEW.id,
                'user_key', NEW.user_key
            );
        END IF;

        PERFORM pg_notify('medications_changes', payload_json::text);
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
    """

    ddl_notify_trigger = """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_trigger
            WHERE tgname = 'trg_notify_medications_change'
        ) THEN
            CREATE TRIGGER trg_notify_medications_change
            AFTER INSERT OR UPDATE OR DELETE ON medications
            FOR EACH ROW EXECUTE FUNCTION notify_medications_change();
        END IF;
    END$$;
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            # Base tables
            cur.execute(ddl_users)
            cur.execute(ddl_profiles)
            cur.execute(ddl_meds)
            cur.execute(ddl_events)
            cur.execute(ddl_user_settings)
            cur.execute(alter_medication_key)

            # Migrations for existing DBs
            cur.execute(alter_users_add_cols)
            cur.execute(migrate_profiles_to_users)
            cur.execute(alter_profiles_drop_cols)

            # Backfill any NULL medication_key values
            cur.execute(
                """
                UPDATE medications
                SET medication_key = 'MED_' || id
                WHERE medication_key IS NULL;
                """
            )

            # Try to enforce NOT NULL on medication_key
            cur.execute(
                """
                DO $$
                BEGIN
                    BEGIN
                        ALTER TABLE medications
                            ALTER COLUMN medication_key SET NOT NULL;
                    EXCEPTION
                        WHEN others THEN
                            NULL;
                    END;
                END$$;
                """
            )

            # Set up NOTIFY trigger
            cur.execute(ddl_notify_function)
            cur.execute(ddl_notify_trigger)

        conn.commit()


def generate_medication_key() -> str:
    return "MED_" + uuid.uuid4().hex


# ---------------------------------------------------------------------------
# Pydantic MODELS
# ---------------------------------------------------------------------------

class SignupRequest(BaseModel):
    user_key: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: Optional[str] = None
    user_key: Optional[str] = None
    password: str


class UserResponse(BaseModel):
    id: int
    user_key: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class UserProfileModel(BaseModel):
    id: int
    user_key: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    nickname: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    email: Optional[str] = None
    display_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class UserProfileUpsert(BaseModel):
    user_key: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    nickname: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    email: Optional[str] = None
    display_name: Optional[str] = None


class ProfileSummary(BaseModel):
    user_key: str
    nickname: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None


class MedicationCreate(BaseModel):
    user_key: str
    drug_name: Optional[str] = None
    strength: Optional[str] = None
    route: Optional[str] = None
    instruction: Optional[str] = None
    frequency_text: Optional[str] = None
    qty_text: Optional[str] = None
    refills_text: Optional[str] = None
    medication_key: Optional[str] = None
    id: Optional[int] = None
    is_active: Optional[bool] = None


class MedicationModel(BaseModel):
    id: int
    user_key: str
    medication_key: str
    drug_name: Optional[str] = None
    strength: Optional[str] = None
    route: Optional[str] = None
    instruction: Optional[str] = None
    frequency_text: Optional[str] = None
    qty_text: Optional[str] = None
    refills_text: Optional[str] = None
    is_active: Optional[bool] = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class MedEventCreate(BaseModel):
    user_key: str
    medication_id: int
    event_time: Optional[datetime] = None
    event_type: str
    source: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class MedEventModel(BaseModel):
    id: int
    user_key: str
    medication_id: int
    event_time: datetime
    event_type: str
    source: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None


class UserSettingsModel(BaseModel):
    user_key: str
    confirmation_window_minutes: Optional[int] = 30
    use_rfid_confirmation: Optional[bool] = False


# ---------------------------------------------------------------------------
# FASTAPI APP & CORS
# ---------------------------------------------------------------------------

app = FastAPI(title="Med OCR Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later if desired
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# WEBSOCKET CONNECTION MANAGER
# ---------------------------------------------------------------------------

class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: Set[WebSocket] = set()
        self._lock = threading.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        with self._lock:
            self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        dead: List[WebSocket] = []
        with self._lock:
            conns = list(self.active_connections)

        for ws in conns:
            try:
                if ws.application_state == WebSocketState.CONNECTED:
                    await ws.send_text(json.dumps(message))
                else:
                    dead.append(ws)
            except Exception:
                dead.append(ws)

        if dead:
            with self._lock:
                for ws in dead:
                    if ws in self.active_connections:
                        self.active_connections.remove(ws)


manager = ConnectionManager()


# ---------------------------------------------------------------------------
# LISTEN THREAD (psycopg3-safe)
# ---------------------------------------------------------------------------

def listen_for_medication_changes() -> None:
    """
    Blocking loop that LISTENs on the medications_changes channel
    and dispatches notifications to all connected WebSocket clients.
    Runs in its own daemon thread.
    """
    logger.info("Starting PostgreSQL LISTEN thread for medications_changes")
    try:
        conn = psycopg.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            autocommit=True,  # required for LISTEN/NOTIFY
        )
    except Exception as e:
        logger.exception("Failed to open LISTEN connection: %s", e)
        return

    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute("LISTEN medications_changes;")
                logger.info("LISTEN thread: subscribed to medications_changes")

            # psycopg3: blocks and yields notifications as they arrive
            for notify in conn.notifies():
                try:
                    payload = json.loads(notify.payload)
                except Exception:
                    logger.exception(
                        "Failed to decode notification payload: %r",
                        notify.payload,
                    )
                    payload = {"raw": notify.payload}

                try:
                    # Fire-and-forget broadcast on a fresh event loop
                    asyncio.run(manager.broadcast(payload))
                except Exception:
                    logger.exception("Error broadcasting medication update")
    except Exception as e:
        logger.exception("LISTEN thread fatal error: %s", e)
    finally:
        try:
            conn.close()
        except Exception:
            pass
        logger.info("LISTEN thread exiting")


def start_listen_thread() -> None:
    """
    Start a background daemon thread to LISTEN on the 'medications_changes' channel
    and broadcast to all WebSocket clients.
    """
    t = threading.Thread(
        target=listen_for_medication_changes,
        name="medications_listen",
        daemon=True,
    )
    t.start()


# ---------------------------------------------------------------------------
# LIFECYCLE
# ---------------------------------------------------------------------------

@app.on_event("startup")
def on_startup() -> None:
    init_db()
    start_listen_thread()
    logger.info("Startup complete: DB initialized and LISTEN thread started")


# ---------------------------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    logger.info("Health endpoint called")
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# USER ENDPOINTS
# ---------------------------------------------------------------------------

@app.post("/api/signup", response_model=UserResponse)
def signup(payload: SignupRequest):
    """
    Create or update a user by user_key.
    Stores password_hash (bcrypt) if password is provided.
    """
    try:
        logger.info("Signup request for user_key=%s email=%s", payload.user_key, payload.email)
        password_hash: Optional[str] = None
        if payload.password:
            password_hash = bcrypt.hashpw(
                payload.password.encode("utf-8"),
                bcrypt.gensalt()
            ).decode("utf-8")

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO users (
                        user_key, email, display_name,
                        first_name, last_name, password_hash
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (user_key)
                    DO UPDATE SET
                        email        = EXCLUDED.email,
                        display_name = EXCLUDED.display_name,
                        first_name   = COALESCE(EXCLUDED.first_name, users.first_name),
                        last_name    = COALESCE(EXCLUDED.last_name,  users.last_name),
                        password_hash= COALESCE(EXCLUDED.password_hash, users.password_hash),
                        updated_at   = NOW()
                    RETURNING
                        id, user_key, email, display_name,
                        first_name, last_name, created_at, updated_at;
                    """,
                    (
                        payload.user_key,
                        payload.email,
                        payload.display_name,
                        payload.first_name,
                        payload.last_name,
                        password_hash,
                    ),
                )
                row = cur.fetchone()
            conn.commit()

        if not row:
            raise HTTPException(status_code=500, detail="Failed to create user")
        logger.info("Signup success id=%s user_key=%s", row["id"], row["user_key"])
        return row
    except Exception as e:
        logger.error("Signup error: %s", e)
        raise HTTPException(status_code=500, detail=f"DB error in signup: {e}")


@app.post("/api/login", response_model=UserResponse)
def login(payload: LoginRequest):
    """
    Login with either email+password or user_key+password.
    Returns the user record (without password_hash) on success.
    """
    if not payload.email and not payload.user_key:
        raise HTTPException(status_code=400, detail="email or user_key is required")

    try:
        with get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                if payload.email:
                    cur.execute(
                        """
                        SELECT id, user_key, email, display_name,
                               first_name, last_name,
                               password_hash, created_at, updated_at
                        FROM users
                        WHERE email = %s;
                        """,
                        (payload.email,),
                    )
                else:
                    cur.execute(
                        """
                        SELECT id, user_key, email, display_name,
                               first_name, last_name,
                               password_hash, created_at, updated_at
                        FROM users
                        WHERE user_key = %s;
                        """,
                        (payload.user_key,),
                    )
                row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        stored_hash = row.get("password_hash")
        if not stored_hash:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if not bcrypt.checkpw(
            payload.password.encode("utf-8"),
            stored_hash.encode("utf-8"),
        ):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Remove password_hash from response
        row.pop("password_hash", None)
        return row
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Login error: %s", e)
        raise HTTPException(status_code=500, detail=f"DB error in login: {e}")


@app.get("/api/profile", response_model=UserProfileModel)
def get_profile(user_key: str = Query(...)):
    """
    Combined view:
      - users: first_name, last_name, email, display_name
      - user_profiles: nickname, age, gender
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        u.id,
                        u.user_key,
                        u.first_name,
                        u.last_name,
                        p.nickname,
                        p.age,
                        p.gender,
                        u.email,
                        u.display_name,
                        u.created_at,
                        u.updated_at
                    FROM users u
                    LEFT JOIN user_profiles p
                      ON p.user_key = u.user_key
                    WHERE u.user_key = %s;
                    """,
                    (user_key,),
                )
                row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Profile not found")
        return row
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error fetching profile: {e}")


@app.post("/api/profile", response_model=UserProfileModel)
def upsert_profile(payload: UserProfileUpsert):
    """
    Upsert profile data:
      - first_name, last_name, email, display_name -> users
      - nickname, age, gender -> user_profiles
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Upsert into users
                cur.execute(
                    """
                    INSERT INTO users (
                        user_key, email, display_name,
                        first_name, last_name
                    )
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (user_key)
                    DO UPDATE SET
                        email        = EXCLUDED.email,
                        display_name = EXCLUDED.display_name,
                        first_name   = EXCLUDED.first_name,
                        last_name    = EXCLUDED.last_name,
                        updated_at   = NOW();
                    """,
                    (
                        payload.user_key,
                        payload.email,
                        payload.display_name,
                        payload.first_name,
                        payload.last_name,
                    ),
                )

                # Upsert into user_profiles
                cur.execute(
                    """
                    INSERT INTO user_profiles (
                        user_key, nickname, age, gender
                    )
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (user_key)
                    DO UPDATE SET
                        nickname   = EXCLUDED.nickname,
                        age        = EXCLUDED.age,
                        gender     = EXCLUDED.gender,
                        updated_at = NOW();
                    """,
                    (
                        payload.user_key,
                        payload.nickname,
                        payload.age,
                        payload.gender,
                    ),
                )

                # Return combined view
                cur.execute(
                    """
                    SELECT
                        u.id,
                        u.user_key,
                        u.first_name,
                        u.last_name,
                        p.nickname,
                        p.age,
                        p.gender,
                        u.email,
                        u.display_name,
                        u.created_at,
                        u.updated_at
                    FROM users u
                    LEFT JOIN user_profiles p
                      ON p.user_key = u.user_key
                    WHERE u.user_key = %s;
                    """,
                    (payload.user_key,),
                )
                row = cur.fetchone()
            conn.commit()

        if not row:
            raise HTTPException(status_code=500, detail="Failed to upsert profile")
        return row
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error upserting profile: {e}")


@app.get("/api/profiles", response_model=List[ProfileSummary])
def list_profiles():
    """
    Return all profiles that exist in the user_profiles table.
    Note: user_profiles now only holds nickname, age, gender.
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT user_key, nickname, age, gender
                    FROM user_profiles
                    ORDER BY user_key;
                    """
                )
                rows = cur.fetchall()
        # rows are dict_row, so we can feed directly
        return [
            ProfileSummary(
                user_key=row["user_key"],
                nickname=row.get("nickname"),
                age=row.get("age"),
                gender=row.get("gender"),
            )
            for row in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error fetching profiles: {e}")


# ---------------------------------------------------------------------------
# USER SETTINGS ENDPOINTS
# ---------------------------------------------------------------------------

@app.post("/api/user_settings", response_model=UserSettingsModel)
def upsert_user_settings(payload: UserSettingsModel):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Ensure user exists
                cur.execute(
                    """
                    INSERT INTO users (user_key)
                    VALUES (%s)
                    ON CONFLICT (user_key) DO NOTHING;
                    """,
                    (payload.user_key,),
                )

                cur.execute(
                    """
                    INSERT INTO user_settings (
                        user_key,
                        confirmation_window_minutes,
                        use_rfid_confirmation
                    )
                    VALUES (%s, %s, %s)
                    ON CONFLICT (user_key)
                    DO UPDATE SET
                        confirmation_window_minutes = EXCLUDED.confirmation_window_minutes,
                        use_rfid_confirmation       = EXCLUDED.use_rfid_confirmation,
                        updated_at                  = NOW()
                    RETURNING user_key, confirmation_window_minutes, use_rfid_confirmation;
                    """,
                    (
                        payload.user_key,
                        payload.confirmation_window_minutes,
                        payload.use_rfid_confirmation,
                    ),
                )
                row = cur.fetchone()
            conn.commit()
        if not row:
            raise HTTPException(status_code=500, detail="Failed to upsert user settings")
        return row
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error upserting user settings: {e}")


@app.get("/api/user_settings", response_model=UserSettingsModel)
def get_user_settings(user_key: str = Query(...)):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT user_key, confirmation_window_minutes, use_rfid_confirmation
                    FROM user_settings
                    WHERE user_key = %s;
                    """,
                    (user_key,),
                )
                row = cur.fetchone()
        if not row:
            # return defaults if none present yet
            return {
                "user_key": user_key,
                "confirmation_window_minutes": 30,
                "use_rfid_confirmation": False,
            }
        return row
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error fetching user settings: {e}")


# ---------------------------------------------------------------------------
# MEDICATION ENDPOINTS
# ---------------------------------------------------------------------------

@app.get("/api/medications", response_model=List[MedicationModel])
def list_medications(user_key: str = Query(...)):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, user_key, medication_key, drug_name, strength,
                           route, instruction, frequency_text,
                           qty_text, refills_text, is_active,
                           created_at, updated_at
                    FROM medications
                    WHERE user_key = %s
                    ORDER BY id;
                    """,
                    (user_key,),
                )
                rows = cur.fetchall()
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error fetching medications: {e}")


@app.post("/api/medications", response_model=MedicationModel)
def upsert_medication(payload: MedicationCreate):
    """
    Create or update a medication.
    If medication_key (or id) is present, update; else, create.
    """
    data = payload.dict()
    med_key = data.get("medication_key") or data.get("id")
    user_key = data.get("user_key")

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                if med_key:
                    # Update existing medication (by medication_key or id)
                    cur.execute(
                        """
                        UPDATE medications
                        SET
                            drug_name      = COALESCE(%s, drug_name),
                            strength       = COALESCE(%s, strength),
                            route          = COALESCE(%s, route),
                            instruction    = COALESCE(%s, instruction),
                            frequency_text = COALESCE(%s, frequency_text),
                            qty_text       = COALESCE(%s, qty_text),
                            refills_text   = COALESCE(%s, refills_text),
                            is_active      = COALESCE(%s, is_active),
                            updated_at     = NOW()
                        WHERE (medication_key = %s OR id::text = %s)
                          AND user_key = %s
                        RETURNING id, user_key, medication_key, drug_name, strength,
                                  route, instruction, frequency_text,
                                  qty_text, refills_text, is_active,
                                  created_at, updated_at;
                        """,
                        (
                            data.get("drug_name"),
                            data.get("strength"),
                            data.get("route"),
                            data.get("instruction"),
                            data.get("frequency_text"),
                            data.get("qty_text"),
                            data.get("refills_text"),
                            data.get("is_active"),
                            str(med_key),
                            str(med_key),
                            user_key,
                        ),
                    )
                    row = cur.fetchone()
                    conn.commit()
                    if not row:
                        raise HTTPException(status_code=404, detail="Medication not found")
                    return row
                else:
                    # Create new medication
                    new_med_key = generate_medication_key()
                    cur.execute(
                        """
                        INSERT INTO medications (
                            user_key, medication_key,
                            drug_name, strength, route, instruction,
                            frequency_text, qty_text, refills_text
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id, user_key, medication_key, drug_name, strength,
                                  route, instruction, frequency_text,
                                  qty_text, refills_text, is_active,
                                  created_at, updated_at;
                        """,
                        (
                            user_key,
                            new_med_key,
                            data.get("drug_name"),
                            data.get("strength"),
                            data.get("route"),
                            data.get("instruction"),
                            data.get("frequency_text"),
                            data.get("qty_text"),
                            data.get("refills_text"),
                        ),
                    )
                    row = cur.fetchone()
                    conn.commit()
                    if not row:
                        raise HTTPException(status_code=500, detail="Failed to create medication")
                    return row
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error upserting medication: {e}")


@app.delete("/api/medications/{identifier}")
def delete_medication(identifier: str):
    """
    Delete a medication by either medication_key (e.g. 'MED_xxx') or numeric id.
    Frontend now prefers sending medication_key.
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    DELETE FROM medications
                    WHERE medication_key = %s
                       OR id::text = %s
                    RETURNING id;
                    """,
                    (identifier, identifier),
                )
                row = cur.fetchone()
            conn.commit()

        if not row:
            raise HTTPException(status_code=404, detail="Not Found")

        return {"status": "deleted", "id": row["id"]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error deleting medication: {e}")


# ---------------------------------------------------------------------------
# MED EVENT ENDPOINTS
# ---------------------------------------------------------------------------

@app.get("/api/events", response_model=List[MedEventModel])
def list_events(user_key: str = Query(...)):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, user_key, medication_id,
                           event_time, event_type, source, metadata,
                           created_at
                    FROM med_events
                    WHERE user_key = %s
                    ORDER BY event_time DESC;
                    """,
                    (user_key,),
                )
                rows = cur.fetchall()
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error fetching events: {e}")


@app.post("/api/events", response_model=MedEventModel)
def create_event(payload: MedEventCreate):
    event_time = payload.event_time or datetime.utcnow()
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO med_events (
                        user_key, medication_id, event_time,
                        event_type, source, metadata
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id, user_key, medication_id,
                              event_time, event_type, source,
                              metadata, created_at;
                    """,
                    (
                        payload.user_key,
                        payload.medication_id,
                        event_time,
                        payload.event_type,
                        payload.source,
                        payload.metadata,
                    ),
                )
                row = cur.fetchone()
            conn.commit()
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create event")
        return row
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error creating event: {e}")


# ---------------------------------------------------------------------------
# WEBSOCKET ENDPOINT
# ---------------------------------------------------------------------------

@app.websocket("/ws/updates")
async def websocket_updates(websocket: WebSocket):
    await manager.connect(websocket)
    logger.info("WebSocket client connected")
    try:
        while True:
            # Wait for messages or disconnect; during shutdown uvicorn will
            # cancel this task, and we let that propagate so shutdown is clean.
            msg = await websocket.receive_text()
            logger.debug(f"WS received: {msg}")
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)
