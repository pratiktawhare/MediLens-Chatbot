from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
import uuid

class User(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    email: str = Field(unique=True, index=True)
    full_name: str = Field(default="")
    hashed_password: str
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    sessions: List["ChatSession"] = Relationship(back_populates="user", cascade_delete=True)
    bookmarks: List["Bookmark"] = Relationship(back_populates="user", cascade_delete=True)

class ChatSession(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    title: str = Field(default="New Medical Consultation")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    user: Optional[User] = Relationship(back_populates="sessions")
    messages: List["ChatMessage"] = Relationship(back_populates="session", cascade_delete=True)

class ChatMessage(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    session_id: str = Field(foreign_key="chatsession.id", index=True)
    role: str = Field(index=True)  # "user" or "assistant"
    content: str
    image_url: Optional[str] = Field(default=None)
    sources_json: Optional[str] = Field(default=None)  # JSON-encoded array of retrieved citation objects
    emergency_alert: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    session: Optional[ChatSession] = Relationship(back_populates="messages")

class Bookmark(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    title: str
    snippet: str
    source: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    user: Optional[User] = Relationship(back_populates="bookmarks")
