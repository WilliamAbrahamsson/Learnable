# evaluate_relationships.py

import os
import json
from app import app, db
from models.graph import Graph
from models.note import Note
from models.connection import Connection
from openai import OpenAI

# -----------------------------
# 1️⃣ Function: Load Graph Data
# -----------------------------
def load_graph_as_json(graph_id: int):
    """Fetch a graph from the database and return it as a structured JSON-like dict."""
    with app.app_context():
        graph = Graph.query.get(graph_id)
        if not graph:
            raise ValueError(f"Graph with ID {graph_id} not found.")

        notes = Note.query.filter_by(graph_id=graph.id).all()
        note_map = {note.id: note.to_dict() for note in notes}

        # Get connections between these notes
        note_ids = list(note_map.keys())
        connections = Connection.query.filter(
            Connection.note_id_1.in_(note_ids),
            Connection.note_id_2.in_(note_ids)
        ).all()

        # Build graph structure
        graph_data = {
            "graph_id": graph.id,
            "name": graph.name,
            "user_id": graph.user_id,
            "nodes": [
                {
                    "id": n.id,
                    "name": n.name,
                    "description": n.description,
                    "position": {"x": n.x_pos, "y": n.y_pos},
                    "size": {"width": n.width, "height": n.height},
                    "image_url": n.image_url,
                }
                for n in notes
            ],
            "edges": [
                {
                    "id": c.id,
                    "source": c.note_id_1,
                    "target": c.note_id_2,
                    # strength will be updated later by the model
                    "strength": None
                }
                for c in connections
            ],
        }

        return graph_data


# -----------------------------
# 2️⃣ Function: Get Relationship Strengths via Chat API
# -----------------------------
def evaluate_relationship_strengths(graph_data: dict):
    """Send the graph JSON to the chat model and get back JSON with 'strength' for each edge."""

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    prompt = f"""
You are an AI assistant that evaluates conceptual relationship strength between nodes in a knowledge graph.

Each node represents a concept, and edges represent relationships between them.

Rate each edge (1–10) based on how strong or relevant the relationship is:
- 10 = perfect, conceptually direct relationship
- 1 = no or irrelevant connection

Return ONLY the updated JSON structure below with each edge’s "strength" field filled in.
Do not add extra commentary or text outside of the JSON.

Here is the graph data:
{json.dumps(graph_data, indent=2, ensure_ascii=False)}
    """

    response = client.chat.completions.create(
        model="gpt-4o-mini",  # use GPT-4o-mini or similar for structured reasoning
        messages=[
            {"role": "system", "content": "You analyze knowledge graph relationships."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"},
        temperature=0.2
    )

    # Extract the model’s JSON output
    result = response.choices[0].message.content
    try:
        return json.loads(result)
    except Exception as e:
        print("⚠️ Error parsing model output:", e)
        print("Raw output:\n", result)
        return None


# -----------------------------
# 3️⃣ Example usage
# -----------------------------
if __name__ == "__main__":
    graph_id = 6  # change as needed

    print("📥 Loading graph from database...")
    graph_data = load_graph_as_json(graph_id)
    print(f"✅ Loaded graph '{graph_data['name']}' with {len(graph_data['edges'])} edges.")

    print("\n🤖 Sending graph to model for evaluation...")
    evaluated_graph = evaluate_relationship_strengths(graph_data)

    if evaluated_graph:
        print("\n✅ Model returned updated graph structure with strengths:\n")
        print(json.dumps(evaluated_graph, indent=2, ensure_ascii=False))
    else:
        print("❌ Model did not return valid JSON.")
