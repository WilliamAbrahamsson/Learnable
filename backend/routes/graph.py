from flask import Blueprint, jsonify, request, g
from sqlalchemy import or_, and_
from time import time
from models.note import Note
from models.connection import Connection
from models.graph import Graph
from models.chat import Chat
from models.chat_message import ChatMessage
from models.chat import Chat
from models.chat_message import ChatMessage
from routes.auth import authenticate_token
from extensions import db

graph_bp = Blueprint("graph", __name__)

# --------------------------
# 🧠 NOTES
# --------------------------

@graph_bp.route("/notes", methods=["GET"])
@authenticate_token
def get_notes():
    """Get all notes for the authenticated user (optionally filtered by graph)"""
    user_id = g.current_user.id
    graph_id = request.args.get("graph_id", type=int)

    q = Note.query.join(Graph, Note.graph_id == Graph.id).filter(Graph.user_id == user_id)
    if graph_id:
        q = q.filter(Note.graph_id == graph_id)

    notes = q.all()
    return jsonify([n.to_dict() for n in notes]), 200


# --------------------------
# 📚 GRAPHS
# --------------------------

@graph_bp.route("/graphs", methods=["GET"])
@authenticate_token
def list_graphs():
    """List all graphs belonging to the authenticated user"""
    user_id = g.current_user.id
    graphs = Graph.query.filter_by(user_id=user_id).order_by(Graph.updated_at.desc()).all()
    return jsonify([g.to_dict() for g in graphs]), 200


@graph_bp.route("/graphs", methods=["POST"])
@authenticate_token
def create_graph():
    """Create a new graph for the authenticated user"""
    user_id = g.current_user.id
    data = request.get_json() or {}
    name = (data.get("name") or "Untitled Graph").strip() or "Untitled Graph"

    graph = Graph(user_id=user_id, name=name)
    db.session.add(graph)
    db.session.flush()
    # Create an empty chat bound to this graph
    chat = Chat(graph_id=graph.id)
    db.session.add(chat)
    db.session.commit()
    out = graph.to_dict()
    out["chat_id"] = chat.id
    return jsonify(out), 201


