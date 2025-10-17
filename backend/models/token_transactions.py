from extensions import db
from time import time

class TokenTransaction(db.Model):
    __tablename__ = "token_transactions"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    change_amount = db.Column(db.Integer, nullable=False)  # positive = gain, negative = usage
    description = db.Column(db.String(255), default="")     # e.g., "AI usage", "Purchase", "Bonus"
    created_at = db.Column(db.Integer, nullable=False, default=lambda: int(time()))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "change_amount": self.change_amount,
            "description": self.description,
            "created_at": self.created_at,
        }
