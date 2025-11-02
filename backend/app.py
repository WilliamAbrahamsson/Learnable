import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from extensions import db
from config import load_config

app = Flask(__name__)
app.config['CORS_HEADERS'] = 'Content-Type, Authorization'
CORS(app)
load_config(app)
db.init_app(app)

with app.app_context():
    # Import models and create tables if they don't exist
    from models.user import User  # noqa: F401
    from models.canvas import Canvas  # noqa: F401
    from models.chat import Chat  # noqa: F401
    from models.chat_message import ChatMessage  # noqa: F401
    from models.canvas_element import CanvasElement  # noqa: F401
    from models.element_group import ElementGroup, ElementGroupMember  # noqa: F401
    from models.purchases import Purchase  # noqa: F401
    from models.token_transactions import TokenTransaction  # noqa: F401
    db.create_all()

# Blueprints
from routes.openai_routes import openai_bp
from routes.auth import auth_bp
from routes.canvas import canvas_bp
from routes.payments import payments_bp

app.register_blueprint(openai_bp, url_prefix="/api/chat")
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(canvas_bp, url_prefix="/api/canvas")
app.register_blueprint(payments_bp, url_prefix="/api/payments")


@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Learnable API running"})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
