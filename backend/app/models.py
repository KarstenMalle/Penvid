from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum


class LoanType(str, Enum):
    MORTGAGE = "MORTGAGE"
    MORTGAGE_BOND = "MORTGAGE_BOND"
    HOME_LOAN = "HOME_LOAN"
    STUDENT = "STUDENT"
    AUTO = "AUTO"
    CREDIT_CARD = "CREDIT_CARD"
    PERSONAL = "PERSONAL"
    OTHER = "OTHER"


class Currency(str, Enum):
    USD = "USD"
    DKK = "DKK"
    # Add more currencies as needed


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


class InvestmentEntry(BaseModel):
    month: int
    date: str
    balance: float
    inflation_adjusted_balance: float
    risk_adjusted_balance: float


class InvestmentRequest(BaseModel):
    monthly_amount: float
    annual_return: float
    months: int
    inflation_rate: float = 0.025
    risk_factor: float = 0.2
    currency: Currency = Currency.USD


class InvestmentResponse(BaseModel):
    projection: List[InvestmentEntry]
    final_balance: float
    inflation_adjusted_final_balance: float
    risk_adjusted_balance: float


class FinancialStrategyRequest(BaseModel):
    loans: List[Loan]
    monthly_surplus: float
    annual_investment_return: float = 0.07
    inflation_rate: float = 0.025
    risk_factor: float = 0.2
    currency: Currency = Currency.USD


class RecommendationDetail(BaseModel):
    best_strategy: str
    reason: str
    interest_savings: float
    months_saved: int
    investment_value_after_loan_payoff: float
    investment_value_immediate_invest: float
    total_savings_advantage: float


class LoanDetails(BaseModel):
    name: str
    interest_rate: float
    payoff_months_with_extra: int
    payoff_months_minimum: int


class AmortizationComparison(BaseModel):
    baseline: Dict[str, Any]
    with_extra_payments: Dict[str, Any]


class InvestmentComparison(BaseModel):
    immediate_investment: Dict[str, Any]
    investment_after_payoff: Dict[str, Any]


class FinancialStrategyResponse(BaseModel):
    recommendation: RecommendationDetail
    loan_details: Optional[LoanDetails]
    amortization_comparison: Optional[AmortizationComparison]
    investment_comparison: Optional[InvestmentComparison]


class CurrencyConversionRequest(BaseModel):
    amount: float
    from_currency: Currency = Currency.USD
    to_currency: Currency = Currency.USD


class CurrencyConversionResponse(BaseModel):
    original_amount: float
    original_currency: str
    converted_amount: float
    converted_currency: str


class UserSettings(BaseModel):
    expected_inflation: float = 0.025
    expected_investment_return: float = 0.07
    risk_tolerance: float = 0.2