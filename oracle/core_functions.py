# core_functions.py
from py_near.account import Account
from exchange import decimal_to_str
import json
import time

def handle_buy(user_id: int, amount: float):
    """Handles the BUY operation."""
    #user_balance = get_user_balance(user_id)
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
    #user_balance = get_user_balance(user_id)
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

async def ft_balance(pool_name, account_id, contract_id="smartpool.testnet", network="testnet"):
    # Initialize NEAR RPC
    node_url = f"https://rpc.{network}.near.org"
    
    # Load the owner's account with private key
    owner_account = Account(rpc_addr=node_url)
    
    args = { "account_id": account_id }
    while(True):
        # Call the fulfill_deposit_iou function
        try:
            result = await owner_account.view_function(
                f"{pool_name}.{contract_id}",
                "ft_balance_of",
                args=args,
            )
            print("Transaction successful:", result.result)
            return result.result
        except Exception as e:
            print("Transaction failed, retrying:", e)
            time.sleep(2)
    return False

async def ft_total_supply(pool_name, contract_id="smartpool.testnet", network="testnet"):
    # Initialize NEAR RPC
    node_url = f"https://rpc.{network}.near.org"
    
    # Load the owner's account with private key
    owner_account = Account(rpc_addr=node_url)
    
    args = {}
    while(True):
        # Call the fulfill_deposit_iou function
        try:
            result = await owner_account.view_function(
                f"{pool_name}.{contract_id}",
                "ft_total_supply",
                args=args,
            )
            print("Transaction successful:", result.result)
            return result.result
        except Exception as e:
            print("Transaction failed, retrying:", e)
            time.sleep(2)
    return False

async def fulfill_deposit(amount, details, pool_name, owner_account_id, private_key, contract_id="smartpool.testnet", network="testnet"):
    # Initialize NEAR RPC
    node_url = f"https://rpc.{network}.near.org"
    
    # Load the owner's account with private key
    owner_account = Account(owner_account_id, private_key, rpc_addr=node_url)
    
    # Parse out the details
    iou_id = details.get("iou", {}).get("iou_id")
    
    # Prepare the transaction parameters
    args = {
        "iou_id": iou_id,
        "pool_id": pool_name,
        "amount": decimal_to_str(amount)  # Convert to string to match U128 type
    }
    
    while(True):
        # Call the fulfill_deposit_iou function
        try:
            result = await owner_account.function_call(
                contract_id,
                "fulfill_deposit_iou",
                args=args,
                gas=200_000_000_000_000,
            )
            print("Transaction successful:", result)
            return True
        except Exception as e:
            print("Transaction failed:", e)
            time.sleep(2)
    return False

async def fulfill_withdraw(amount, details, pool_name, owner_account_id, private_key, contract_id="smartpool.testnet", network="testnet"):
    # Initialize NEAR RPC
    node_url = f"https://rpc.{network}.near.org"
    
    # Load the owner's account with private key
    owner_account = Account(owner_account_id, private_key, rpc_addr=node_url)
    
    # Parse out the details
    iou_id = details.get("iou", {}).get("iou_id")
    
    # Prepare the transaction parameters
    args = {
        "iou_id": iou_id,
        "pool_id": pool_name,
        "amount": decimal_to_str(amount)
    }
    print("CAlling with", args, amount)
    
    # Call the fulfill_deposit_iou function
    while(True):
        try:
            result = await owner_account.function_call(
                contract_id,
                "fulfill_withdraw_iou",
                args=args,
                gas=200_000_000_000_000,
            )
            print("Transaction successful:", result)
            return True
        except Exception as e:
            print("Transaction failed:", e)
            time.sleep(2)
    return False
