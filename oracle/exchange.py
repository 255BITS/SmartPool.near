from decimal import Decimal, ROUND_DOWN
#TODO placeholder
USD_CONVERSION_RATE = 5

def swap_near_to_usdc(near_amount):
    return near_amount * USD_CONVERSION_RATE / 1e24, 0

def swap_usdc_to_near(usdc_amount):
    # Convert usdc_amount to Decimal to ensure precise arithmetic
    usdc_amount_decimal = Decimal(usdc_amount)
    near_amount = (usdc_amount_decimal / Decimal(USD_CONVERSION_RATE)) * Decimal("1e24")
    near_amount_truncated = near_amount.quantize(Decimal("1"), rounding=ROUND_DOWN)

    return near_amount_truncated, 0

def calculate_usdc_total_from_holdings(holdings):
    print("Holdings")
    return 0

def rebalance_portfolio(holdings, percentage_pool, portfolio_total):
    print("Would rebalance")
    return 0.5
