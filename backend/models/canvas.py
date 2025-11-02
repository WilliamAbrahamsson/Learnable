from extensions import db
from time import time


class Canvas(db.Model):
    __tablename__ = "canvas"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.String(255), nullable=False, default="Untitled Canvas")
    created_at = db.Column(db.Integer, nullable=False, default=lambda: int(time()))
    updated_at = db.Column(db.Integer, nullable=False, default=lambda: int(time()), onupdate=lambda: int(time()))
    # Camera state
    camera_x = db.Column(db.Float, nullable=False, default=0.0)
    camera_y = db.Column(db.Float, nullable=False, default=0.0)
    camera_zoom_percentage = db.Column(db.Float, nullable=False, default=0.0)

    chat = db.relationship("Chat", back_populates="canvas", uselist=False, cascade="all, delete")
    elements = db.relationship("CanvasElement", backref="canvas", cascade="all, delete", lazy=True)

    def to_dict(self, include_elements=False):
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "camera_x": float(self.camera_x or 0.0),
            "camera_y": float(self.camera_y or 0.0),
            "camera_zoom_percentage": float(self.camera_zoom_percentage or 0.0),
        }
        if include_elements:
            data["elements"] = [el.to_dict() for el in self.elements]
        return data
