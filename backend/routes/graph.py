from flask import Blueprint, jsonify, request, g
from sqlalchemy import or_, and_
from models.note import Note
from models.connection import Connection
from routes.auth import authenticate_token
from extensions import db  # ✅ Import db directly from extensions (correct)

graph_bp = Blueprint("graph", __name__)

# --------------------------
# 🧠 NOTES
# --------------------------

@graph_bp.route("/notes", methods=["GET"])
@authenticate_token
def get_notes():
    """Get all notes for the authenticated user"""
    user_id = g.current_user.id
    notes = Note.query.filter_by(user_id=user_id).all()
    return jsonify([n.to_dict() for n in notes]), 200


@graph_bp.route("/notes", methods=["POST"])
@authenticate_token
def create_note():
    """Create a new note"""
    user_id = g.current_user.id
    data = request.get_json() or {}

    note = Note(
        user_id=user_id,
        name=data.get("name", "Untitled"),
        description=data.get("description", ""),
        x_pos=data.get("x_pos", 100),
        y_pos=data.get("y_pos", 100),
        width=data.get("width", 280),
        height=data.get("height", 200),
        image_url=data.get("image_url"),
    )

    db.session.add(note)
    db.session.commit()
    return jsonify(note.to_dict()), 201


@graph_bp.route("/notes/<int:note_id>", methods=["PATCH"])
@authenticate_token
def update_note(note_id):
    """Update note position, size, or metadata"""
    user_id = g.current_user.id
    note = Note.query.filter_by(id=note_id, user_id=user_id).first()
    if not note:
        return jsonify({"error": "Note not found"}), 404

    data = request.get_json() or {}

    note.x_pos = data.get("x_pos", note.x_pos)
    note.y_pos = data.get("y_pos", note.y_pos)
    note.width = data.get("width", note.width)
    note.height = data.get("height", note.height)
    note.name = data.get("name", note.name)
    note.description = data.get("description", note.description)

    db.session.commit()
    return jsonify(note.to_dict()), 200


@graph_bp.route("/notes/<int:note_id>", methods=["DELETE"])
@authenticate_token
def delete_note(note_id):
    """Delete a note and any connected connections"""
    user_id = g.current_user.id
    note = Note.query.filter_by(id=note_id, user_id=user_id).first()
    if not note:
        return jsonify({"error": "Not found"}), 404

    # ✅ Delete all connections that include this note
    Connection.query.filter(
        or_(Connection.note_id_1 == note_id, Connection.note_id_2 == note_id)
    ).delete()

    db.session.delete(note)
    db.session.commit()
    return jsonify({"success": True}), 200


# --------------------------
# 🔗 CONNECTIONS
# --------------------------

@graph_bp.route("/connections", methods=["GET"])
@authenticate_token
def get_connections():
    """Get all connections between user's notes"""
    user_id = g.current_user.id
    note_ids = [n.id for n in Note.query.filter_by(user_id=user_id).all()]
    if not note_ids:
        return jsonify([]), 200

    connections = Connection.query.filter(
        or_(Connection.note_id_1.in_(note_ids), Connection.note_id_2.in_(note_ids))
    ).all()

    return jsonify([c.to_dict() for c in connections]), 200


@graph_bp.route("/connections", methods=["POST"])
@authenticate_token
def create_connection():
    """Create a connection between two notes with slots"""
    user_id = g.current_user.id
    data = request.get_json() or {}

    note_id_1 = data.get("note_id_1")
    note_id_2 = data.get("note_id_2")
    slot_1 = int(data.get("slot_1", 0))
    slot_2 = int(data.get("slot_2", 0))

    if not note_id_1 or not note_id_2 or note_id_1 == note_id_2:
        return jsonify({"error": "Invalid connection"}), 400

    # ✅ Check ownership (only allow connections between user’s own notes)
    owned_note_ids = [n.id for n in Note.query.filter_by(user_id=user_id).all()]
    if note_id_1 not in owned_note_ids or note_id_2 not in owned_note_ids:
        return jsonify({"error": "Cannot connect notes not owned by user"}), 403

    # ✅ Check if connection already exists
    existing = Connection.query.filter(
        or_(
            and_(Connection.note_id_1 == note_id_1, Connection.note_id_2 == note_id_2),
            and_(Connection.note_id_1 == note_id_2, Connection.note_id_2 == note_id_1),
        )
    ).first()

    if existing:
        return jsonify(existing.to_dict()), 200

    conn = Connection(
        note_id_1=note_id_1,
        note_id_2=note_id_2,
        slot_1=slot_1,
        slot_2=slot_2,
        user_id=user_id,
    )

    db.session.add(conn)
    db.session.commit()
    return jsonify(conn.to_dict()), 201


@graph_bp.route("/connections/<int:conn_id>", methods=["PATCH"])
@authenticate_token
def update_connection(conn_id):
    """Update slot positions or strength for a connection"""
    user_id = g.current_user.id
    conn = Connection.query.filter_by(id=conn_id, user_id=user_id).first()
    if not conn:
        return jsonify({"error": "Connection not found"}), 404

    data = request.get_json() or {}
    conn.slot_1 = int(data.get("slot_1", conn.slot_1))
    conn.slot_2 = int(data.get("slot_2", conn.slot_2))
    conn.strength = float(data.get("strength", conn.strength))

    db.session.commit()
    return jsonify(conn.to_dict()), 200


@graph_bp.route("/connections", methods=["DELETE"])
@authenticate_token
def delete_connection():
    """Delete a connection between two notes"""
    user_id = g.current_user.id
    a = request.args.get("note_id_1")
    b = request.args.get("note_id_2")
    if not a or not b:
        return jsonify({"error": "Missing note ids"}), 400

    deleted = Connection.query.filter(
        or_(
            and_(Connection.note_id_1 == a, Connection.note_id_2 == b),
            and_(Connection.note_id_1 == b, Connection.note_id_2 == a),
        )
    ).delete()

    db.session.commit()
    return jsonify({"success": bool(deleted)}), 200
