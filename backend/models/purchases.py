from extensions import db
from time import time

class Purchase(db.Model):
    __tablename__ = "purchases"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_name = db.Column(db.String(255), nullable=False)  # e.g., "50k Token Pack", "Pro Plan"
    tokens_given = db.Column(db.Integer, default=0)
    price_usd = db.Column(db.Float, default=0.0)
    payment_method = db.Column(db.String(100), default="demo")  # e.g., "Stripe", "Demo", "Credit Card"
    status = db.Column(db.String(50), default="completed")
    created_at = db.Column(db.Integer, nullable=False, default=lambda: int(time()))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "product_name": self.product_name,
            "tokens_given": self.tokens_given,
            "price_usd": self.price_usd,
            "payment_method": self.payment_method,
            "status": self.status,
            "created_at": self.created_at,
        }