@graph_bp.route("/chat", methods=["GET"])
@authenticate_token
def get_chat_for_graph():
    """Return chat + messages for a given graph_id owned by the user.
    Creates an empty chat if none exists yet.
    """
    user_id = g.current_user.id
    graph_id = request.args.get("graph_id", type=int)
    if not graph_id:
        return jsonify({"error": "graph_id is required"}), 400
    # Ensure ownership
    graph = Graph.query.filter_by(id=graph_id, user_id=user_id).first()
    if not graph:
        return jsonify({"error": "Graph not found or unauthorized"}), 404

    chat = Chat.query.filter_by(graph_id=graph_id).first()
    if not chat:
        chat = Chat(graph_id=graph_id)
        db.session.add(chat)
        db.session.commit()

    messages = (
        ChatMessage.query.filter_by(chat_id=chat.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return jsonify({
        "chat": chat.to_dict(),
        "messages": [m.to_dict() for m in messages],
    }), 200


# --------------------------
# 🧠 CREATE / UPDATE / DELETE NOTES
# --------------------------

@graph_bp.route("/notes", methods=["POST"])
@authenticate_token
def create_note():
    """Create a new note within a user's graph"""
    user_id = g.current_user.id
    data = request.get_json() or {}
    graph_id = data.get("graph_id")

    graph = Graph.query.filter_by(id=graph_id, user_id=user_id).first()
    if not graph:
        return jsonify({"error": "Invalid or unauthorized graph"}), 403

    note = Note(
        graph_id=graph_id,
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
    note = (
        Note.query.join(Graph, Note.graph_id == Graph.id)
        .filter(Note.id == note_id, Graph.user_id == user_id)
        .first()
    )
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
    """Delete a note and any connected connections (only if user owns the graph)"""
    user_id = g.current_user.id
    note = (
        Note.query.join(Graph, Note.graph_id == Graph.id)
        .filter(Note.id == note_id, Graph.user_id == user_id)
        .first()
    )
    if not note:
        return jsonify({"error": "Not found"}), 404

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
    """Get all connections between notes in a user's graph"""
    user_id = g.current_user.id
    graph_id = request.args.get("graph_id", type=int)
    if not graph_id:
        return jsonify({"error": "graph_id required"}), 400

    graph = Graph.query.filter_by(id=graph_id, user_id=user_id).first()
    if not graph:
        return jsonify({"error": "Unauthorized graph access"}), 403

    note_ids = [n.id for n in Note.query.filter_by(graph_id=graph_id).all()]
    if not note_ids:
        return jsonify([]), 200

    connections = Connection.query.filter(
        or_(Connection.note_id_1.in_(note_ids), Connection.note_id_2.in_(note_ids))
    ).all()

    return jsonify([c.to_dict() for c in connections]), 200


@graph_bp.route("/connections", methods=["POST"])
@authenticate_token
def create_connection():
    """Create a connection between two notes (within the same graph)"""
    user_id = g.current_user.id
    data = request.get_json() or {}

    note_id_1 = data.get("note_id_1")
    note_id_2 = data.get("note_id_2")
    slot_1 = int(data.get("slot_1", 0))
    slot_2 = int(data.get("slot_2", 0))

    if not note_id_1 or not note_id_2 or note_id_1 == note_id_2:
        return jsonify({"error": "Invalid connection"}), 400

    n1 = (
        Note.query.join(Graph, Note.graph_id == Graph.id)
        .filter(Note.id == note_id_1, Graph.user_id == user_id)
        .first()
    )
    n2 = (
        Note.query.join(Graph, Note.graph_id == Graph.id)
        .filter(Note.id == note_id_2, Graph.user_id == user_id)
        .first()
    )

    if not n1 or not n2:
        return jsonify({"error": "Notes not found or unauthorized"}), 404
    if n1.graph_id != n2.graph_id:
        return jsonify({"error": "Notes must belong to the same graph"}), 400

    # Check for existing connection (bidirectional)
    existing = Connection.query.filter(
        or_(
            and_(Connection.note_id_1 == note_id_1, Connection.note_id_2 == note_id_2),
            and_(Connection.note_id_1 == note_id_2, Connection.note_id_2 == note_id_1),
        )
    ).first()

    if existing:
        # Update slots but keep strength as is
        if existing.note_id_1 == note_id_1:
            existing.slot_1 = slot_1
            existing.slot_2 = slot_2
        else:
            existing.slot_1 = slot_2
            existing.slot_2 = slot_1
        db.session.commit()
        return jsonify(existing.to_dict()), 200

    # ✅ Always create with strength = 0
    conn = Connection(
        note_id_1=note_id_1,
        note_id_2=note_id_2,
        slot_1=slot_1,
        slot_2=slot_2,
        strength=0.0
    )
    db.session.add(conn)
    db.session.commit()
    return jsonify(conn.to_dict()), 201


@graph_bp.route("/connections/<int:conn_id>", methods=["PATCH"])
@authenticate_token
def update_connection(conn_id):
    """Update slot positions or strength for a connection"""
    user_id = g.current_user.id
    conn = (
        Connection.query.join(Note, Connection.note_id_1 == Note.id)
        .join(Graph, Note.graph_id == Graph.id)
        .filter(Connection.id == conn_id, Graph.user_id == user_id)
        .first()
    )
    if not conn:
        return jsonify({"error": "Connection not found"}), 404

    data = request.get_json() or {}

    conn.slot_1 = int(data.get("slot_1", conn.slot_1))
    conn.slot_2 = int(data.get("slot_2", conn.slot_2))

    # ✅ Optional: only allow strength to be set if explicitly provided and within 0–10
    if "strength" in data:
        try:
            val = float(data["strength"])
            conn.strength = max(0.0, min(10.0, val))
        except (TypeError, ValueError):
            conn.strength = 0.0  # fallback to safe default

    db.session.commit()
    return jsonify(conn.to_dict()), 200


@graph_bp.route("/connections", methods=["DELETE"])
@authenticate_token
def delete_connection():
    """Delete a connection between two notes"""
    user_id = g.current_user.id
    a = request.args.get("note_id_1", type=int)
    b = request.args.get("note_id_2", type=int)
    if not a or not b:
        return jsonify({"error": "Missing note ids"}), 400

    owned_note_ids = [
        n.id
        for n in Note.query.join(Graph, Note.graph_id == Graph.id)
        .filter(Graph.user_id == user_id)
        .all()
    ]
    if a not in owned_note_ids or b not in owned_note_ids:
        return jsonify({"error": "Unauthorized"}), 403

    deleted = Connection.query.filter(
        or_(
            and_(Connection.note_id_1 == a, Connection.note_id_2 == b),
            and_(Connection.note_id_1 == b, Connection.note_id_2 == a),
        )
    ).delete()

    db.session.commit()
    return jsonify({"success": bool(deleted)}), 200



# --------------------------
# 💬 CHATS + MESSAGES
# --------------------------

@graph_bp.route("/graphs/<int:graph_id>/chats", methods=["GET"])
@authenticate_token
def list_chats(graph_id):
    """List all chats for a graph"""
    user_id = g.current_user.id
    graph = Graph.query.filter_by(id=graph_id, user_id=user_id).first()
    if not graph:
        return jsonify({"error": "Unauthorized graph access"}), 403

    chats = Chat.query.filter_by(graph_id=graph_id).order_by(Chat.updated_at.desc()).all()
    return jsonify([c.to_dict() for c in chats]), 200


@graph_bp.route("/graphs/<int:graph_id>/chats", methods=["POST"])
@authenticate_token
def create_chat(graph_id):
    """Create a chat for a specific graph"""
    user_id = g.current_user.id
    graph = Graph.query.filter_by(id=graph_id, user_id=user_id).first()
    if not graph:
        return jsonify({"error": "Unauthorized graph"}), 403

    chat = Chat(graph_id=graph_id)
    db.session.add(chat)
    db.session.commit()
    return jsonify(chat.to_dict()), 201


@graph_bp.route("/chats/<int:chat_id>/messages", methods=["GET"])
@authenticate_token
def get_chat_messages(chat_id):
    """Get all messages in a chat"""
    user_id = g.current_user.id
    chat = (
        Chat.query.join(Graph, Chat.graph_id == Graph.id)
        .filter(Chat.id == chat_id, Graph.user_id == user_id)
        .first()
    )
    if not chat:
        return jsonify({"error": "Chat not found or unauthorized"}), 404

    messages = ChatMessage.query.filter_by(chat_id=chat_id).order_by(ChatMessage.created_at.asc()).all()
    return jsonify([m.to_dict() for m in messages]), 200


@graph_bp.route("/chats/<int:chat_id>/messages", methods=["POST"])
@authenticate_token
def create_chat_message(chat_id):
    """Add a new message to a chat"""
    user_id = g.current_user.id
    chat = (
        Chat.query.join(Graph, Chat.graph_id == Graph.id)
        .filter(Chat.id == chat_id, Graph.user_id == user_id)
        .first()
    )
    if not chat:
        return jsonify({"error": "Chat not found or unauthorized"}), 404

    data = request.get_json() or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text required"}), 400

    is_response = bool(data.get("is_response", False))

    message = ChatMessage(chat_id=chat_id, text=text, is_response=is_response)
    chat.updated_at = int(time())
    db.session.add(message)
    db.session.commit()
    return jsonify(message.to_dict()), 201


@graph_bp.route("/messages/<int:message_id>/feedback", methods=["PATCH"])
@authenticate_token
def update_message_feedback(message_id):
    """Like or dislike a chat message"""
    user_id = g.current_user.id
    message = (
        ChatMessage.query.join(Chat, ChatMessage.chat_id == Chat.id)
        .join(Graph, Chat.graph_id == Graph.id)
        .filter(ChatMessage.id == message_id, Graph.user_id == user_id)
        .first()
    )
    if not message:
        return jsonify({"error": "Message not found or unauthorized"}), 404

    data = request.get_json() or {}
    if "is_liked" in data:
        message.is_liked = bool(data["is_liked"])
        if message.is_liked:
            message.is_disliked = False
    if "is_disliked" in data:
        message.is_disliked = bool(data["is_disliked"])
        if message.is_disliked:
            message.is_liked = False

    db.session.commit()
    return jsonify(message.to_dict()), 200


# --------------------------
# ⚙️ UTIL
# --------------------------

def _get_or_create_default_graph(user_id: int) -> Graph:
    """Ensure each user has at least one default graph"""
    graph = Graph.query.filter_by(user_id=user_id, name="Default Graph").first()
    if not graph:
        graph = Graph(user_id=user_id, name="Default Graph")
        db.session.add(graph)
        db.session.commit()
    return graph



