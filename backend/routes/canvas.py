from flask import Blueprint, jsonify, request, g
from models.canvas import Canvas
from models.chat import Chat
from models.chat_message import ChatMessage
from models.canvas_element import CanvasElement
from models.element_group import ElementGroup, ElementGroupMember
from routes.auth import authenticate_token
from extensions import db
from sqlalchemy.exc import OperationalError

canvas_bp = Blueprint("canvas", __name__)

# --------------------------
# 📚 CANVASES
# --------------------------

@canvas_bp.route("/canvases", methods=["GET"])
@authenticate_token
def list_canvases():
    """List all canvases belonging to the authenticated user"""
    user_id = g.current_user.id
    canvases = Canvas.query.filter_by(user_id=user_id).order_by(Canvas.updated_at.desc()).all()
    return jsonify([c.to_dict() for c in canvases]), 200


@canvas_bp.route("/canvases", methods=["POST"])
@authenticate_token
def create_canvas():
    """Create a new canvas for the authenticated user"""
    user_id = g.current_user.id
    data = request.get_json() or {}
    name = (data.get("name") or "Untitled Canvas").strip() or "Untitled Canvas"

    canvas = Canvas(user_id=user_id, name=name)
    # Initialize default camera to a sensible value (100% zoom)
    canvas.camera_x = 0.0
    canvas.camera_y = 0.0
    canvas.camera_zoom_percentage = 100.0
    db.session.add(canvas)
    # Flush to assign autoincremented canvas.id before creating the chat
    db.session.flush()
    # Ensure one chat per canvas
    chat = Chat(canvas_id=canvas.id)
    db.session.add(chat)
    db.session.commit()
    out = canvas.to_dict()
    out["chat_id"] = chat.id
    return jsonify(out), 201


@canvas_bp.route("/canvases/<int:canvas_id>", methods=["GET"])
@authenticate_token
def get_canvas(canvas_id: int):
    """Return a single canvas owned by the authenticated user."""
    user_id = g.current_user.id
    canvas = Canvas.query.filter_by(id=canvas_id, user_id=user_id).first()
    if not canvas:
        return jsonify({"error": "Canvas not found or unauthorized"}), 404
    return jsonify(canvas.to_dict()), 200


@canvas_bp.route("/canvases/<int:canvas_id>", methods=["PATCH"])
@authenticate_token
def update_canvas(canvas_id: int):
    """Update canvas metadata or camera state.

    JSON: any of { name, camera_x, camera_y, camera_zoom_percentage }
    """
    user_id = g.current_user.id
    canvas = Canvas.query.filter_by(id=canvas_id, user_id=user_id).first()
    if not canvas:
        return jsonify({"error": "Canvas not found or unauthorized"}), 404

    body = request.get_json(silent=True) or {}
    try:
        if 'name' in body and isinstance(body['name'], str):
            name = body['name'].strip()
            canvas.name = name or canvas.name
        if 'camera_x' in body:
            canvas.camera_x = float(body['camera_x'])
        if 'camera_y' in body:
            canvas.camera_y = float(body['camera_y'])
        if 'camera_zoom_percentage' in body:
            canvas.camera_zoom_percentage = float(body['camera_zoom_percentage'])
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid field type"}), 400

    db.session.commit()
    return jsonify(canvas.to_dict()), 200


# --------------------------
# 🧩 CANVAS ELEMENTS
# --------------------------

@canvas_bp.route("/elements", methods=["GET"])
@authenticate_token
def list_canvas_elements():
    """Return all elements for a canvas owned by the authenticated user."""
    user_id = g.current_user.id
    canvas_id = request.args.get("canvas_id", type=int)
    if not canvas_id:
        return jsonify({"error": "canvas_id is required"}), 400

    # Verify ownership
    canvas = Canvas.query.filter_by(id=canvas_id, user_id=user_id).first()
    if not canvas:
        return jsonify({"error": "Canvas not found or unauthorized"}), 404

    elements = (
        CanvasElement.query.filter_by(canvas_id=canvas_id)
        .order_by(CanvasElement.z_index.asc(), CanvasElement.id.asc())
        .all()
    )
    return jsonify([e.to_dict() for e in elements]), 200


