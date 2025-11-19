from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserBase(BaseModel):
    email: EmailStr
    verified: bool
    pseudonym: str = Field(..., max_length=100)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    pseudonym: Optional[str] = Field(None, max_length=100)
    password: Optional[str] = Field(None, min_length=8)

class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: int

class RateLimitingBase(BaseModel):
    tokens: int
    num_messages: int
    date: date

class RateLimitingCreate(RateLimitingBase):
    user_id: int

class RateLimitingUpdate(BaseModel):
    tokens: Optional[int] = None
    num_messages: Optional[int] = None

class RateLimitingRead(RateLimitingBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int



class HighlightBase(BaseModel):
    starting_index: int
    ending_index: int
    comment: Optional[str] = None

class HighlightCreate(HighlightBase):
    chatmessage_id: int

class HighlightUpdate(BaseModel):
    starting_index: Optional[int] = None
    ending_index: Optional[int] = None
    comment: Optional[str] = None

class HighlightRead(HighlightBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    chatmessage_id: int



class ChatMessageBase(BaseModel):
    role: str = Field(..., max_length=50)
    content: str

class ChatMessageCreate(ChatMessageBase):
    chat_id: int

class ChatMessageUpdate(BaseModel):
    role: Optional[str] = Field(None, max_length=50)
    content: Optional[str] = None

class ChatMessageRead(ChatMessageBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    chat_id: int

class ChatMessageReadWithHighlights(ChatMessageRead):
    highlights: List[HighlightRead] = []



class ChatBase(BaseModel):
    title: str = Field(..., max_length=255)
    model_name: str = Field(..., max_length=255)
    starred: bool = False
    is_public: bool = False

class ChatCreate(ChatBase):
    owner_id: int

class ChatUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    model_name: Optional[str] = Field(None, max_length=255)
    starred: Optional[bool] = None
    is_public: Optional[bool] = None

class ChatRead(ChatBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    owner_id: int
    slug: str
    created_at: datetime
    likes: int
    published_at: Optional[datetime] = None

class ChatReadWithMessages(ChatRead):
    messages: List[ChatMessageReadWithHighlights] = []

# Additional User

class UserReadWithChats(UserRead):
    chats: List[ChatRead] = []


class UserReadWithChatsAndUsage(UserRead):
    chats: List[ChatRead] = []
    usage: List[RateLimitingRead] = []
