from extensions import db
from time import time
import json


class CanvasElement(db.Model):
    __tablename__ = "canvas_element"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    canvas_id = db.Column(db.Integer, db.ForeignKey("canvas.id", ondelete="CASCADE"), nullable=False)

    # Basic shape info
    type = db.Column(db.String(50), nullable=False)  # rectangle, text, image, etc.
    x = db.Column(db.Float, nullable=False, default=0)
    y = db.Column(db.Float, nullable=False, default=0)
    width = db.Column(db.Float, nullable=True)
    height = db.Column(db.Float, nullable=True)
    rotation = db.Column(db.Float, nullable=False, default=0)
    z_index = db.Column(db.Integer, nullable=False, default=0)
    # Shared color: used as background for rectangles and as text color for text elements
    bgcolor = db.Column(db.String(16), nullable=False, default='#FFFFFF')

    # Flexible JSON metadata for text/images/etc.
    data = db.Column(db.JSON, nullable=True, default={})

    # Line endpoints (for type='line'). Stored in canvas/world coordinates.
    line_start_x = db.Column(db.Float, nullable=True)
    line_start_y = db.Column(db.Float, nullable=True)
    line_end_x = db.Column(db.Float, nullable=True)
    line_end_y = db.Column(db.Float, nullable=True)

    created_at = db.Column(db.Integer, nullable=False, default=lambda: int(time()))
    updated_at = db.Column(db.Integer, nullable=False, default=lambda: int(time()), onupdate=lambda: int(time()))

    def to_dict(self):
        return {
            "id": self.id,
            "canvas_id": self.canvas_id,
            "type": self.type,
            "x": self.x,
            "y": self.y,
            "width": self.width,
            "height": self.height,
            "rotation": self.rotation,
            "z_index": self.z_index,
            "bgcolor": self.bgcolor,
            "data": self.data or {},
            "line_start_x": self.line_start_x,
            "line_start_y": self.line_start_y,
            "line_end_x": self.line_end_x,
            "line_end_y": self.line_end_y,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
