from extensions import db
from time import time

class Note(db.Model):
    __tablename__ = "notes"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    name = db.Column(db.String, nullable=False, default="Untitled")
    description = db.Column(db.Text, default="")
    x_pos = db.Column(db.Float, nullable=False, default=0)
    y_pos = db.Column(db.Float, nullable=False, default=0)
    width = db.Column(db.Float, default=280)
    height = db.Column(db.Float, default=200)
    image_url = db.Column(db.String, nullable=True)

    created_at = db.Column(db.Integer, default=lambda: int(time()))
    updated_at = db.Column(db.Integer, default=lambda: int(time()), onupdate=lambda: int(time()))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "description": self.description,
            "x_pos": self.x_pos,
            "y_pos": self.y_pos,
            "width": self.width,
            "height": self.height,
            "image_url": self.image_url,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
