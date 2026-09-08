from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import models, schemas, database

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Market Categorizer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Market Categorizer Backend is running"}

@app.get("/runs", response_model=List[schemas.Run])
def get_runs(db: Session = Depends(database.get_db)):
    return db.query(models.Run).order_by(models.Run.created_at.desc()).all()

@app.post("/upload-run", response_model=schemas.Run)
def upload_run(run: schemas.RunCreate, db: Session = Depends(database.get_db)):
    db_run = db.query(models.Run).filter(models.Run.run_name == run.run_name).first()
    if db_run:
        raise HTTPException(status_code=400, detail="Run name already exists")
    
    new_run = models.Run(run_name=run.run_name, keywords=run.keywords)
    db.add(new_run)
    db.commit()
    db.refresh(new_run)
    
    for prod in run.products:
        db_prod = models.Product(**prod.model_dump(), run_id=new_run.id)
        db.add(db_prod)
    
    db.commit()
    return new_run

@app.get("/runs/{run_id}/products", response_model=List[schemas.Product])
def get_products(run_id: str, db: Session = Depends(database.get_db)):
    return db.query(models.Product).filter(
        models.Product.run_id == run_id,
        models.Product.is_fba == True
    ).all()

@app.get("/runs/{run_id}/labels", response_model=List[schemas.Label])
def get_labels(run_id: str, db: Session = Depends(database.get_db)):
    return db.query(models.Label).filter(models.Label.run_id == run_id).order_by(models.Label.created_at.asc()).all()

@app.post("/runs/{run_id}/labels", response_model=schemas.Label)
def create_label(run_id: str, label: schemas.LabelBase, db: Session = Depends(database.get_db)):
    db_label = models.Label(**label.model_dump(), run_id=run_id)
    db.add(db_label)
    db.commit()
    db.refresh(db_label)
    return db_label


@app.put("/labels/{label_id}", response_model=schemas.Label)
def edit_label(label_id: str, label_data: schemas.LabelBase, db: Session = Depends(database.get_db)):
    db_label = db.query(models.Label).filter(models.Label.id == label_id).first()
    if not db_label:
        raise HTTPException(status_code=404, detail="Label not found")
    db_label.name = label_data.name
    if label_data.color:
        db_label.color = label_data.color
    db.commit()
    db.refresh(db_label)
    return db_label

@app.delete("/labels/{label_id}")

def delete_label(label_id: str, db: Session = Depends(database.get_db)):
    db_label = db.query(models.Label).filter(models.Label.id == label_id).first()
    if not db_label:
        raise HTTPException(status_code=404, detail="Label not found")
    
    # Nullify label_id for products that had this label (handled by SQLAlchemy cascade or manual)
    db.query(models.Product).filter(models.Product.label_id == label_id).update({"label_id": None})
    
    db.delete(db_label)
    db.commit()
    return {"message": "Label deleted"}

@app.put("/categorizations")
def categorize_product(req: schemas.CategorizeRequest, db: Session = Depends(database.get_db)):
    prod = db.query(models.Product).filter(models.Product.asin == req.asin).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    prod.label_id = req.label_id
    db.commit()
    return {"message": "Product categorized"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
