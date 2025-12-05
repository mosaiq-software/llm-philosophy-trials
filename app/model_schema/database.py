import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from config import Config as conf

load_dotenv()

connect_args = {"check_same_thread": False} if conf.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(conf.DATABASE_URL, connect_args=connect_args, echo=True)  
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def init_db():
    import app.model_schema.models
    Base.metadata.create_all(bind=engine)

def shutdown_db():
    engine.dispose()