from flask import Blueprint, request, jsonify, g
from extensions import db
from models.user import User
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import time
import os
from functools import wraps
from typing import Optional
from dotenv import load_dotenv

# Load .env variables
load_dotenv()

# Try importing Google authentication libraries
try:
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests
    GOOGLE_AUTH_ENABLED = True
except ImportError:
    GOOGLE_AUTH_ENABLED = False

auth_bp = Blueprint("auth_bp", __name__)

# ---------------------------
# Configuration
# ---------------------------
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("❌ Missing JWT_SECRET environment variable. Set it in your .env or system env.")

JWT_EXPIRES_IN = int(os.getenv("JWT_EXPIRES_IN", "604800"))  # 7 days
GOOGLE_CLIENT_ID = os.getenv(
    "GOOGLE_CLIENT_ID",
    "643170114345-sc3nbsh1398mfifrub0v8jgouhod6njl.apps.googleusercontent.com"
).strip()
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "GOC...").strip()


# ---------------------------
# Helper: Create JWT token
# ---------------------------
def create_jwt_token(user: User) -> str:
    return jwt.encode(
        {
            "email": user.email,
            "username": user.username,
            "exp": time.time() + JWT_EXPIRES_IN,
        },
        JWT_SECRET,
        algorithm="HS256",
    )


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
        # If password matches, log them in instead
        if check_password_hash(existing.password_hash, password):
            token = create_jwt_token(existing)
            return jsonify(
                {
                    "success": True,
                    "token": token,
                    "user": existing.to_public_dict(),
                    "message": "Welcome back! You are signed in.",
                }
            )
        return jsonify({"error": "Email already registered"}), 400

    # Create new user with default token balance (handled by model default)
    hashed = generate_password_hash(password)
    user = User(email=email, username=username, password_hash=hashed)
    db.session.add(user)
    db.session.commit()

    token = create_jwt_token(user)
    return jsonify(
        {
            "success": True,
            "token": token,
            "user": user.to_public_dict(),
            "message": "Account created successfully. Welcome aboard!",
        }
    )


# ---------------------------
# Token extraction & decorator
# ---------------------------
def _extract_token() -> Optional[str]:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1].strip()
    cookie_token = request.cookies.get("learnableToken")
    return cookie_token or None


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
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_jwt_token(user)
    return jsonify(
        {
            "success": True,
            "token": token,
            "user": user.to_public_dict(),
            "message": "Signed in successfully.",
        }
    )


# ---------------------------
# Google Sign-In / Sign-Up
# ---------------------------
@auth_bp.route("/google", methods=["POST"])
def google_signin():
    if not GOOGLE_CLIENT_ID:
        return jsonify({"error": "Google Sign-In not configured on the server."}), 500

    data = request.get_json(silent=True) or {}
    id_token_str = (data.get("id_token") or data.get("credential") or "").strip()
    if not id_token_str:
        return jsonify({"error": "Missing Google ID token."}), 400

    if not GOOGLE_AUTH_ENABLED:
        return jsonify(
            {
                "error": "google-auth not installed on this server.",
                "hint": "Run: pip install google-auth google-auth-oauthlib",
            }
        ), 500

    try:
        req = google_requests.Request()
        idinfo = google_id_token.verify_oauth2_token(id_token_str, req, GOOGLE_CLIENT_ID)
        iss = idinfo.get("iss")
        if iss not in ("accounts.google.com", "https://accounts.google.com"):
            return jsonify({"error": "Invalid token issuer."}), 401

        email = idinfo.get("email")
        name = idinfo.get("name")
        picture = idinfo.get("picture")
        google_sub = idinfo.get("sub")
    except Exception as e:
        return jsonify({"error": f"Invalid Google token: {str(e)}"}), 401

    if not email:
        return jsonify({"error": "Google account missing email."}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        # Create new Google user with default token balance
        random_hash = generate_password_hash(os.urandom(16).hex())
        user = User(
            email=email,
            username=name,
            password_hash=random_hash,
            google_id=google_sub,
            profile_picture=picture,
            is_google_account=1,
        )
        db.session.add(user)
        db.session.commit()
    else:
        changed = False
        if not getattr(user, "google_id", None) and google_sub:
            user.google_id = google_sub
            changed = True
        if picture and getattr(user, "profile_picture", None) != picture:
            user.profile_picture = picture
            changed = True
        if changed:
            db.session.commit()

    token = create_jwt_token(user)
    return jsonify(
        {
            "success": True,
            "token": token,
            "user": user.to_public_dict(),
            "message": "Signed in with Google successfully.",
        }
    )


# ---------------------------
# Get current user info
# ---------------------------
@auth_bp.route("/me", methods=["GET"])
@authenticate_token
def get_current_user():
    """Return the currently authenticated user's public data, including token balance."""
    return jsonify(
        {
            "success": True,
            "user": g.current_user.to_public_dict(),
        }
    )
