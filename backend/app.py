import os
import json
from datetime import datetime
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# -----------------------------
# Load environment variables
# -----------------------------
load_dotenv()

from extensions import db  # ✅ import db from extensions

# -----------------------------
# Flask Setup
# -----------------------------
app = Flask(__name__)
CORS(app)

# -----------------------------
# Database Config
# -----------------------------
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///database.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize DB
db.init_app(app)

# -----------------------------
# Import models after db.init_app
# -----------------------------
with app.app_context():
    from models.graph import Graph
    from models.chat import Chat
    from models.chat_message import ChatMessage
    from models.user import User
    from models.note import Note
    from models.connection import Connection
    from models.purchases import Purchase             # ✅ new
    from models.token_transactions import TokenTransaction  # ✅ new
    db.create_all()

# -----------------------------
# Register Blueprints
# -----------------------------
from routes.openai_routes import openai_bp
from routes.auth import auth_bp
from routes.graph import graph_bp
from routes.payments import payments_bp  # ✅ new

app.register_blueprint(openai_bp, url_prefix="/api/chat")
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(graph_bp, url_prefix="/api/graph")
app.register_blueprint(payments_bp, url_prefix="/api/payments")  # ✅ new

# -----------------------------
# Root route
# -----------------------------
@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "AI backend + SQLite modular structure is running!"})

# -----------------------------
# Run the app
# -----------------------------
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
