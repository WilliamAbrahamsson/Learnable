from datetime import datetime
from extensions import db

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    username = db.Column(db.String(120), nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    google_id = db.Column(db.Text, nullable=True)
    profile_picture = db.Column(db.Text, nullable=True)
    is_google_account = db.Column(db.Integer, default=0)
    is_admin = db.Column(db.Integer, default=0)

    def to_public_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "username": self.username,
            "created_at": self.created_at.isoformat(),
            "profile_picture": self.profile_picture,
            "is_google_account": bool(self.is_google_account or 0),
            "is_admin": bool(getattr(self, "is_admin", 0) or 0),
        }
