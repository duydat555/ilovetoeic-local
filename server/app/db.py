import json
import re
from contextlib import contextmanager
from pathlib import Path
from urllib.parse import quote, unquote

import pymysql

from app import config
from app.utils.html_cleaner import clean_html_text


class Database:
    """Small MySQL data-access layer used by every API router."""

    def __init__(self):
        self.query_ram_cache = {}
        self.gdrive_map = {}
        self.is_connected = False
        self.last_error = None
        self.load_gdrive_mapping()
        self.initialize()

    def _connect(self, autocommit=True):
        options = {
            "host": config.DB_HOST,
            "port": config.DB_PORT,
            "user": config.DB_USER,
            "password": config.DB_PASSWORD,
            "charset": "utf8mb4",
            "cursorclass": pymysql.cursors.DictCursor,
            "autocommit": autocommit,
            "connect_timeout": 5,
            "database": config.DB_NAME,
        }
        return pymysql.connect(**options)

    def initialize(self):
        try:
            schema_path = config.BASE_DIR / "mysql_schema.sql"
            if schema_path.exists():
                schema = "\n".join(
                    line
                    for line in schema_path.read_text(encoding="utf-8").splitlines()
                    if not line.strip().startswith("--")
                )
                statements = [
                    statement.strip()
                    for statement in schema.split(";")
                    if statement.strip()
                ]
                with self._connect() as conn:
                    with conn.cursor() as cursor:
                        for statement in statements:
                            cursor.execute(statement)
                        cursor.execute("SHOW COLUMNS FROM users LIKE 'role'")
                        role_column = cursor.fetchone()
                        if role_column is None:
                            cursor.execute(
                                "ALTER TABLE users ADD COLUMN role "
                                "ENUM('student', 'admin') NOT NULL DEFAULT 'student' "
                                "AFTER full_name"
                            )
                        elif "'ta'" in str(role_column.get("Type", "")).lower():
                            # The assistant role has been retired. Existing assistant
                            # accounts become students; the single admin remains the
                            # only teacher account in the system.
                            cursor.execute(
                                "UPDATE users SET role = 'student' WHERE role = 'ta'"
                            )
                            cursor.execute(
                                "ALTER TABLE users MODIFY COLUMN role "
                                "ENUM('student', 'admin') NOT NULL DEFAULT 'student'"
                            )
                        cursor.execute("SHOW COLUMNS FROM users LIKE 'admin_guard'")
                        if cursor.fetchone() is None:
                            cursor.execute(
                                "ALTER TABLE users ADD COLUMN admin_guard TINYINT "
                                "GENERATED ALWAYS AS (CASE WHEN role = 'admin' "
                                "THEN 1 ELSE NULL END) STORED AFTER role"
                            )
                        cursor.execute(
                            "SHOW INDEX FROM users WHERE Key_name = 'uq_users_single_admin'"
                        )
                        if cursor.fetchone() is None:
                            cursor.execute(
                                "ALTER TABLE users ADD UNIQUE KEY "
                                "uq_users_single_admin (admin_guard)"
                            )
                        cursor.execute("SHOW COLUMNS FROM users LIKE 'approval_status'")
                        approval_status_created = cursor.fetchone() is None
                        if approval_status_created:
                            cursor.execute(
                                "ALTER TABLE users ADD COLUMN approval_status "
                                "ENUM('pending', 'approved', 'rejected') "
                                "NOT NULL DEFAULT 'pending' AFTER role"
                            )
                        cursor.execute("SHOW COLUMNS FROM users LIKE 'approved_at'")
                        if cursor.fetchone() is None:
                            cursor.execute(
                                "ALTER TABLE users ADD COLUMN approved_at DATETIME NULL "
                                "AFTER approval_status"
                            )
                        cursor.execute("SHOW COLUMNS FROM users LIKE 'approved_by'")
                        if cursor.fetchone() is None:
                            cursor.execute(
                                "ALTER TABLE users ADD COLUMN approved_by CHAR(36) NULL "
                                "AFTER approved_at"
                            )
                        if approval_status_created:
                            # Accounts created before approval was introduced must
                            # keep working. New accounts retain the pending default.
                            cursor.execute(
                                "UPDATE users SET approval_status = 'approved', "
                                "approved_at = COALESCE(approved_at, created_at)"
                            )
                        cursor.execute(
                            "SHOW INDEX FROM users WHERE Key_name = 'idx_users_approval_status'"
                        )
                        if cursor.fetchone() is None:
                            cursor.execute(
                                "ALTER TABLE users ADD INDEX "
                                "idx_users_approval_status (approval_status)"
                            )
                        # Rejected rows from older builds are no longer retained.
                        cursor.execute(
                            "DELETE FROM users "
                            "WHERE role = 'student' AND approval_status = 'rejected'"
                        )
                        access_columns = {
                            "is_frozen": (
                                "ALTER TABLE users ADD COLUMN is_frozen "
                                "TINYINT(1) NOT NULL DEFAULT 0 AFTER approved_by"
                            ),
                            "frozen_at": (
                                "ALTER TABLE users ADD COLUMN frozen_at DATETIME NULL "
                                "AFTER is_frozen"
                            ),
                            "access_expires_at": (
                                "ALTER TABLE users ADD COLUMN access_expires_at DATETIME NULL "
                                "AFTER frozen_at"
                            ),
                        }
                        for column_name, statement in access_columns.items():
                            cursor.execute("SHOW COLUMNS FROM users LIKE %s", (column_name,))
                            if cursor.fetchone() is None:
                                cursor.execute(statement)
                        cursor.execute(
                            "SHOW INDEX FROM users WHERE Key_name = 'idx_users_access_expires_at'"
                        )
                        if cursor.fetchone() is None:
                            cursor.execute(
                                "ALTER TABLE users ADD INDEX "
                                "idx_users_access_expires_at (access_expires_at)"
                            )
                        cursor.execute(
                            "ALTER TABLE users MODIFY COLUMN avatar_url MEDIUMTEXT NULL"
                        )
                        cursor.execute("SHOW COLUMNS FROM users LIKE 'last_active_at'")
                        if cursor.fetchone() is None:
                            cursor.execute("ALTER TABLE users ADD COLUMN last_active_at DATETIME NULL AFTER last_study_date")
                        cursor.execute(
                            "UPDATE user_sessions SET expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 3650 DAY) WHERE expires_at < DATE_ADD(UTC_TIMESTAMP(), INTERVAL 100 DAY)"
                        )
                        cursor.execute(
                            """
                            CREATE TABLE IF NOT EXISTS user_feedback (
                                id CHAR(36) PRIMARY KEY,
                                user_id CHAR(36) NOT NULL,
                                type ENUM('feature_request', 'suggestion') NOT NULL DEFAULT 'feature_request',
                                title VARCHAR(255) NOT NULL,
                                description TEXT NOT NULL,
                                images JSON NULL,
                                status ENUM('pending', 'in_progress', 'resolved', 'rejected') NOT NULL DEFAULT 'pending',
                                admin_response TEXT NULL,
                                responded_at DATETIME NULL,
                                responded_by CHAR(36) NULL,
                                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                                INDEX idx_feedback_user_created (user_id, created_at),
                                INDEX idx_feedback_status_created (status, created_at)
                            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                            """
                        )
                        cursor.execute(
                            """
                            INSERT INTO admin_feature_statuses (
                                route, status, title, description, icon_key, action_label, action_path, sort_order
                            ) VALUES (
                                '/admin/feedback', 'ready', 'Quản lý Góp ý', 'Xem và phản hồi ý kiến, đóng góp từ học viên.', 'message-square', NULL, NULL, 45
                            ) ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);
                            """
                        )
                        cursor.execute(
                            """
                            INSERT INTO feature_flags (feature_key, is_enabled) VALUES ('feedback', 1)
                            ON DUPLICATE KEY UPDATE feature_key = VALUES(feature_key);
                            """
                        )
                        cursor.execute(
                            """
                            INSERT INTO feature_flags (feature_key, is_enabled) VALUES ('national_day_theme', 0)
                            ON DUPLICATE KEY UPDATE feature_key = VALUES(feature_key);
                            """
                        )
                        cursor.execute(
                            """
                            CREATE TABLE IF NOT EXISTS community_messages (
                                id CHAR(36) PRIMARY KEY,
                                user_id CHAR(36) NOT NULL,
                                parent_id CHAR(36) NULL,
                                content TEXT NOT NULL,
                                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                CONSTRAINT fk_community_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                                INDEX idx_community_created (created_at DESC)
                            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                            """
                        )
                        try:
                            cursor.execute("ALTER TABLE community_messages ADD COLUMN parent_id CHAR(36) NULL;")
                        except Exception:
                            pass
                        cursor.execute(
                            """
                            CREATE TABLE IF NOT EXISTS community_message_reactions (
                                id CHAR(36) PRIMARY KEY,
                                message_id CHAR(36) NOT NULL,
                                user_id CHAR(36) NOT NULL,
                                emoji VARCHAR(10) NOT NULL,
                                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                UNIQUE KEY uk_msg_user_emoji (message_id, user_id, emoji),
                                CONSTRAINT fk_reaction_msg FOREIGN KEY (message_id) REFERENCES community_messages(id) ON DELETE CASCADE,
                                CONSTRAINT fk_reaction_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                            """
                        )
            self.is_connected = True
            self.last_error = None
            print(f"[+] MySQL connected: {config.DB_NAME} at {config.DB_HOST}:{config.DB_PORT}")
        except Exception as error:
            self.is_connected = False
            self.last_error = str(error)
            print(f"[!] MySQL initialization failed: {error}")

    def require_connection(self):
        if not self.is_connected:
            self.initialize()
        if not self.is_connected:
            raise RuntimeError(
                "MySQL is unavailable. Check DB_HOST, DB_PORT, DB_USER, "
                "DB_PASSWORD and start the MySQL service."
            )

    @contextmanager
    def transaction(self):
        self.require_connection()
        conn = self._connect(autocommit=False)
        try:
            yield conn
            conn.commit()
            self.query_ram_cache.clear()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def fetch_all(self, query, params=(), use_cache=True):
        self.require_connection()
        cache_key = f"{query}:{params}"
        if use_cache and cache_key in self.query_ram_cache:
            return self.query_ram_cache[cache_key]

        mysql_query = query.replace("?", "%s")
        with self._connect() as conn:
            with conn.cursor() as cursor:
                cursor.execute(mysql_query, params)
                rows = [dict(row) for row in cursor.fetchall()]

        cleaned_rows = [self.clean_and_resolve_row(row) for row in rows]
        if use_cache and len(self.query_ram_cache) < config.RAM_CACHE_MAX_SIZE:
            self.query_ram_cache[cache_key] = cleaned_rows
        return cleaned_rows

    def fetch_one(self, query, params=(), use_cache=True):
        results = self.fetch_all(query, params, use_cache=use_cache)
        return results[0] if results else None

    def execute(self, query, params=()):
        self.require_connection()
        self.query_ram_cache.clear()
        mysql_query = query.replace("?", "%s")
        with self._connect() as conn:
            with conn.cursor() as cursor:
                cursor.execute(mysql_query, params)
                return cursor.lastrowid

    def executemany(self, query, params):
        self.require_connection()
        self.query_ram_cache.clear()
        mysql_query = query.replace("?", "%s")
        with self._connect() as conn:
            with conn.cursor() as cursor:
                return cursor.executemany(mysql_query, params)

    def load_gdrive_mapping(self):
        mapping_path = config.BASE_DIR.parent / "dautoeic" / "gdrive_mapping.json"
        if not mapping_path.exists():
            mapping_path = config.BASE_DIR / "gdrive_mapping.json"
        if not mapping_path.exists():
            return
        try:
            raw_mapping = json.loads(mapping_path.read_text(encoding="utf-8"))
            matcher = re.compile(
                r"/media/(\d{4})/[Tt]est\s*(\d+)/(audio|images)/(.*)",
                re.IGNORECASE,
            )
            for old_url, gdrive_url in raw_mapping.items():
                direct_url = self.format_gdrive_direct_link(
                    gdrive_url,
                    is_image="images" in old_url.lower()
                    or old_url.lower().endswith((".png", ".jpg", ".jpeg", ".webp")),
                )
                self.gdrive_map[old_url] = direct_url
                match = matcher.search(old_url)
                if match:
                    year, test_num, media_type, filename = match.groups()
                    key = (
                        f"{year}:{test_num}:{media_type.lower()}:"
                        f"{filename.split('/')[-1].lower()}"
                    )
                    self.gdrive_map[key] = direct_url
        except Exception as error:
            print(f"[!] Cannot load Google Drive media mapping: {error}")

    @staticmethod
    def format_gdrive_direct_link(url, is_image=False):
        if not url or "drive.google.com" not in str(url):
            return url
        value = str(url)
        file_id = None
        if "id=" in value:
            file_id = value.split("id=", 1)[1].split("&", 1)[0]
        elif "/d/" in value:
            file_id = value.split("/d/", 1)[1].split("/", 1)[0]
        if not file_id:
            return value
        if is_image:
            return f"https://lh3.googleusercontent.com/d/{file_id}"
        return (
            "https://drive.usercontent.google.com/download"
            f"?id={file_id}&export=download&confirm=t"
        )

    @staticmethod
    def format_r2_media_url(url):
        if not url or not config.R2_PUBLIC_BASE_URL:
            return url
        normalized = str(url).replace("\\", "/")
        object_key = None
        for marker in ("/storage/v1/object/public/media/", "/media/"):
            if marker in normalized:
                object_key = normalized.split(marker, 1)[1].split("?", 1)[0]
                break
        if not object_key:
            return url
        decoded_key = unquote(object_key).lstrip("/")
        encoded_key = "/".join(quote(part, safe="") for part in decoded_key.split("/"))
        return f"{config.R2_PUBLIC_BASE_URL}/{encoded_key}"

    def clean_and_resolve_row(self, row):
        if not isinstance(row, dict):
            return row
        if row.get("dich_nghia"):
            # Preserve the rich translation markup for PassageContent. The plain
            # version remains available for explanations and other text-only UI.
            row["dich_nghia_html"] = row["dich_nghia"]
        for field in ("question_text", "explanation_vi", "dich_nghia"):
            if row.get(field):
                row[field] = clean_html_text(row[field])

        for field, is_image in (("audio_url", False), ("image_url", True)):
            value = row.get(field)
            if not value:
                continue
            value = self.format_r2_media_url(value)
            row[field] = self.format_gdrive_direct_link(value, is_image=is_image)
        return row


db = Database()
