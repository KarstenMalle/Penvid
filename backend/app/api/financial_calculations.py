@router.post("/financial-calculations/risk-scenarios", response_model=Dict[str, Any])
@handle_exceptions
async def get_risk_scenarios(
        request: Dict[str, Any],
        authenticated_user_id: str = Depends(verify_token)
):
    """
    Calculate risk-adjusted scenarios (pessimistic, standard, optimistic) for a specific strategy
    """
    try:
        # Extract parameters
        user_id = request.get("user_id")
        loans = request.get("loans", [])
        monthly_budget = request.get("monthly_budget", 0)
        strategy_name = request.get("strategy_name", "")
        base_risk_factor = request.get("base_risk_factor", 0.7)  # Default 70%
        currency = request.get("currency", "USD")

        # Ensure user is accessing their own data
        if user_id != authenticated_user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Convert values to USD for calculation if needed
        if currency != "USD":
            monthly_budget = convert_currency(monthly_budget, currency, "USD")
            for loan in loans:
                loan["balance"] = convert_currency(loan["balance"], currency, "USD")
                loan["minimum_payment"] = convert_currency(loan["minimum_payment"], currency, "USD")

        # Define risk factors for different scenarios
        risk_factors = {
            "pessimistic": base_risk_factor * (5/7),  # ~50% risk factor for pessimistic
            "standard": base_risk_factor,             # Base risk factor for standard
            "optimistic": base_risk_factor * (9/7)    # ~90% risk factor for optimistic
        }

        # Calculate scenario results
        scenarios = {}
        comparison_data = []

        for scenario_name, risk_factor in risk_factors.items():
            # Get strategy result with this risk factor
            strategy_result = calculate_strategy_with_risk(
                loans=loans,
                monthly_budget=monthly_budget,
                strategy_name=strategy_name,
                risk_factor=risk_factor
            )

            # Extract year-by-year data
            yearly_data = strategy_result.get("yearly_data", [])

            # Get final values
            final_net_worth = strategy_result.get("final_net_worth", 0)
            final_investment_value = strategy_result.get("final_investment_value", 0)
            final_debt_value = strategy_result.get("final_debt_value", 0)

            # Add to scenarios
            scenarios[scenario_name] = {
                "name": scenario_name,
                "yearlyData": yearly_data,
                "finalNetWorth": final_net_worth,
                "finalInvestmentValue": final_investment_value,
                "finalDebtValue": final_debt_value,
                "riskAdjustmentFactor": risk_factor
            }

            # Add comparison data point
            comparison_data.append({
                "scenario": scenario_name,
                "finalNetWorth": final_net_worth,
                "finalInvestment": final_investment_value,
                "finalDebt": final_debt_value
            })

        # Prepare pre-formatted chart data
        chart_data = []
        all_years = set()

        # Collect all years from all scenarios
        for scenario_name, scenario in scenarios.items():
            for year_data in scenario["yearlyData"]:
                all_years.add(year_data["year"])

        # Create year-by-year comparison data
        for year in sorted(all_years):
            data_point = {"year": year}

            for scenario_name in scenarios.keys():
                # Find this year in the scenario data
                year_data = next((
                    data for data in scenarios[scenario_name]["yearlyData"]
                    if data["year"] == year
                ), None)

                if year_data:
                    # Add net worth for this scenario in this year
                    data_point[f"{scenario_name}_netWorth"] = year_data["netWorth"]
                    data_point[f"{scenario_name}_investments"] = year_data.get("investmentValue", 0)
                    data_point[f"{scenario_name}_debt"] = year_data.get("debtValue", 0)

            chart_data.append(data_point)

        # Convert monetary values back to user's currency if needed
        if currency != "USD":
            for scenario in scenarios.values():
                scenario["finalNetWorth"] = convert_currency(scenario["finalNetWorth"], "USD", currency)
                scenario["finalInvestmentValue"] = convert_currency(scenario["finalInvestmentValue"], "USD", currency)
                scenario["finalDebtValue"] = convert_currency(scenario["finalDebtValue"], "USD", currency)

                for data in scenario["yearlyData"]:
                    data["netWorth"] = convert_currency(data["netWorth"], "USD", currency)
                    data["investmentValue"] = convert_currency(data.get("investmentValue", 0), "USD", currency)
                    data["debtValue"] = convert_currency(data.get("debtValue", 0), "USD", currency)

            for data_point in chart_data:
                for key, value in data_point.items():
                    if key != "year" and isinstance(value, (int, float)):
                        data_point[key] = convert_currency(value, "USD", currency)

            for data_point in comparison_data:
                data_point["finalNetWorth"] = convert_currency(data_point["finalNetWorth"], "USD", currency)
                data_point["finalInvestment"] = convert_currency(data_point["finalInvestment"], "USD", currency)
                data_point["finalDebt"] = convert_currency(data_point["finalDebt"], "USD", currency)

        # Return the complete result
        result = {
            "strategyName": strategy_name,
            "scenarios": scenarios,
            "comparisonData": comparison_data,
            "chartData": chart_data
        }

        return standardize_response(data=result)

    except Exception as e:
        return standardize_response(
            error=f"Error calculating risk scenarios: {str(e)}"
        )

def calculate_strategy_with_risk(
        loans: List[Dict[str, Any]],
        monthly_budget: float,
        strategy_name: str,
        risk_factor: float
) -> Dict[str, Any]:
    """
    Calculate a specific strategy with a given risk factor
    
    This is a helper function that would call into your existing strategy calculation logic
    but with a modified risk factor. For example, it might call methods from WealthOptimizerService
    or similar calculation services.
    """
    # This would call into your existing strategy calculation code
    # For example:
    # return WealthOptimizerService.calculate_specific_strategy(
    #     loans=loans,
    #     monthly_budget=monthly_budget,
    #     strategy_name=strategy_name,
    #     risk_factor=risk_factor
    # )

    # For now, this is a simplified mock implementation
    # In a real implementation, this would use your actual calculation logic

    # Mock year-by-year data with risk-adjusted growth
    yearly_data = []
    current_investment = 0
    current_debt = sum(loan["balance"] for loan in loans)

    for year in range(31):  # 0 to 30 years
        # Simple model for demo purposes
        # In reality, this would use your actual calculation models

        # Grow investments based on risk factor (more risk = potentially higher return)
        investment_growth_factor = 1.07 * risk_factor  # 7% annual growth, adjusted by risk

        # Reduce debt based on budget
        debt_reduction = min(current_debt, monthly_budget * 12)
        current_debt = max(0, current_debt - debt_reduction)

        # If debt is paid off, invest the rest
        if current_debt == 0:
            current_investment = (current_investment * investment_growth_factor) + (monthly_budget * 12)
        else:
            # Still paying down debt, might invest a portion based on strategy
            invest_portion = 0
            if strategy_name == "Hybrid Approach":
                invest_portion = 0.5  # Invest 50% while paying debt
            elif strategy_name == "Minimum Payments + Invest":
                invest_portion = 0.8  # Invest 80% while paying debt

            current_investment = (current_investment * investment_growth_factor) + (monthly_budget * 12 * invest_portion)

        # Calculate net worth
        net_worth = current_investment - current_debt

        yearly_data.append({
            "year": year,
            "netWorth": net_worth,
            "investmentValue": current_investment,
            "debtValue": current_debt
        })

    # Return strategy results
    return {
        "yearly_data": yearly_data,
        "final_net_worth": yearly_data[-1]["netWorth"],
        "final_investment_value": yearly_data[-1]["investmentValue"],
        "final_debt_value": yearly_data[-1]["debtValue"]
    }