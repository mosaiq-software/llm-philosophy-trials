from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# Auth & User

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str
    email: EmailStr
    exp: Optional[int] = None


# Keep for the chance that we switch back to JSON instead of Forms
# class UserCreate(BaseModel):
#     email: EmailStr
#     pseudonym: str = Field(..., max_length=100)
#     password: str = Field(..., min_length=8)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    verified: bool
    pseudonym: str


# Keep for the chance that we switch back to JSON instead of Forms
# class EmailVerificationCode(BaseModel):
#     code: str = Field(..., min_length=6, max_length=64)


# RateLimiting

class RateLimitingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    tokens: int
    num_messages: int
    date: date


# Chat, Messages, & Highlights

class HighlightRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    chatmessage_id: int
    starting_index: int
    ending_index: int
    comment: Optional[str] = None


class HighlightCreatePayload(BaseModel):
    starting_index: int
    ending_index: int
    comment: Optional[str] = None


class ChatMessageCreatePayload(BaseModel):
    role: int = Field(..., ge=0, le=1, description="0=user, 1=model")
    content: str
    highlights: Optional[List[HighlightCreatePayload]] = None


class ChatMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    chat_id: int
    role: int
    content: str
    highlights: List[HighlightRead] = []


class ChatHistoryPayload(BaseModel):
    model_id: int
    pretty_name: Optional[str] = None
    messages: List[ChatMessageCreatePayload]


class ChatSaveRequest(BaseModel):
    title: str = Field(..., max_length=255)
    anonymous: bool = False
    history: ChatHistoryPayload


class ChatSaveResponse(BaseModel):
    success: bool = True
    chat_id: int


class ChatPublishFromSavedRequest(BaseModel):
    chat_id: int
    new_title: str = Field(..., max_length=255)
    anonymous: bool = False


class ChatRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    owner_id: int
    title: str
    slug: str
    model_id: int
    is_public: bool
    anonymous: bool
    likes: int
    created_at: datetime
    published_at: Optional[datetime] = None
    messages: List[ChatMessageRead] = []


# OpenRouter API communication

class ChatSubmitRequest(BaseModel):
    model_id: int
    prompt: str
    sources_list: List[str] = []


class ChatSubmitResponse(BaseModel):
    model_id: int
    response_text: str
    prompt_tokens: int
    completion_tokens: int
