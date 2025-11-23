import os
import re
import secrets
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.templating import Jinja2Templates
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, sessionmaker

from app import models_list # Schema example: "1 : { "api_name" : "minimax/minimax-m2:free", "pretty_name" : "Minimax M2"}"
from app.model_schema import models as db_models
from app.model_schema import schema as schemas
from pydantic import EmailStr

from config import Config as conf


connect_args = {"check_same_thread": False} if conf.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(conf.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

db_models.Base.metadata.create_all(bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")
templates = Jinja2Templates(directory="app/templates")
router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    payload = data.copy()
    expire = datetime.now() + (expires_delta or timedelta(minutes=conf.ACCESS_TOKEN_EXPIRE_MINUTES))
    payload.update({"exp": expire})
    return jwt.encode(payload, conf.JWT_SECRET, algorithm=conf.JWT_ALGORITHM)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_user_by_email(db: Session, email: str) -> Optional[db_models.User]:
    stmt = select(db_models.User).where(db_models.User.email == email)
    return db.execute(stmt).scalars().first()


def generate_verification_code(length: int = 6) -> str:
    return f"{secrets.randbelow(10**length):0{length}d}"


def save_verification_token(db: Session, user_id: int, expires_minutes: int = 60 * 24) -> str:
    # This handles cases where the user missed the first email and requests a second, they will already have a record in the database, so we set it to used
    db.query(db_models.EmailVerificationToken).filter_by(user_id=user_id, used=False).update({"used": True})

    code = generate_verification_code()
    while (
        db.query(db_models.EmailVerificationToken)
        .filter(db_models.EmailVerificationToken.token == code)
        .first()
        is not None
    ):
        code = generate_verification_code()

    record = db_models.EmailVerificationToken(
        user_id=user_id,
        token=code,
        expires_at=datetime.now() + timedelta(minutes=expires_minutes),
        used=False,
    )
    db.add(record)
    db.commit()
    return code


def slugify(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9-]+", "-", value.lower()).strip("-")
    return cleaned or "chat"


def unique_slug(db: Session, base: str) -> str:
    slug = base
    suffix = 1
    while db.execute(select(db_models.Chat).where(db_models.Chat.slug == slug)).scalars().first():
        slug = f"{base}-{suffix}"
        suffix += 1
    return slug


def _get_or_create_daily_usage(db: Session, user_id: int, lock_row: bool = False) -> db_models.RateLimiting:
    today = date.today()
    query = db.query(db_models.RateLimiting).filter_by(user_id=user_id, date=today)
    if lock_row:
        query = query.with_for_update()

    usage = query.first()
    if usage is None:
        usage = db_models.RateLimiting(user_id=user_id, date=today, tokens=0, num_messages=0)
        db.add(usage)
        db.flush()
    return usage


def check_rate_limits(db: Session, user_id: int) -> None:
    usage = _get_or_create_daily_usage(db, user_id=user_id)

    if usage.tokens > conf.DAILY_TOKEN_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Daily token limit reached.",
        )
    if usage.num_messages > conf.DAILY_MESSAGE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Daily message limit reached.",
        )


def update_rate_limits(db: Session, user_id: int, tokens_used: int, message_increment: int = 1) -> None:
    usage = _get_or_create_daily_usage(db, user_id=user_id, lock_row=True)
    usage.tokens += tokens_used
    usage.num_messages += message_increment
    db.commit()


