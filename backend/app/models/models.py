from sqlalchemy import Column, String, Date, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, index=True)
    push_token = Column(String, nullable=True)
    receipts = relationship("Receipt", back_populates="user")

class Receipt(Base):
    __tablename__ = "receipts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey("users.id"))
    text = Column(String)
    user = relationship("User", back_populates="receipts")
    items = relationship("Item", back_populates="receipt")

class Item(Base):
    __tablename__ = "items"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    receipt_id = Column(UUID(as_uuid=True), ForeignKey("receipts.id"))
    name = Column(String)
    expiry_date = Column(Date)
    notified = Column(Boolean, default=False)
    receipt = relationship("Receipt", back_populates="items")
