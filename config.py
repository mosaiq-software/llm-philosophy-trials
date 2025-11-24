import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./llm_philosophy_trials.db")
    JWT_SECRET = os.getenv("JWT_SECRET")
    JWT_ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))
    DAILY_TOKEN_LIMIT = int(os.getenv("DAILY_TOKEN_LIMIT"))
    DAILY_MESSAGE_LIMIT = int(os.getenv("DAILY_MESSAGE_LIMIT"))