@canvas_bp.route("/elements", methods=["POST"])
@authenticate_token
def create_canvas_element():
    """Create a new element on a canvas (rectangle, text, image).

    Body JSON should include at least: { canvas_id, type }
    Optional: x, y, width, height, rotation, z_index, data (object)
    """
    user_id = g.current_user.id
    data = request.get_json(silent=True) or {}

    canvas_id = data.get("canvas_id")
    el_type = (data.get("type") or "").strip().lower()
    if not canvas_id or not el_type:
        return jsonify({"error": "canvas_id and type are required"}), 400

    # Verify ownership
    canvas = Canvas.query.filter_by(id=canvas_id, user_id=user_id).first()
    if not canvas:
        return jsonify({"error": "Canvas not found or unauthorized"}), 404

    allowed_types = {"rectangle", "text", "image", "line"}
    if el_type not in allowed_types:
        return jsonify({"error": f"Unsupported element type '{el_type}'"}), 400

    try:
        x = float(data.get("x", 0))
        y = float(data.get("y", 0))
        width = data.get("width")
        height = data.get("height")
        rotation = float(data.get("rotation", 0))
        z_index = int(data.get("z_index", 0))
        bgcolor = (data.get("bgcolor") or "#FFFFFF").strip()
        lsx = data.get("line_start_x")
        lsy = data.get("line_start_y")
        lex = data.get("line_end_x")
        ley = data.get("line_end_y")
        if lsx is not None: lsx = float(lsx)
        if lsy is not None: lsy = float(lsy)
        if lex is not None: lex = float(lex)
        if ley is not None: ley = float(ley)
        payload = data.get("data") or {}
        if not isinstance(payload, dict):
            return jsonify({"error": "data must be an object"}), 400
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid numeric value for x/y/width/height/rotation/z_index"}), 400

    # Ensure new elements are created on top if z_index is not provided or is <= 0
    if z_index <= 0:
        try:
            max_z = db.session.query(db.func.max(CanvasElement.z_index)).filter_by(canvas_id=canvas_id).scalar()
            z_index = int((max_z or 0) + 1)
        except Exception:
            z_index = 1

    element = CanvasElement(
        canvas_id=canvas_id,
        type=el_type,
        x=x,
        y=y,
        width=width,
        height=height,
        rotation=rotation,
        z_index=z_index,
        bgcolor=bgcolor,
        data=payload,
        line_start_x=lsx,
        line_start_y=lsy,
        line_end_x=lex,
        line_end_y=ley,
    )
    db.session.add(element)
    db.session.commit()
    return jsonify(element.to_dict()), 201


@canvas_bp.route("/elements/<int:element_id>", methods=["PATCH"])
@authenticate_token
def update_canvas_element(element_id: int):
    """Update element geometry/z/data. Accepts partial fields.

    JSON: any of { x, y, width, height, rotation, z_index, data }
    """
    user_id = g.current_user.id
    el = CanvasElement.query.filter_by(id=element_id).first()
    if not el:
        return jsonify({"error": "Element not found"}), 404
    # Verify ownership via canvas
    canvas = Canvas.query.filter_by(id=el.canvas_id, user_id=user_id).first()
    if not canvas:
        return jsonify({"error": "Unauthorized"}), 403

    body = request.get_json(silent=True) or {}
    try:
        if 'x' in body:
            el.x = float(body['x'])
        if 'y' in body:
            el.y = float(body['y'])
        if 'width' in body:
            el.width = float(body['width']) if body['width'] is not None else None
        if 'height' in body:
            el.height = float(body['height']) if body['height'] is not None else None
        if 'rotation' in body:
            el.rotation = float(body['rotation'])
        if 'z_index' in body:
            el.z_index = int(body['z_index'])
        if 'bgcolor' in body and isinstance(body['bgcolor'], str):
            el.bgcolor = body['bgcolor'].strip() or el.bgcolor
        if 'data' in body:
            if not isinstance(body['data'], dict) and body['data'] is not None:
                return jsonify({"error": "data must be an object or null"}), 400
            el.data = body['data']
        if 'line_start_x' in body:
            el.line_start_x = float(body['line_start_x']) if body['line_start_x'] is not None else None
        if 'line_start_y' in body:
            el.line_start_y = float(body['line_start_y']) if body['line_start_y'] is not None else None
        if 'line_end_x' in body:
            el.line_end_x = float(body['line_end_x']) if body['line_end_x'] is not None else None
        if 'line_end_y' in body:
            el.line_end_y = float(body['line_end_y']) if body['line_end_y'] is not None else None
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid field type"}), 400

    db.session.commit()
    return jsonify(el.to_dict()), 200


@canvas_bp.route("/elements/<int:element_id>", methods=["DELETE"])
@authenticate_token
def delete_canvas_element(element_id: int):
    """Delete a canvas element owned by the authenticated user."""
    user_id = g.current_user.id
    el = CanvasElement.query.filter_by(id=element_id).first()
    if not el:
        return jsonify({"error": "Element not found"}), 404
    canvas = Canvas.query.filter_by(id=el.canvas_id, user_id=user_id).first()
    if not canvas:
        return jsonify({"error": "Unauthorized"}), 403
    db.session.delete(el)
    db.session.commit()
    return jsonify({"success": True}), 200


@canvas_bp.route("/groups", methods=["GET"])
@authenticate_token
def list_groups():
    user_id = g.current_user.id
    canvas_id = request.args.get("canvas_id", type=int)
    if not canvas_id:
        return jsonify({"error": "canvas_id is required"}), 400
    canvas = Canvas.query.filter_by(id=canvas_id, user_id=user_id).first()
    if not canvas:
        return jsonify({"error": "Canvas not found or unauthorized"}), 404
    groups = ElementGroup.query.filter_by(canvas_id=canvas_id).order_by(ElementGroup.updated_at.desc()).all()
    return jsonify([g.to_dict(include_elements=True) for g in groups]), 200


