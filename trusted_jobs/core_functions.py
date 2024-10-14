# core_functions.py
from get_user_balance import get_user_balance, update_user_balance, create_transaction

def handle_buy(user_id: int, amount: float):
    """Handles the BUY operation."""
    user_balance = get_user_balance(user_id)
    if user_balance['usdc'] < amount:
        raise ValueError("Insufficient USDC balance")

    fees = 0.01 * amount  # 1% fees
    tokens_bought = amount - fees

    # Update user balances via API
    new_usdc = user_balance['usdc'] - amount
    new_tokens = user_balance['tokens'] + tokens_bought
    update_user_balance(user_id, usdc=new_usdc, tokens=new_tokens)

    # Record transaction via API
    create_transaction(user_id, "BUY", tokens_bought, fees)

    return tokens_bought, fees

def handle_sell(user_id: int, amount: float):
    """Handles the SELL operation."""
    user_balance = get_user_balance(user_id)
    if user_balance['tokens'] < amount:
        raise ValueError("Insufficient token balance")

    fees = 0.01 * amount  # 1% fees
    usdc_received = amount - fees

    # Update user balances via API
    new_tokens = user_balance['tokens'] - amount
    new_usdc = user_balance['usdc'] + usdc_received
    update_user_balance(user_id, usdc=new_usdc, tokens=new_tokens)

    # Record transaction via API
    create_transaction(user_id, "SELL", usdc_received, fees)

    return usdc_received, fees

def handle_deposit(user_id: int, amount: float, receiptuuid: str):
    """Handles the DEPOSIT operation."""
    user_balance = get_user_balance(user_id)

    fees = 0.01 * amount  # 1% fees
    net_deposit = amount - fees

    # Update user balances via API
    new_usdc = user_balance['usdc'] + net_deposit
    update_user_balance(user_id, usdc=new_usdc)

    # Record transaction via API
    create_transaction(user_id, "DEPOSIT", net_deposit, fees, details={"receiptuuid": receiptuuid})

    return net_deposit, fees

def handle_withdraw(user_id: int, percentage: float, receiptuuid: str):
    """Handles the WITHDRAW operation."""
    user_balance = get_user_balance(user_id)

    withdraw_amount = (user_balance['usdc'] * percentage) / 100
    fees = 0.01 * withdraw_amount
    net_withdraw = withdraw_amount - fees

    # Update user balances via API
    new_usdc = user_balance['usdc'] - withdraw_amount
    update_user_balance(user_id, usdc=new_usdc)

    # Record transaction via API
    create_transaction(user_id, "WITHDRAW", net