# Equivalent purpose as 'login_required' decorator from Flask
def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> db_models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, conf.JWT_SECRET, algorithms=[conf.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        if user_id is None or email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.get(db_models.User, int(user_id))
    if user is None:
        raise credentials_exception
    return user

# Optional version used for page rendering, so that the user can be redirected rather than errored
def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[db_models.User]:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.lower().startswith("bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, conf.JWT_SECRET, algorithms=[conf.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
    except JWTError:
        return None
    return db.get(db_models.User, int(user_id))


# -------------------- Auth --------------------

@router.post("/auth/signup", response_model=schemas.UserRead, status_code=status.HTTP_201_CREATED)
def signup(email: EmailStr = Form(...), password: str = Form(...), pseudonym: str = Form(...), db: Session = Depends(get_db)):
    if get_user_by_email(db, email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = db_models.User(
        email=email,
        password_hash=hash_password(password),
        verified=False,
        pseudonym=pseudonym,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    save_verification_token(db, user_id=user.id)
    return schemas.UserRead.model_validate(user)


@router.post("/auth/token", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = get_user_by_email(db, form_data.username)
    if user is None or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    if not user.verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified")

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    return schemas.Token(access_token=access_token)


@router.post("/auth/verify")
def verify_email(code: str = Form(...), db: Session = Depends(get_db)):
    record = (
        db.query(db_models.EmailVerificationToken)
        .filter(db_models.EmailVerificationToken.token == code)
        .first()
    )
    if record is None or record.used:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")
    if record.expires_at < datetime.now():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code expired")

    user = db.get(db_models.User, record.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.verified = True
    record.used = True
    db.commit()
    return {"detail": "Verification successful"}


# -------------------- Pages --------------------


@router.get("/", response_class=HTMLResponse)
async def home(
    request: Request,
    current_user: Optional[db_models.User] = Depends(get_current_user_optional),
):
    if current_user is None:
        return RedirectResponse(url="/examples", status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    return templates.TemplateResponse("index.html", {"request": request, "user": current_user, "models": models_list}) # Parse 'models_list' before returning so that only the model_id and pretty_name are returned, the api_name is not needed by the frontend


# Grab every Chat from the database with 'is_public' set to true, return in the template
@router.get("/examples", response_class=HTMLResponse)
async def examples(request: Request):
    return templates.TemplateResponse("examples.html", {"request": request, "examples_view": True})


@router.get("/saved-chats", response_class=HTMLResponse)
async def saved_chats(
    request: Request,
    current_user: Optional[db_models.User] = Depends(get_current_user_optional),
):
    if current_user is None:
        return RedirectResponse(url="/examples", status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    return templates.TemplateResponse("saved.html", {"request": request, "user": current_user, "saved_view": True})


# -------------------- Chat API --------------------


@router.post("/api/v1/chat/submit", response_model=schemas.ChatSubmitResponse)
def submit_chat(
    payload: schemas.ChatSubmitRequest,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    model_info = models_list.get(payload.model_id)
    if model_info is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown model_id")

    sources_text = "\n\n".join(payload.sources_list)
    combined_prompt = f"{payload.prompt}\n\nSOURCES:\n{sources_text}" if sources_text else payload.prompt

    # Check current token and message stats, do not update yet
    check_rate_limits(db, user_id=current_user.id)

    # Make API call to OpenRouter here, obtain the model response and token usage
    response_text = ...
    tokens_used = ...

    update_rate_limits(db, user_id=current_user.id, tokens_used=tokens_used)

    response_text = f"{model_info.get('pretty_name', 'Model')} response to: {payload.prompt}"
    return schemas.ChatSubmitResponse(
        model_id=payload.model_id,
        response_text=response_text,
        tokens_used=tokens_used,
    )


@router.post("/api/v1/chats/save", response_model=schemas.ChatSaveResponse)
def save_chat(
    payload: schemas.ChatSaveRequest,
    publish: bool = False,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    model_info = models_list.get(payload.history.model_id)
    if model_info is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown model_id")

    base_slug = slugify(payload.title)
    slug = unique_slug(db, base_slug)

    is_public = bool(publish)
    anonymous = payload.anonymous if is_public else False
    published_at = datetime.now() if is_public else None

    chat = db_models.Chat(
        owner_id=current_user.id,
        title=payload.title,
        model_id=payload.history.model_id,
        slug=slug,
        is_public=is_public,
        anonymous=anonymous,
        published_at=published_at,
    )

    for message in payload.history.messages:
        db_message = db_models.ChatMessage(role=message.role, content=message.content)
        if message.highlights:
            for highlight in message.highlights:
                db_message.highlights.append(
                    db_models.Highlight(
                        starting_index=highlight.starting_index,
                        ending_index=highlight.ending_index,
                        comment=highlight.comment,
                    )
                )
        chat.messages.append(db_message)

    db.add(chat)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not save chat!")
    db.refresh(chat)

    return schemas.ChatSaveResponse(chat_id=chat.id)


@router.put("/api/v1/chats/publish-from-saved")
def publish_from_saved(
    payload: schemas.ChatPublishFromSavedRequest,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    chat = db.query(db_models.Chat).filter_by(id=payload.chat_id).first()
    if chat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    if chat.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your chat")

    new_slug = unique_slug(db, slugify(payload.new_title))
    chat.title = payload.new_title
    chat.slug = new_slug
    chat.is_public = True
    chat.anonymous = payload.anonymous
    chat.published_at = datetime.now()

    db.commit()
    db.refresh(chat)
    return {"success": True, "public_chat_id": chat.id, "slug": chat.slug}


@router.get("/api/v1/chats/saved/{slug}", response_model=schemas.ChatRead)
def get_saved_chat(
    slug: str,
    db: Session = Depends(get_db),
    current_user: Optional[db_models.User] = Depends(get_current_user_optional),
):
    stmt = (
        select(db_models.Chat)
        .where(db_models.Chat.slug == slug)
        .options(
            joinedload(db_models.Chat.messages).joinedload(db_models.ChatMessage.highlights)
        )
    )
    chat = db.execute(stmt).scalars().first()
    if chat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")

    if not chat.is_public and (current_user is None or chat.owner_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chat is private")

    return schemas.ChatRead.model_validate(chat)
