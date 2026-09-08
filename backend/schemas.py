from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

class LabelBase(BaseModel):
    name: str
    color: str = "#6366f1"

class LabelCreate(LabelBase):
    run_id: str

class Label(LabelBase):
    id: str
    run_id: str
    created_at: datetime
    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    asin: str
    title: Optional[str] = None
    photos: Optional[List[str]] = []
    price: Optional[float] = 0.0
    rating: Optional[float] = 0.0
    num_reviews: Optional[int] = 0
    brand: Optional[str] = None
    estimated_sales: Optional[int] = 0
    est_revenue: Optional[float] = 0.0
    ai_normalized_data: Optional[Any] = {}
    raw_reviews: Optional[List[Any]] = []
    label_id: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    run_id: str
    class Config:
        from_attributes = True

class RunBase(BaseModel):
    run_name: str
    keywords: List[str]

class RunCreate(RunBase):
    products: List[ProductCreate]

class Run(RunBase):
    id: str
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

class CategorizeRequest(BaseModel):
    asin: str
    label_id: Optional[str] = None

class CategorizeBulkRequest(BaseModel):
    asins: List[str]
    label_id: Optional[str] = None
