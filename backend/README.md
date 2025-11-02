


Backend overview
================

Run dev server
--------------
- `python backend/app.py`

App structure
-------------
- `backend/factory.py` — Flask app factory, config, blueprint registration.
- `backend/config.py` — configuration (DB URL, etc.).
- `backend/extensions.py` — shared extensions (SQLAlchemy `db`).
- `backend/models/` — SQLAlchemy models (Canvas, Chat, User, etc.).
- `backend/routes/` — Flask blueprints (auth, chat, canvas, payments).

Persistence
-----------
- Default DB: SQLite at `database.db` (override with `DATABASE_URL`).

Browse SQLite (optional)
------------------------
- `sqlite_web database.db --port 9000`

Notes
-----
- Graph renamed to Canvas across the API and DB. Endpoints now live under `/api/canvas` (e.g., `GET /api/canvas/canvases`, `POST /api/canvas/canvases`, `GET /api/canvas/chat?canvas_id=...`).
- Notes and connections are removed while the canvas is rebuilt.
- The `Connection` and `Note` models have been removed; any legacy scripts referring to them (e.g. `backend/test_relationships.py`) are obsolete.
