import models, database
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware  # Importe a biblioteca de CORS
from sqlalchemy.orm import Session
from pydantic import BaseModel

app = FastAPI()

# Configuração do CORS
origins = [
    "http://127.0.0.1:5500"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=database.engine)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Classes para validação e tipagem dos dados (Pydantic).
class TarefaBase(BaseModel):
    title: str
    describe: str
    completed: bool = False

class Tarefa(TarefaBase):
    id: int

    class Config:
        orm_mode = True




# --- ENDPOINTS DA API ---

# Endpoint 1: Criar uma nova tarefa (POST)
@app.post("/todos/", response_model=Tarefa)
def criar_tarefa(tarefa: TarefaBase, db: Session = Depends(get_db)):
    db_tarefa = models.Tarefa(title=tarefa.title, describe=tarefa.describe, completed=tarefa.completed)
    db.add(db_tarefa)
    db.commit()
    db.refresh(db_tarefa)
    return db_tarefa

# Endpoint 2: Listar todas as tarefas (GET)
@app.get("/todos/", response_model=list[Tarefa])
def listar_tarefas(db: Session = Depends(get_db)):
    tarefas = db.query(models.Tarefa).all()
    return tarefas

# Endpoint 3: Atualizar uma tarefa (PUT)
@app.put("/todos/{tarefa_id}", response_model=Tarefa)
def atualizar_tarefa(tarefa_id: int, tarefa: TarefaBase, db: Session = Depends(get_db)):
    db_tarefa = db.query(models.Tarefa).filter(models.Tarefa.id == tarefa_id).first()
    if db_tarefa is None:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    db_tarefa.title = tarefa.title
    db_tarefa.describe = tarefa.describe
    db_tarefa.completed = tarefa.completed
    db.commit()
    db.refresh(db_tarefa)
    return db_tarefa

# Endpoint 4: Excluir uma tarefa (DELETE)
@app.delete("/todos/{tarefa_id}")
def excluir_tarefa(tarefa_id: int, db: Session = Depends(get_db)):
    db_tarefa = db.query(models.Tarefa).filter(models.Tarefa.id == tarefa_id).first()
    if db_tarefa is None:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    db.delete(db_tarefa)
    db.commit()
    return {"message": "Tarefa excluída com sucesso"}

# Endpoint 5: Excluir todas as tarefas (DELETE)
@app.delete("/todos/")
def excluir_todas_as_tarefas(db: Session = Depends(get_db)):
    db.query(models.Tarefa).delete()
    db.commit()
    return {"message": "Todas as tarefas foram excluídas com sucesso."}