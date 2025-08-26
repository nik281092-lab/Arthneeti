from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

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
    SELF = "self"
    SPOUSE = "spouse"
    CHILD = "child"
    PARENT = "parent"
    SIBLING = "sibling"
    OTHER = "other"

# Models
class FamilyMember(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    relation: FamilyRelation

class Profile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    dob: str
    phone: str
    email: str
    country: str
    currency: str = "INR"
    is_family_mode: bool = False
    family_members: List[FamilyMember] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProfileCreate(BaseModel):
    name: str
    dob: str
    phone: str
    email: str
    country: str
    currency: str = "INR"
    is_family_mode: bool = False
    family_members: List[FamilyMember] = []

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: CategoryType
    is_custom: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    profile_id: str
    amount: float
    transaction_type: TransactionType
    category_id: str
    person_id: Optional[str] = None  # For family mode
    payment_source: str
    description: Optional[str] = None
    date: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransactionCreate(BaseModel):
    profile_id: str
    amount: float
    transaction_type: TransactionType
    category_id: str
    person_id: Optional[str] = None
    payment_source: str
    description: Optional[str] = None
    date: str

class Budget(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    profile_id: str
    category_type: CategoryType
    budgeted_amount: float
    month: str  # Format: YYYY-MM
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BudgetCreate(BaseModel):
    profile_id: str
    category_type: CategoryType
    budgeted_amount: float
    month: str

class CFRAnalysis(BaseModel):
    category_type: CategoryType
    budgeted_amount: float
    actual_amount: float
    deviation_percentage: float
    status: str  # "within_tolerance", "overshoot", "undershoot"
    tolerance_range: Dict[str, float]

# Helper function to prepare data for MongoDB
def prepare_for_mongo(data):
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
    return data

# Initialize default categories
DEFAULT_CATEGORIES = [
    # Needs (Yellow)
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
    
    # Wants (Light Red)
    {"name": "Entertainment", "type": CategoryType.WANTS},
    {"name": "Fashion and Clothing", "type": CategoryType.WANTS},
    {"name": "Food And Restaurant", "type": CategoryType.WANTS},
    {"name": "Gift", "type": CategoryType.WANTS},
    {"name": "Sports and Hobby", "type": CategoryType.WANTS},
    {"name": "Travel", "type": CategoryType.WANTS},
    {"name": "Home Requirements", "type": CategoryType.WANTS},
    
    # Investment/Savings (Green)
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

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Budget Tracker API"}

# Profile Routes
@api_router.post("/profile", response_model=Profile)
async def create_profile(profile_data: ProfileCreate):
    profile = Profile(**profile_data.dict())
    profile_dict = prepare_for_mongo(profile.dict())
    await db.profiles.insert_one(profile_dict)
    return profile

@api_router.get("/profile/{profile_id}", response_model=Profile)
async def get_profile(profile_id: str):
    profile = await db.profiles.find_one({"id": profile_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return Profile(**profile)

@api_router.get("/profiles", response_model=List[Profile])
async def get_profiles():
    profiles = await db.profiles.find().to_list(length=None)
    return [Profile(**profile) for profile in profiles]

# Category Routes
@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find().to_list(length=None)
    return [Category(**category) for category in categories]

@api_router.post("/categories", response_model=Category)
async def create_category(name: str, category_type: CategoryType):
    category = Category(name=name, type=category_type, is_custom=True)
    category_dict = prepare_for_mongo(category.dict())
    await db.categories.insert_one(category_dict)
    return category

# Transaction Routes
@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction_data: TransactionCreate):
    transaction = Transaction(**transaction_data.dict())
    transaction_dict = prepare_for_mongo(transaction.dict())
    await db.transactions.insert_one(transaction_dict)
    return transaction

@api_router.get("/transactions/{profile_id}", response_model=List[Transaction])
async def get_transactions(profile_id: str):
    transactions = await db.transactions.find({"profile_id": profile_id}).to_list(length=None)
    return [Transaction(**transaction) for transaction in transactions]

# Budget Routes
@api_router.post("/budget", response_model=Budget)
async def create_budget(budget_data: BudgetCreate):
    budget = Budget(**budget_data.dict())
    budget_dict = prepare_for_mongo(budget.dict())
    await db.budgets.insert_one(budget_dict)
    return budget

@api_router.get("/budget/{profile_id}/{month}", response_model=List[Budget])
async def get_budgets(profile_id: str, month: str):
    budgets = await db.budgets.find({"profile_id": profile_id, "month": month}).to_list(length=None)
    return [Budget(**budget) for budget in budgets]

# CFR Analysis
@api_router.get("/cfr-analysis/{profile_id}/{month}", response_model=List[CFRAnalysis])
async def get_cfr_analysis(profile_id: str, month: str):
    # Get budgets for the month
    budgets = await db.budgets.find({"profile_id": profile_id, "month": month}).to_list(length=None)
    
    # Get transactions for the month
    transactions = await db.transactions.find({"profile_id": profile_id}).to_list(length=None)
    
    # Get categories
    categories = await db.categories.find().to_list(length=None)
    category_map = {cat["id"]: cat for cat in categories}
    
    # Calculate actual spending by category type
    actual_spending = {CategoryType.NEEDS: 0, CategoryType.WANTS: 0, CategoryType.SAVINGS: 0}
    
    for transaction in transactions:
        if transaction["date"].startswith(month) and transaction["transaction_type"] == TransactionType.EXPENSE:
            category = category_map.get(transaction["category_id"])
            if category:
                actual_spending[CategoryType(category["type"])] += transaction["amount"]
    
    # Calculate CFR analysis
    cfr_results = []
    
    for budget in budgets:
        category_type = CategoryType(budget["category_type"])
        budgeted = budget["budgeted_amount"]
        actual = actual_spending.get(category_type, 0)
        
        if budgeted == 0:
            deviation_percentage = 0
        else:
            deviation_percentage = ((actual - budgeted) / budgeted) * 100
        
        # Apply CFR rules
        if category_type == CategoryType.NEEDS:
            # Needs: ±3% tolerance, no overshoot >3%
            tolerance_range = {"min": -3, "max": 3}
            if deviation_percentage > 3:
                status = "overshoot"
            elif -3 <= deviation_percentage <= 3:
                status = "within_tolerance"
            else:
                status = "undershoot"
        elif category_type == CategoryType.WANTS:
            # Wants: +2% allowed, unlimited undershoot
            tolerance_range = {"min": -999999, "max": 2}
            if deviation_percentage > 2:
                status = "overshoot"
            else:
                status = "within_tolerance"
        else:  # SAVINGS
            # Savings: ±3% allowed
            tolerance_range = {"min": -3, "max": 3}
            if deviation_percentage > 3:
                status = "overshoot"
            elif -3 <= deviation_percentage <= 3:
                status = "within_tolerance"
            else:
                status = "undershoot"
        
        cfr_results.append(CFRAnalysis(
            category_type=category_type,
            budgeted_amount=budgeted,
            actual_amount=actual,
            deviation_percentage=deviation_percentage,
            status=status,
            tolerance_range=tolerance_range
        ))
    
    return cfr_results

# Dashboard summary
@api_router.get("/dashboard/{profile_id}")
async def get_dashboard_summary(profile_id: str, month: Optional[str] = None):
    if not month:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    # Get transactions for the month
    transactions = await db.transactions.find({"profile_id": profile_id}).to_list(length=None)
    
    total_income = sum(t["amount"] for t in transactions 
                      if t["date"].startswith(month) and t["transaction_type"] == TransactionType.INCOME)
    total_expenses = sum(t["amount"] for t in transactions 
                        if t["date"].startswith(month) and t["transaction_type"] == TransactionType.EXPENSE)
    
    # Get CFR analysis
    cfr_analysis = await get_cfr_analysis(profile_id, month)
    
    return {
        "profile_id": profile_id,
        "month": month,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "balance": total_income - total_expenses,
        "cfr_analysis": cfr_analysis
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