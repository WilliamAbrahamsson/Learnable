from extensions import db
from time import time


class ElementGroup(db.Model):
    __tablename__ = "element_group"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    canvas_id = db.Column(db.Integer, db.ForeignKey("canvas.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.String(255), nullable=False, default="Group")
    created_at = db.Column(db.Integer, nullable=False, default=lambda: int(time()))
    updated_at = db.Column(db.Integer, nullable=False, default=lambda: int(time()), onupdate=lambda: int(time()))

    members = db.relationship("ElementGroupMember", backref="group", cascade="all, delete", lazy=True)

    def to_dict(self, include_elements: bool = True):
        data = {
            "id": self.id,
            "canvas_id": self.canvas_id,
            "name": self.name,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
        if include_elements:
            data["element_ids"] = [m.element_id for m in (self.members or [])]
        return data


class ElementGroupMember(db.Model):
    __tablename__ = "element_group_member"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    group_id = db.Column(db.Integer, db.ForeignKey("element_group.id", ondelete="CASCADE"), nullable=False)
    element_id = db.Column(db.Integer, db.ForeignKey("canvas_element.id", ondelete="CASCADE"), nullable=False)

    def to_dict(self):
        return {"id": self.id, "group_id": self.group_id, "element_id": self.element_id}