@canvas_bp.route("/groups", methods=["POST"])
@authenticate_token
def create_group():
    user_id = g.current_user.id
    data = request.get_json(silent=True) or {}
    canvas_id = data.get("canvas_id")
    name = (data.get("name") or "Group").strip() or "Group"
    element_ids = data.get("element_ids") or []
    if not canvas_id:
        return jsonify({"error": "canvas_id is required"}), 400
    canvas = Canvas.query.filter_by(id=canvas_id, user_id=user_id).first()
    if not canvas:
        return jsonify({"error": "Canvas not found or unauthorized"}), 404
    # Validate elements belong to this canvas
    if element_ids:
        elems = CanvasElement.query.filter(CanvasElement.id.in_(element_ids)).all()
        valid_ids = [e.id for e in elems if e.canvas_id == canvas_id]
    else:
        valid_ids = []
    grp = ElementGroup(canvas_id=canvas_id, name=name)
    db.session.add(grp)
    db.session.flush()
    for eid in valid_ids:
        db.session.add(ElementGroupMember(group_id=grp.id, element_id=eid))
    db.session.commit()
    return jsonify(grp.to_dict(include_elements=True)), 201


@canvas_bp.route("/groups/<int:group_id>", methods=["PATCH"])
@authenticate_token
def update_group(group_id: int):
    user_id = g.current_user.id
    grp = ElementGroup.query.filter_by(id=group_id).first()
    if not grp:
        return jsonify({"error": "Group not found"}), 404
    canvas = Canvas.query.filter_by(id=grp.canvas_id, user_id=user_id).first()
    if not canvas:
        return jsonify({"error": "Unauthorized"}), 403
    body = request.get_json(silent=True) or {}
    changed = False
    if 'name' in body and isinstance(body['name'], str):
        new_name = body['name'].strip()
        if new_name:
            grp.name = new_name
            changed = True
    if 'element_ids' in body and isinstance(body['element_ids'], list):
        # Reset membership to provided set
        ElementGroupMember.query.filter_by(group_id=grp.id).delete()
        ids = [int(x) for x in body['element_ids'] if isinstance(x, (int, str))]
        if ids:
            elems = CanvasElement.query.filter(CanvasElement.id.in_(ids)).all()
            for e in elems:
                if e.canvas_id == grp.canvas_id:
                    db.session.add(ElementGroupMember(group_id=grp.id, element_id=e.id))
        changed = True
    if changed:
        db.session.commit()
    return jsonify(grp.to_dict(include_elements=True)), 200


@canvas_bp.route("/groups/<int:group_id>", methods=["DELETE"])
@authenticate_token
def delete_group(group_id: int):
    user_id = g.current_user.id
    grp = ElementGroup.query.filter_by(id=group_id).first()
    if not grp:
        return jsonify({"error": "Group not found"}), 404
    canvas = Canvas.query.filter_by(id=grp.canvas_id, user_id=user_id).first()
    if not canvas:
        return jsonify({"error": "Unauthorized"}), 403
    # Members cascade delete due to FK
    db.session.delete(grp)
    db.session.commit()
    return jsonify({"success": True}), 200

@canvas_bp.route("/chat", methods=["GET"])
@authenticate_token
def get_chat_for_canvas():
    """Return chat + messages for a given canvas_id owned by the user.
    Creates an empty chat if none exists yet.
    """
    user_id = g.current_user.id
    canvas_id = request.args.get("canvas_id", type=int)
    if not canvas_id:
        return jsonify({"error": "canvas_id is required"}), 400
    # Ensure ownership
    canvas = Canvas.query.filter_by(id=canvas_id, user_id=user_id).first()
    if not canvas:
        return jsonify({"error": "Canvas not found or unauthorized"}), 404

    try:
        chat = Chat.query.filter_by(canvas_id=canvas_id).first()
    except OperationalError:
        # If schema is not ready, return empty history (should not happen with new schema)
        return jsonify({"chat": None, "messages": []}), 200

    if not chat:
        # Ensure one chat per canvas
        chat = Chat(canvas_id=canvas_id)
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

@canvas_bp.route("/canvases/<int:canvas_id>", methods=["DELETE"])
@authenticate_token
def delete_canvas(canvas_id: int):
    """Delete a canvas owned by the authenticated user (and its chats/messages)."""
    user_id = g.current_user.id
    canvas = Canvas.query.filter_by(id=canvas_id, user_id=user_id).first()
    if not canvas:
        return jsonify({"error": "Canvas not found or unauthorized"}), 404

    # Manually delete chats + messages to avoid FK issues on SQLite
    chats = Chat.query.filter_by(canvas_id=canvas_id).all()
    for ch in chats:
        ChatMessage.query.filter_by(chat_id=ch.id).delete()
        db.session.delete(ch)

    db.session.delete(canvas)
    db.session.commit()
    return jsonify({"success": True}), 200

# All note and connection endpoints removed during canvas reset phase.
