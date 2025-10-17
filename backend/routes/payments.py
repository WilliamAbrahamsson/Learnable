from flask import Blueprint, request, jsonify, g
from extensions import db
from models.user import User
from models.purchases import Purchase
from models.token_transactions import TokenTransaction
from routes.auth import authenticate_token

payments_bp = Blueprint("payments_bp", __name__)

# -------------------------------
# 🧾 Get all purchases for a user
# -------------------------------
@payments_bp.route("/history", methods=["GET"])
@authenticate_token
def get_purchase_history():
    """Return all purchases for the logged-in user"""
    user_id = g.current_user.id
    purchases = Purchase.query.filter_by(user_id=user_id).order_by(Purchase.created_at.desc()).all()
    return jsonify([p.to_dict() for p in purchases]), 200


# -------------------------------
# 💰 Buy token pack (demo only)
# -------------------------------
@payments_bp.route("/buy", methods=["POST"])
@authenticate_token
def buy_token_pack():
    """Simulate buying a token pack — adds tokens and records purchase."""
    user = g.current_user
    data = request.get_json(silent=True) or {}

    tokens = int(data.get("tokens", 0))
    price_usd = float(data.get("price_usd", 0))
    product_name = data.get("product_name", f"{tokens:,} Token Pack")

    if tokens <= 0:
        return jsonify({"error": "Invalid token amount"}), 400

    # Update user balance
    user.token_balance = (user.token_balance or 0) + tokens

    # Create purchase record
    purchase = Purchase(
        user_id=user.id,
        product_name=product_name,
        tokens_given=tokens,
        price_usd=price_usd,
        payment_method="demo",
        status="completed",
    )
    db.session.add(purchase)

    # Log token transaction
    transaction = TokenTransaction(
        user_id=user.id,
        change_amount=tokens,
        description=f"Purchase: {product_name}",
    )
    db.session.add(transaction)

    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"Added {tokens:,} tokens to your balance.",
        "user": user.to_public_dict(),
        "purchase": purchase.to_dict(),
    }), 200


# -------------------------------
# 💸 Spend tokens (for AI usage etc.)
# -------------------------------
@payments_bp.route("/spend", methods=["POST"])
@authenticate_token
def spend_tokens():
    """Spend tokens for AI or other actions (deducts from balance)."""
    user = g.current_user
    data = request.get_json(silent=True) or {}
    amount = int(data.get("amount", 0))
    reason = data.get("reason", "Usage")

    if amount <= 0:
        return jsonify({"error": "Invalid token amount"}), 400
    if (user.token_balance or 0) < amount:
        return jsonify({"error": "Not enough tokens"}), 400

    # Deduct and log
    user.token_balance -= amount
    tx = TokenTransaction(
        user_id=user.id,
        change_amount=-amount,
        description=reason,
    )
    db.session.add(tx)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"Spent {amount:,} tokens for {reason}.",
        "user": user.to_public_dict(),
    }), 200
