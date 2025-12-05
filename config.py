import os
from dotenv import load_dotenv

load_dotenv()

from dotenv import load_dotenv

load_dotenv()

class Config:
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./llm_philosophy_trials.db")
    JWT_SECRET = os.getenv("JWT_SECRET")
    JWT_ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))
    DAILY_TOKEN_LIMIT = int(os.getenv("DAILY_TOKEN_LIMIT"))
    DAILY_MESSAGE_LIMIT = int(os.getenv("DAILY_MESSAGE_LIMIT"))
    SMTP_SERVER: str = os.getenv("SMTP_SERVER")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER: str = os.getenv("SMTP_USER")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD")