from extensions import db
from time import time

class Chat(db.Model):
    __tablename__ = "chat"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    graph_id = db.Column(db.Integer, db.ForeignKey("graph.id", ondelete="CASCADE"), nullable=False)
    created_at = db.Column(db.Integer, default=lambda: int(time()), nullable=False)
    updated_at = db.Column(db.Integer, default=lambda: int(time()), onupdate=lambda: int(time()), nullable=False)

    messages = db.relationship("ChatMessage", backref="chat", cascade="all, delete", lazy=True)

    def to_dict(self, include_messages=False):
        data = {
            "id": self.id,
            "graph_id": self.graph_id,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
        if include_messages:
            data["messages"] = [m.to_dict() for m in self.messages]
        return data
