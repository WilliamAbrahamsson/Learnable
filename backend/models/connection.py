from extensions import db
from time import time

class Connection(db.Model):
    __tablename__ = "connections"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    note_id_1 = db.Column(db.Integer, db.ForeignKey("notes.id", ondelete="CASCADE"), nullable=False)
    note_id_2 = db.Column(db.Integer, db.ForeignKey("notes.id", ondelete="CASCADE"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=True)

    slot_1 = db.Column(db.Integer, nullable=False, default=0)  # slot on first note
    slot_2 = db.Column(db.Integer, nullable=False, default=0)  # slot on second note
    strength = db.Column(db.Float, default=1.0)

    created_at = db.Column(db.Integer, default=lambda: int(time()))
    updated_at = db.Column(db.Integer, default=lambda: int(time()), onupdate=lambda: int(time()))

    def to_dict(self):
        return {
            "id": self.id,
            "note_id_1": self.note_id_1,
            "note_id_2": self.note_id_2,
            "slot_1": self.slot_1,
            "slot_2": self.slot_2,
            "strength": self.strength,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "user_id": self.user_id,
        }
