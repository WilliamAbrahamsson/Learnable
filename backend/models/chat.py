from extensions import db
from time import time


class Chat(db.Model):
    __tablename__ = "chat"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    canvas_id = db.Column(db.Integer, db.ForeignKey("canvas.id", ondelete="CASCADE"), nullable=False, unique=True)
    created_at = db.Column(db.Integer, nullable=False, default=lambda: int(time()))
    updated_at = db.Column(db.Integer, nullable=False, default=lambda: int(time()), onupdate=lambda: int(time()))

    # one-to-one relationship back to Canvas
    canvas = db.relationship("Canvas", back_populates="chat")

    # one-to-many relationship: one chat → many messages
    messages = db.relationship("ChatMessage", backref="chat", cascade="all, delete", lazy=True)

    def to_dict(self, include_messages=False):
        data = {
            "id": self.id,
            "canvas_id": self.canvas_id,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
        if include_messages:
            data["messages"] = [m.to_dict() for m in self.messages]
        return data
