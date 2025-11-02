import json
import os
from flask import Blueprint, request, jsonify, Response, stream_with_context
from extensions import db
from models.chat import Chat
from models.chat_message import ChatMessage
from models.canvas import Canvas
from flask_cors import cross_origin
from openai import OpenAI
from time import time


openai_bp = Blueprint("openai_bp", __name__)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ---------------------------
# Learnable prompt configuration
# ---------------------------
LEARNABLE_PROMPT = {
    "base": (
        "You are the Learnable AI — an assistant integrated into the Learnable platform. "
        "Learnable helps users study, visualize, and connect ideas through concept cards. "
        "Respond conversationally with educational clarity. Use Markdown headings (#/##/###) and **bold** when helpful. "
        "Avoid code blocks unless explicitly requested. Do not include any <card> blocks in responses."
    ),
    "secondary": "Length: 300 characters",
    # Disable server-side card generation completely
    "generate_card": 0,
}

MODEL = "gpt-4o-mini"


# ---------------------------
# Streaming chat endpoint
# ---------------------------
@openai_bp.route("/stream", methods=["POST"])
@cross_origin()
def chat_stream():
    data = request.get_json(silent=True) or {}
    user_message = (data.get("message") or "").strip()
    canvas_id = data.get("canvas_id") or data.get("graph_id")

    if not user_message:
        return jsonify({"error": "Message cannot be empty"}), 400

    chat_obj = None
    assistant_msg_id = None
    prior_messages = []

    # ---------------------------
    # Canvas / Chat setup
    # ---------------------------
    if canvas_id is not None:
        try:
            cid = int(canvas_id)
            canvas = Canvas.query.filter_by(id=cid).first()
            if canvas:
                # Ensure one chat per canvas
                chat_obj = Chat.query.filter_by(canvas_id=cid).first()
                if not chat_obj:
                    chat_obj = Chat(canvas_id=cid)
                    db.session.add(chat_obj)
                    db.session.commit()

                # Snapshot prior messages
                prior_messages = [
                    {"text": m.text or "", "is_response": bool(m.is_response)}
                    for m in ChatMessage.query.filter_by(chat_id=chat_obj.id)
                    .order_by(ChatMessage.created_at.asc())
                    .all()
                ]

                # Save user message + placeholder assistant
                um = ChatMessage(chat_id=chat_obj.id, text=user_message, is_response=False)
                db.session.add(um)
                am = ChatMessage(chat_id=chat_obj.id, text="", is_response=True)
                db.session.add(am)
                db.session.flush()
                assistant_msg_id = am.id

                # Update chat timestamp
                try:
                    chat_obj.updated_at = int(time())
                except Exception:
                    pass
                db.session.commit()
        except Exception as e:
            print("Error initializing chat:", e)
            db.session.rollback()
            chat_obj = None

    base_prompt = LEARNABLE_PROMPT["base"]
    generate_card = LEARNABLE_PROMPT["generate_card"]

    # ---------------------------
    # Stream response generator
    # ---------------------------
    def generate():
        # Build system + conversation context
        context_messages = [{"role": "system", "content": base_prompt}]
        if prior_messages:
            for m in prior_messages[-20:]:
                txt = m["text"].strip()
                if not txt:
                    continue
                context_messages.append({
                    "role": "assistant" if m["is_response"] else "user",
                    "content": txt,
                })

        # Add current user query
        context_messages.append({"role": "user", "content": user_message})

        # Stream OpenAI response (with graceful fallback)
        full_reply = ""
        stream_error: str | None = None
        try:
            stream = client.chat.completions.create(
                model=MODEL,
                messages=context_messages,
                temperature=0.7,
                max_tokens=800,
                stream=True,
            )
            for chunk in stream:
                content = getattr(chunk.choices[0].delta, "content", None)
                if content:
                    full_reply += content
                    yield f"data: {json.dumps({'content': content})}\n\n"
        except Exception as e:
            stream_error = str(e)

        # If streaming failed entirely, send a fallback message and persist it
        if stream_error and not full_reply:
            full_reply = "I'm having trouble reaching the AI model right now. Try again in a bit."
            yield f"data: {json.dumps({'content': full_reply})}\n\n"

        # ---------------------------
        # Optional: Generate Learnable concept card
        # ---------------------------
        if generate_card and not stream_error and full_reply.strip():
            card_prompt = (
                "From the conversation and your reply, generate a short Learnable concept card as JSON. "
                "Return ONLY a JSON object with keys: title (3-6 words, concise) and description (1-3 sentences, clear). "
                "Do not include markdown or extra text."
            )
            try:
                card = client.chat.completions.create(
                    model=MODEL,
                    messages=[
                        {"role": "system", "content": base_prompt},
                        {"role": "user", "content": f"{user_message}\n\n{full_reply}\n\n{card_prompt}"},
                    ],
                    temperature=0.7,
                    max_tokens=200,
                )
                json_text = card.choices[0].message.content.strip()
                yield f"data: {json.dumps({'content': f'<card>{json_text}</card>'})}\n\n"
            except Exception as e:
                # Non-fatal; still persist the main reply
                pass

        # ---------------------------
        # Save assistant reply
        # ---------------------------
        if assistant_msg_id is not None:
            try:
                am = ChatMessage.query.filter_by(id=assistant_msg_id).first()
                if am:
                    am.text = full_reply
                    db.session.commit()
            except Exception as e:
                print("Error updating assistant message:", e)
                db.session.rollback()

        yield "data: [DONE]\n\n"

    # ---------------------------
    # Stream response to client
    # ---------------------------
    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


    # Legacy endpoint removed during canvas reset phase.
    # Intentionally not implemented.
