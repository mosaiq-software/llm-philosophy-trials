from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    pseudonym = Column(String(100), nullable=False)

    # RELATIONSHIPS
    chats = relationship(
        "Chat",
        back_populates="owner",
        cascade="all, delete-orphan",
    )
    usage = relationship(
        "RateLimiting",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} pseudonym={self.pseudonym}>"


class RateLimiting(Base):
    __tablename__ = "rate_limiting"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tokens = Column(Integer, nullable=False, default=0)
    num_messages = Column(Integer, nullable=False, default=0)
    date = Column(Date, nullable=False, default=date.today)

    # One record per user per day:
    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_rate_limiting_user_date"),
    )

    # RELATIONSHIPS
    user = relationship("User", back_populates="usage")

    def __repr__(self) -> str:
        return (f"<RateLimiting id={self.id} user_id={self.user_id} date={self.date} tokens={self.tokens} num_messages={self.num_messages}>")


class Chat(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    model_id = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False) # date first saved, not necessarily the same as 'published_at'
    starred = Column(Boolean, nullable=False, default=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)

    # Public posts only
    is_public = Column(Boolean, nullable=False, default=False, index=True)
    likes = Column(Integer, nullable=False, default=0)
    published_at = Column(DateTime(timezone=True), nullable=True)

    # RELATIONSHIPS
    owner = relationship("User", back_populates="chats")
    messages = relationship(
        "ChatMessage",
        back_populates="chat",
        cascade="all, delete-orphan",
        order_by="ChatMessage.id",
    )

    def __repr__(self) -> str:
        return f"<Chat id={self.id} title={self.title!r} owner_id={self.owner_id} public={self.is_public} likes={self.likes}>"


class ChatMessage(Base):
    __tablename__ = "chatmessages"

    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("chats.id"), nullable=False)
    role = Column(String(50), nullable=False) # user or model?
    content = Column(Text, nullable=False)

    # RELATIONSHIPS
    chat = relationship("Chat", back_populates="messages")
    highlights = relationship(
        "Highlight",
        back_populates="chatmessage",
        cascade="all, delete-orphan",
        order_by="Highlight.id",
    )

    def __repr__(self) -> str:
        return f"<ChatMessage id={self.id} chat_id={self.chat_id} role={self.role!r}>"


class Highlight(Base):
    __tablename__ = "highlights"

    id = Column(Integer, primary_key=True, index=True)
    chatmessage_id = Column(Integer, ForeignKey("chatmessages.id"), nullable=False)

    # Starting and ending position of a highlight
    starting_index = Column(Integer, nullable=False)
    ending_index = Column(Integer, nullable=False)

    comment = Column(Text, nullable=True)

    # RELATIONSHIPS
    chatmessage = relationship("ChatMessage", back_populates="highlights")

    def __repr__(self) -> str:
        return (f"<Highlight id={self.id} chatmessage_id={self.chatmessage_id} range=({self.starting_index} - {self.ending_index}) comment={self.comment}>")
