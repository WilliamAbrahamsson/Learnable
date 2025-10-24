import json
import os
from flask import Blueprint, request, jsonify, Response, stream_with_context
from extensions import db
from models.chat import Chat
from models.chat_message import ChatMessage
from models.graph import Graph
from flask_cors import cross_origin
from openai import OpenAI
from models.connection import Connection


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
# Streaming chat endpoint
# ---------------------------
@openai_bp.route("/stream", methods=["POST"])
@cross_origin()
def chat_stream():
    data = request.get_json(silent=True) or {}
    user_message = (data.get("message") or "").strip()
    graph_id = data.get("graph_id")

    if not user_message:
        return jsonify({"error": "Message cannot be empty"}), 400

    chat_obj = None
    assistant_msg_id = None
    prior_messages = []

    # ---------------------------
    # Graph / Chat setup
    # ---------------------------
    if graph_id is not None:
        try:
            gid = int(graph_id)
            graph = Graph.query.filter_by(id=gid).first()
            if graph:
                # Find or create chat for this graph
                chat_obj = Chat.query.filter_by(graph_id=gid).first()
                if not chat_obj:
                    chat_obj = Chat(graph_id=gid)
                    db.session.add(chat_obj)
                    db.session.commit()

                # Snapshot prior messages into plain dicts
                prior_messages = [
                    {"text": m.text or "", "is_response": bool(m.is_response)}
                    for m in ChatMessage.query.filter_by(chat_id=chat_obj.id)
                    .order_by(ChatMessage.created_at.asc())
                    .all()
                ]

                # Save user message
                um = ChatMessage(chat_id=chat_obj.id, text=user_message, is_response=False)
                db.session.add(um)

                # Pre-create empty assistant message row (to fill later)
                am = ChatMessage(chat_id=chat_obj.id, text="", is_response=True)
                db.session.add(am)
                db.session.flush()
                assistant_msg_id = am.id
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

        # Stream OpenAI response
        stream = client.chat.completions.create(
            model=MODEL,
            messages=context_messages,
            temperature=0.7,
            max_tokens=800,
            stream=True,
        )

        full_reply = ""

        try:
            for chunk in stream:
                content = getattr(chunk.choices[0].delta, "content", None)
                if content:
                    full_reply += content
                    yield f"data: {json.dumps({'content': content})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

        # ---------------------------
        # Optional: Generate Learnable concept card
        # ---------------------------
        if generate_card:
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
                yield f"data: {json.dumps({'error': f'Card generation failed: {e}'})}\n\n"

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


@openai_bp.route("/analyze-graph", methods=["POST"])
@cross_origin()
def analyze_graph_connections():
    """
    Analyze conceptual relationship strength for a graph's connections using AI.

    Request JSON:
      { "graph_id": 5 }

    Response JSON:
      {
        "success": true,
        "updated": 10,
        "graph_id": 5
      }
    """
    data = request.get_json(silent=True) or {}
    graph_id = data.get("graph_id")

    if not graph_id:
        return jsonify({"error": "graph_id is required"}), 400

    graph = Graph.query.filter_by(id=graph_id).first()
    if not graph:
        return jsonify({"error": f"Graph {graph_id} not found"}), 404

    # --------------------------
    # Fetch notes and connections
    # --------------------------
    notes = Graph.query.get(graph_id).notes
    note_map = {n.id: n for n in notes}
    connections = (
        Connection.query
        .filter(Connection.note_id_1.in_(note_map.keys()), Connection.note_id_2.in_(note_map.keys()))
        .all()
    )

    if not connections:
        return jsonify({"error": "No connections found in graph"}), 400

    # Build JSON payload
    graph_data = {
        "graph_id": graph.id,
        "name": graph.name,
        "nodes": [
            {
                "id": n.id,
                "name": n.name,
                "description": n.description,
            }
            for n in notes
        ],
        "edges": [
            {
                "id": c.id,
                "source": c.note_id_1,
                "target": c.note_id_2,
                "strength": None,
            }
            for c in connections
        ],
    }

    # --------------------------
    # Prompt for relationship analysis
    # --------------------------
    prompt = f"""
You are an AI that evaluates conceptual relationships in a knowledge graph.

INPUT FORMAT
- Nodes: each has a "name" (title) and "description".
- Edges: each connects two node IDs.

TASK
Evaluate every edge's conceptual validity IN THE CONTEXT OF THE ENTIRE GRAPH AND ITS IMPLIED HIERARCHY
(e.g., parent/child groupings, core vs. subtype, part-of vs. peer). Be very critical:
if an edge does not make strong sense given the overall structure, it should receive a low score.

SCORING (integer 1–10 only)
- 10 → Essential, correct, and structurally coherent in the hierarchy (e.g., clear parent-child, part-of, or canonical subtype).
- 8–9 → Strong and coherent; fits the hierarchy with minimal ambiguity.
- 5–7 → Plausible but not clearly supported by the hierarchy; partial overlap.
- 3–4 → Weak; likely cross-link that confuses structure or mixes unrelated levels.
- 1–2 → Incorrect or misleading; contradicts hierarchy or unrelated concepts.

IMPORTANT RULES
- Judge each edge using BOTH the two nodes’ meanings AND the global graph context (clusters, central nodes, known groupings).
- Penalize edges that jump across unrelated branches, or connect items at incompatible levels (e.g., a specific subtype ↔ distant, unrelated category).
- Do not invent new nodes or change the structure.
- Output must be ONLY the same JSON structure as provided, with "strength" filled for each edge (integer 1–10). No extra text.

Graph data:
{json.dumps(graph_data, indent=2, ensure_ascii=False)}
    """

    # --------------------------
    # Call model
    # --------------------------
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert at analyzing conceptual relationships."},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        )

        result_text = response.choices[0].message.content
        evaluated_graph = json.loads(result_text)

    except Exception as e:
        print("⚠️ AI analysis error:", e)
        return jsonify({"error": "Failed to analyze graph", "details": str(e)}), 500

    # --------------------------
    # Update connection strengths in DB
    # --------------------------
    updated_count = 0
    for edge in evaluated_graph.get("edges", []):
        conn = next((c for c in connections if c.id == edge["id"]), None)
        if conn and "strength" in edge and isinstance(edge["strength"], (int, float)):
            conn.strength = float(edge["strength"])
            updated_count += 1

    db.session.commit()

    return jsonify({
        "success": True,
        "graph_id": graph_id,
        "updated": updated_count,
        "message": "Connection strengths analyzed and updated."
    }), 200
