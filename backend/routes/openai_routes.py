import json
import os
from flask import Blueprint, request, jsonify, Response, stream_with_context
from flask_cors import cross_origin
from openai import OpenAI

openai_bp = Blueprint("openai_bp", __name__)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ---------------------------
# Learnable prompt configuration
# ---------------------------
LEARNABLE_PROMPT = {
    "base": (
        "You are the Learnable AI — an assistant integrated into the Learnable platform. "
        "Learnable is an intelligent knowledge mapping tool that helps users study, visualize, "
        "and connect ideas through concept cards. Users can ask questions, explore subjects, "
        "and the AI generates structured, insightful explanations that can be turned into "
        "connected learning cards. Each interaction aims to expand a user’s personal knowledge "
        "graph in clear, educational language. The AI should respond conversationally but with "
        "educational clarity. Use Markdown formatting in responses: headings with # / ## / ### for "
        "sections, and **bold** for emphasis when helpful. Avoid code blocks unless explicitly requested. "
        "Do not include any <card>...</card> block or summary card content in the main response; "
        "the server will append a separate <card> summary if enabled. Do not preface with 'Summary' or 'Card' lines."
    ),
    "secondary": "Length: 300 characters",
    "generate_card": 1,
}

MODEL = "gpt-4o-mini"


# ---------------------------
# Streaming chat endpoint only
# ---------------------------
@openai_bp.route("/stream", methods=["POST"])
@cross_origin()
def chat_stream():
    data = request.get_json(silent=True) or {}
    user_message = (data.get("message") or "").strip()
    if not user_message:
        return jsonify({"error": "Message cannot be empty"}), 400

    base_prompt = LEARNABLE_PROMPT["base"]
    generate_card = LEARNABLE_PROMPT["generate_card"]

    def generate():
        # Step 1: Main explanation stream
        stream = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": base_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.7,
            max_tokens=800,
            stream=True,
        )

        full_reply = ""
        for chunk in stream:
            content = getattr(chunk.choices[0].delta, "content", None)
            if content:
                full_reply += content
                yield f"data: {json.dumps({'content': content})}\n\n"

        # Step 2: Generate Learnable concept card (title + description)
        if generate_card:
            card_prompt = (
                "From the conversation and your reply, generate a short Learnable concept card as JSON. "
                "Return ONLY a JSON object with keys: title (3-6 words, concise) and description (1-3 sentences, clear). "
                "Do not include markdown or extra text."
            )
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
            # Send as a structured <card> block so the frontend can parse {title, description}
            yield f"data: {json.dumps({'content': f'<card>{json_text}</card>'})}\n\n"

        yield "data: [DONE]\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
