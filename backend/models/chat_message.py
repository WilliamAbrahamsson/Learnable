from extensions import db
from time import time

class ChatMessage(db.Model):
    __tablename__ = "chat_message"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    chat_id = db.Column(db.Integer, db.ForeignKey("chat.id", ondelete="CASCADE"), nullable=False)
    text = db.Column(db.Text, nullable=False)
    is_response = db.Column(db.Boolean, default=False, nullable=False)
    is_liked = db.Column(db.Boolean, default=False, nullable=False)
    is_disliked = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.Integer, default=lambda: int(time()), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "chat_id": self.chat_id,
            "text": self.text,
            "is_response": self.is_response,
            "is_liked": self.is_liked,
            "is_disliked": self.is_disliked,
            "created_at": self.created_at,
        }
