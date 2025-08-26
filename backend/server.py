from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
import jwt
from passlib.context import CryptContext
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security setup
SECRET_KEY = secrets.token_urlsafe(32)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI(title="Budget Tracker API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class CategoryType(str, Enum):
    NEEDS = "needs"
    WANTS = "wants"
    SAVINGS = "savings"

class TransactionType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"

class FamilyRelation(str, Enum):
    MASTER = "master"
    SPOUSE = "spouse"
    CHILD = "child"
    PARENT = "parent"
    SIBLING = "sibling"
    OTHER = "other"

class AccountType(str, Enum):
    INDIVIDUAL = "individual"
    FAMILY = "family"

class PaymentMode(str, Enum):
    CASH = "cash"
    ONLINE = "online"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"

# Authentication Models
class UserSignup(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    first_name: str
    last_name: str
    hashed_password: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

# Profile Models
class FamilyMember(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    first_name: str
    last_name: str
    relation: FamilyRelation
    is_registered: bool = False

class Profile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    first_name: str
    last_name: str
    email: EmailStr
    currency: str = "INR"
    bank_account: Optional[str] = None
    address: Optional[str] = None
    country: str
    account_type: AccountType
    is_master: bool = True
    master_profile_id: Optional[str] = None
    family_members: List[FamilyMember] = []
    monthly_income: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProfileCreate(BaseModel):
    first_name: str
    last_name: str
    currency: str = "INR"
    bank_account: Optional[str] = None
    address: Optional[str] = None
    country: str
    account_type: AccountType
    monthly_income: Optional[float] = None

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: CategoryType
    is_custom: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    profile_id: str
    user_id: str
    amount: float
    transaction_type: TransactionType
    category_id: str
    person_name: Optional[str] = None
    payment_mode: PaymentMode
    bank_app: Optional[str] = None
    description: Optional[str] = None
    date: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransactionCreate(BaseModel):
    amount: float
    transaction_type: TransactionType
    category_id: str
    person_name: Optional[str] = None
    payment_mode: PaymentMode
    bank_app: Optional[str] = None
    description: Optional[str] = None
    date: str

class CFRAnalysis(BaseModel):
    category_type: CategoryType
    budgeted_amount: float
    actual_amount: float
    deviation_percentage: float
    status: str
    recommended_percentage: float

# Helper functions
def prepare_for_mongo(data):
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
    return data

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

# Initialize default categories
DEFAULT_CATEGORIES = [
    # Needs
    {"name": "Grocery", "type": CategoryType.NEEDS},
    {"name": "Rent", "type": CategoryType.NEEDS},
    {"name": "Petrol", "type": CategoryType.NEEDS},
    {"name": "Monthly bills", "type": CategoryType.NEEDS},
    {"name": "Medical", "type": CategoryType.NEEDS},
    {"name": "Loan Repayment", "type": CategoryType.NEEDS},
    {"name": "Personal care", "type": CategoryType.NEEDS},
    {"name": "Salaries", "type": CategoryType.NEEDS},
    {"name": "Stationary", "type": CategoryType.NEEDS},
    {"name": "Bike Maintenance", "type": CategoryType.NEEDS},
    {"name": "Car Maintenance", "type": CategoryType.NEEDS},
    
    # Wants
    {"name": "Entertainment", "type": CategoryType.WANTS},
    {"name": "Fashion and Clothing", "type": CategoryType.WANTS},
    {"name": "Food And Restaurant", "type": CategoryType.WANTS},
    {"name": "Gift", "type": CategoryType.WANTS},
    {"name": "Sports and Hobby", "type": CategoryType.WANTS},
    {"name": "Travel", "type": CategoryType.WANTS},
    {"name": "Home Requirements", "type": CategoryType.WANTS},
    
    # Investment/Savings
    {"name": "Investment/Savings", "type": CategoryType.SAVINGS},
    {"name": "Insurance", "type": CategoryType.SAVINGS},
    {"name": "Donation", "type": CategoryType.SAVINGS}
]

async def initialize_categories():
    """Initialize default categories if they don't exist"""
    existing_categories = await db.categories.count_documents({})
    if existing_categories == 0:
        category_objects = [Category(**cat, is_custom=False) for cat in DEFAULT_CATEGORIES]
        categories_dict = [prepare_for_mongo(cat.dict()) for cat in category_objects]
        await db.categories.insert_many(categories_dict)

# Authentication Routes
@api_router.post("/signup", response_model=Token)
async def signup(user_data: UserSignup):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        hashed_password=hashed_password
    )
    
    user_dict = prepare_for_mongo(user.dict())
    await db.users.insert_one(user_dict)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user={
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name
        }
    )

@api_router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["id"]}, expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user={
            "id": user["id"],
            "email": user["email"],
            "first_name": user["first_name"],
            "last_name": user["last_name"]
        }
    )

@api_router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# Profile Routes
@api_router.post("/profile", response_model=Profile)
async def create_profile(profile_data: ProfileCreate, current_user: User = Depends(get_current_user)):
    # Check if user already has a profile
    existing_profile = await db.profiles.find_one({"user_id": current_user.id})
    if existing_profile:
        raise HTTPException(status_code=400, detail="Profile already exists")
    
    profile = Profile(
        user_id=current_user.id,
        email=current_user.email,
        **profile_data.dict()
    )
    profile_dict = prepare_for_mongo(profile.dict())
    await db.profiles.insert_one(profile_dict)
    return profile

