import json
from flask import Blueprint, request, jsonify, Response, stream_with_context
from flask_cors import cross_origin
from openai import OpenAI
from extensions import db
from models.chat_message import ChatMessage
import os

openai_bp = Blueprint("openai_bp", __name__)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Non-streaming endpoint
@openai_bp.route("", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "").strip()

    if not user_message:
        return jsonify({"error": "Message cannot be empty"}), 400

    db.session.add(ChatMessage(sender="user", text=user_message))
    db.session.commit()

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a helpful AI assistant."},
            {"role": "user", "content": user_message},
        ],
        temperature=0.7,
        max_tokens=500,
    )

    reply = response.choices[0].message.content.strip()
    db.session.add(ChatMessage(sender="assistant", text=reply))
    db.session.commit()

    return jsonify({"reply": reply})

# Streaming endpoint
@openai_bp.route("/stream", methods=["POST"])
@cross_origin()
def chat_stream():
    data = request.get_json(silent=True) or {}
    user_message = data.get("message", "").strip()

    if not user_message:
        return jsonify({"error": "Message cannot be empty"}), 400

    db.session.add(ChatMessage(sender="user", text=user_message))
    db.session.commit()

    def generate():
        stream = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful AI assistant."},
                {"role": "user", "content": user_message},
            ],
            temperature=0.7,
            max_tokens=500,
            stream=True,
        )

        full_reply = ""
        for chunk in stream:
            choice = chunk.choices[0]
            delta = choice.delta
            content = getattr(delta, "content", None)

            if not content:
                continue

            text = ""
            if isinstance(content, str):
                text = content
            elif isinstance(content, list):
                for part in content:
                    if getattr(part, "type", None) == "output_text" and getattr(part, "text", None):
                        text += part.text

            if not text:
                continue

            full_reply += text
            yield f"data: {json.dumps({'content': text})}\n\n"

        db.session.add(ChatMessage(sender="assistant", text=full_reply))
        db.session.commit()
        yield "data: [DONE]\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )

# Get chat history
@openai_bp.route("/messages", methods=["GET"])
def get_messages():
    messages = ChatMessage.query.order_by(ChatMessage.timestamp.asc()).all()
    return jsonify([m.to_dict() for m in messages])
