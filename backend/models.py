import uuid
from sqlalchemy import Column, String, Float, Integer, Boolean, ForeignKey, DateTime, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Run(Base):
    __tablename__ = "runs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    run_name = Column(String, unique=True, index=True)
    keywords = Column(JSON)  # List of strings
    status = Column(String, default="pending_tagging")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    products = relationship("Product", back_populates="run", cascade="all, delete-orphan")
    labels = relationship("Label", back_populates="run", cascade="all, delete-orphan")
    report = relationship("Report", back_populates="run", uselist=False, cascade="all, delete-orphan")

class Product(Base):
    __tablename__ = "products"
    asin = Column(String, primary_key=True)
    run_id = Column(String, ForeignKey("runs.id"))
    title = Column(Text)
    photos = Column(JSON)  # Array of URLs
    price = Column(Float, default=0.0)
    rating = Column(Float, default=0.0)
    num_reviews = Column(Integer, default=0)
    brand = Column(String)
    estimated_sales = Column(Integer, default=0)
    est_revenue = Column(Float, default=0.0)
    ai_normalized_data = Column(JSON)
    raw_reviews = Column(JSON)
    label_id = Column(String, ForeignKey("labels.id"), nullable=True)
    
    run = relationship("Run", back_populates="products")
    label = relationship("Label", back_populates="products")

class Label(Base):
    __tablename__ = "labels"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id = Column(String, ForeignKey("runs.id"))
    name = Column(String)
    color = Column(String, default="#6366f1")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    run = relationship("Run", back_populates="labels")
    products = relationship("Product", back_populates="label")

class Report(Base):
    __tablename__ = "reports"
    run_id = Column(String, ForeignKey("runs.id"), primary_key=True)
    final_html = Column(Text)
    insights_json = Column(JSON)
    generated_at = Column(DateTime, default=datetime.utcnow)
    
    run = relationship("Run", back_populates="report")