@api_router.get("/profile", response_model=Profile)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": current_user.id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return Profile(**profile)

@api_router.put("/profile", response_model=Profile)
async def update_profile(profile_data: ProfileCreate, current_user: User = Depends(get_current_user)):
    existing_profile = await db.profiles.find_one({"user_id": current_user.id})
    if not existing_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    update_data = prepare_for_mongo(profile_data.dict())
    await db.profiles.update_one(
        {"user_id": current_user.id},
        {"$set": update_data}
    )
    
    updated_profile = await db.profiles.find_one({"user_id": current_user.id})
    return Profile(**updated_profile)

# Category Routes
@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find().to_list(length=None)
    return [Category(**category) for category in categories]

@api_router.post("/categories", response_model=Category)
async def create_category(name: str, category_type: CategoryType, current_user: User = Depends(get_current_user)):
    category = Category(name=name, type=category_type, is_custom=True)
    category_dict = prepare_for_mongo(category.dict())
    await db.categories.insert_one(category_dict)
    return category

# Transaction Routes
@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction_data: TransactionCreate, current_user: User = Depends(get_current_user)):
    # Get user's profile
    profile = await db.profiles.find_one({"user_id": current_user.id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Please create a profile first.")
    
    transaction = Transaction(
        profile_id=profile["id"],
        user_id=current_user.id,
        **transaction_data.dict()
    )
    transaction_dict = prepare_for_mongo(transaction.dict())
    await db.transactions.insert_one(transaction_dict)
    return transaction

@api_router.get("/transactions", response_model=List[Transaction])
async def get_my_transactions(current_user: User = Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": current_user.id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    transactions = await db.transactions.find({"profile_id": profile["id"]}).to_list(length=None)
    return [Transaction(**transaction) for transaction in transactions]

# Dashboard Routes
@api_router.get("/dashboard")
async def get_dashboard_summary(current_user: User = Depends(get_current_user), month: Optional[str] = None):
    profile = await db.profiles.find_one({"user_id": current_user.id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    if not month:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    # Get transactions for the month
    transactions = await db.transactions.find({"profile_id": profile["id"]}).to_list(length=None)
    
    # Filter transactions for the current month
    month_transactions = [t for t in transactions if t["date"].startswith(month)]
    
    total_income = sum(t["amount"] for t in month_transactions if t["transaction_type"] == TransactionType.INCOME)
    total_expenses = sum(t["amount"] for t in month_transactions if t["transaction_type"] == TransactionType.EXPENSE)
    
    # Calculate CFR analysis based on income percentages
    monthly_income = profile.get("monthly_income", total_income)
    cfr_budgets = {
        CategoryType.NEEDS: monthly_income * 0.5,    # 50%
        CategoryType.WANTS: monthly_income * 0.3,    # 30%
        CategoryType.SAVINGS: monthly_income * 0.2   # 20%
    }
    
    # Get categories
    categories = await db.categories.find().to_list(length=None)
    category_map = {cat["id"]: cat for cat in categories}
    
    # Calculate actual spending by category type
    actual_spending = {CategoryType.NEEDS: 0, CategoryType.WANTS: 0, CategoryType.SAVINGS: 0}
    category_wise_spending = {}
    
    for transaction in month_transactions:
        if transaction["transaction_type"] == TransactionType.EXPENSE:
            category = category_map.get(transaction["category_id"])
            if category:
                category_type = CategoryType(category["type"])
                actual_spending[category_type] += transaction["amount"]
                
                # Category-wise spending
                cat_name = category["name"]
                if cat_name not in category_wise_spending:
                    category_wise_spending[cat_name] = 0
                category_wise_spending[cat_name] += transaction["amount"]
    
    # Calculate CFR analysis
    cfr_analysis = []
    for category_type, budgeted in cfr_budgets.items():
        actual = actual_spending[category_type]
        
        if budgeted > 0:
            deviation_percentage = ((actual - budgeted) / budgeted) * 100
        else:
            deviation_percentage = 0
        
        if category_type == CategoryType.NEEDS:
            recommended_percentage = 50
        elif category_type == CategoryType.WANTS:
            recommended_percentage = 30
        else:
            recommended_percentage = 20
        
        if abs(deviation_percentage) <= 5:
            status = "within_tolerance"
        elif deviation_percentage > 0:
            status = "overshoot"
        else:
            status = "undershoot"
        
        cfr_analysis.append(CFRAnalysis(
            category_type=category_type,
            budgeted_amount=budgeted,
            actual_amount=actual,
            deviation_percentage=deviation_percentage,
            status=status,
            recommended_percentage=recommended_percentage
        ))
    
    return {
        "profile": profile,
        "month": month,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "balance": total_income - total_expenses,
        "cfr_analysis": cfr_analysis,
        "category_wise_spending": category_wise_spending,
        "monthly_income": monthly_income
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await initialize_categories()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()