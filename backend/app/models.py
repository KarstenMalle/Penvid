# File: backend/app/models.py

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum
from datetime import datetime

class Locale(str, Enum):
    EN = "en"
    DA = "da"


class Currency(str, Enum):
    USD = "USD"
    DKK = "DKK"
    EUR = "EUR"


class Country(str, Enum):
    US = "US"
    DK = "DK"


class UserProfile(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class UserPreferences(BaseModel):
    user_id: str
    locale: Locale = Locale.EN
    currency: Currency = Currency.DKK  # Default to DKK for Danish users
    country: Country = Country.DK      # Default to Denmark
    theme: str = "system"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CurrencyRate(BaseModel):
    base_currency: Currency
    target_currency: Currency
    rate: float
    last_updated: datetime


class LocaleInfo(BaseModel):
    code: str
    name: str
    native_name: str
    flag: str
    is_active: bool = True


class Translation(BaseModel):
    locale: str
    key: str
    value: str


class TranslationRequest(BaseModel):
    locale: Locale
    key: str
    default: Optional[str] = None


class TranslationResponse(BaseModel):
    locale: str
    key: str
    translation: str


class CurrencyConversionRequest(BaseModel):
    amount: float
    from_currency: Currency
    to_currency: Currency


class CurrencyConversionResponse(BaseModel):
    original_amount: float
    original_currency: str
    converted_amount: float
    converted_currency: str
    rate: float


class APIResponse(BaseModel):
    status: str = "success"
    data: Optional[Any] = None
    error: Optional[str] = None
    message: Optional[str] = None

class LoanType(str, Enum):
    MORTGAGE = "MORTGAGE"
    MORTGAGE_BOND = "MORTGAGE_BOND"
    HOME_LOAN = "HOME_LOAN"
    STUDENT = "STUDENT"
    AUTO = "AUTO"
    CREDIT_CARD = "CREDIT_CARD"
    PERSONAL = "PERSONAL"
    OTHER = "OTHER"

class Loan(BaseModel):
    loan_id: int
    name: str
    balance: float
    interest_rate: float
    term_years: float
    minimum_payment: float
    loan_type: Optional[LoanType] = LoanType.OTHER


class FinancialOverview(BaseModel):
    loans: List[Loan]
    surplus_balance: float


class AmortizationEntry(BaseModel):
    month: int
    payment_date: str
    payment: float
    principal_payment: float
    interest_payment: float
    extra_payment: float
    remaining_balance: float


class AmortizationRequest(BaseModel):
    principal: float
    annual_rate: float
    monthly_payment: float
    extra_payment: float = 0
    max_years: int = 30
    currency: Currency = Currency.USD


class AmortizationResponse(BaseModel):
    schedule: List[AmortizationEntry]
    total_interest_paid: float
    months_to_payoff: int