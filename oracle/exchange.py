from decimal import Decimal, ROUND_DOWN
from py_near.account import Account
import time

#TODO placeholder
USD_CONVERSION_RATE = Decimal(5)

async def swap_near_to_usdc(near_amount, pool_name, owner_account_id, private_key, contract_id="smartpool.testnet", network="testnet"):
    # Simulate a transfer to the swap service
    node_url = f"https://rpc.{network}.near.org"
    
    # Load the owner's account with private key
    owner_account = Account(owner_account_id, private_key, rpc_addr=node_url)
    
    # Prepare the transaction parameters
    args = {
        "pool_id": pool_name,
        "amount": decimal_to_str(near_amount)
    }
    print("Calling transfer_from_pool", args)
    
    while(True):
        # Call the fulfill_deposit_iou function
        try:
            result = await owner_account.function_call(
                contract_id,
                "transfer_from_pool",
                args=args,
                gas=200_000_000_000_000,
            )
            print("Transaction successful:", result)
            break
        except Exception as e:
            print("Transaction failed:", e)
            time.sleep(2)

    return Decimal(near_amount) * USD_CONVERSION_RATE / Decimal(1e24), Decimal(0)

async def swap_usdc_to_near(usdc_amount, pool_name, owner_account_id, private_key, contract_id="smartpool.testnet", network="testnet"):
    # Convert usdc_amount to Decimal to ensure precise arithmetic
    usdc_amount_decimal = Decimal(usdc_amount)
    near_amount = (usdc_amount_decimal / Decimal(USD_CONVERSION_RATE)) * Decimal("1e24")
    near_amount_truncated = near_amount.quantize(Decimal("1"), rounding=ROUND_DOWN)

    # Simulate a transfer to the swap service
    node_url = f"https://rpc.{network}.near.org"
    
    # Load the owner's account with private key
    owner_account = Account(owner_account_id, private_key, rpc_addr=node_url)
    
    # Prepare the transaction parameters
    args = {
        "pool_id": pool_name,
        "amount": decimal_to_str(near_amount_truncated)
    }
    print("Calling transfer_to_pool", args)
    
    while(True):
        # Call the fulfill_deposit_iou function
        try:
            result = await owner_account.function_call(
                contract_id,
                "transfer_to_pool",
                args=args,
                gas=200_000_000_000_000,
            )
            print("Transaction successful:", result)
            break
        except Exception as e:
            print("Transaction failed:", e)
            time.sleep(2)


    return near_amount_truncated, Decimal(0)

def calculate_usdc_total_from_holdings(holdings, market_prices, side):
    # Initialize usdc with the amount from "USDC" key, if it exists
    usdc = holdings.get("USDC", {}).get("amount", "0")
    usdc = Decimal(usdc)

    # Iterate through holdings, adding to usdc when the key is not "USDC"
    for key, value in holdings.items():
        option = value.get("option", "YES")
        if key != "USDC" and key != "NEAR":
            bid = market_prices.get(key).get("bid")
            ask = market_prices.get(key).get("ask")
            if option == "NO":
                price = (Decimal(1) - Decimal(ask))
            else:
                price = Decimal(bid)
            usdc += Decimal(value.get("amount", "0"))*price

    print("Holdings:", holdings)
    return usdc

def rebalance_portfolio(holdings, percentage_pool, portfolio_total):
    print("Would rebalance")
    return Decimal(0.5)

def decimal_to_str(tokens, exp="1"):
    quantized = str(tokens.quantize(Decimal(exp), rounding=ROUND_DOWN))
    return quantized
