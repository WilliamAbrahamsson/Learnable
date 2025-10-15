from flask import Blueprint, request, jsonify, g
from extensions import db
from models.user import User
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import time
import os
from functools import wraps

auth_bp = Blueprint("auth_bp", __name__)

JWT_SECRET = os.getenv("JWT_SECRET", "fallback_secret_key")
JWT_EXPIRES_IN = int(os.getenv("JWT_EXPIRES_IN", "604800"))  # 7 days in seconds

# ---------------------------
# Signup
# ---------------------------
@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()
    username = (data.get("username") or "").strip() or None
    password = (data.get("password") or "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    existing = User.query.filter_by(email=email).first()
    if existing:
        # If the supplied password matches, treat this as a sign-in to avoid demo friction.
        if check_password_hash(existing.password_hash, password):
            token = jwt.encode(
                {
                    "email": existing.email,
                    "username": existing.username,
                    "exp": time.time() + JWT_EXPIRES_IN,
                },
                JWT_SECRET,
                algorithm="HS256",
            )
            return jsonify(
                {
                    "success": True,
                    "token": token,
                    "user": existing.to_public_dict(),
                    "message": "Welcome back! We signed you in.",
                }
            )

        return jsonify({"error": "Email already registered"}), 400

    hashed = generate_password_hash(password)
    user = User(email=email, username=username, password_hash=hashed)
    db.session.add(user)
    db.session.commit()

    token = jwt.encode(
        {"email": user.email, "username": user.username, "exp": time.time() + JWT_EXPIRES_IN},
        JWT_SECRET,
        algorithm="HS256",
    )
    return jsonify(
        {
            "success": True,
            "token": token,
            "user": user.to_public_dict(),
        }
    )


def _extract_token() -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1].strip()

    bearer_token = request.cookies.get("learnableToken")
    if bearer_token:
        return bearer_token

    return None


def authenticate_token(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        token = _extract_token()
        if not token:
            return jsonify({"error": "Unauthorized"}), 401

        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Session expired, please sign in again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid authentication token."}), 401

        email = payload.get("email")
        if not email:
            return jsonify({"error": "Invalid token payload."}), 401

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"error": "User not found."}), 401

        g.current_user = user
        g.current_user_payload = payload

        return view_func(*args, **kwargs)

    return wrapper

# ---------------------------
# Signin
# ---------------------------
@auth_bp.route("/signin", methods=["POST"])
def signin():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()
    password = (data.get("password") or "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    if not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = jwt.encode(
        {"email": user.email, "username": user.username, "exp": time.time() + JWT_EXPIRES_IN},
        JWT_SECRET,
        algorithm="HS256",
    )
    return jsonify(
        {
            "success": True,
            "token": token,
            "user": user.to_public_dict(),
        }
    )
