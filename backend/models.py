from sqlalchemy import Column, Integer, String, Boolean
from database import Base

# Esta classe representa a tabela de tarefas no banco de dados.
class Tarefa(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    describe = Column(String, index=True)
    completed = Column(Boolean, default=False)