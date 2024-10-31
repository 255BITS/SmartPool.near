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

def rebalance_portfolio(holdings, percentage_pool, portfolio_total, market_prices):
    """
    Rebalance the portfolio to ensure the USDC holdings equal the desired percentage of the total portfolio value.
    
    Parameters:
    - holdings: dict of asset holdings with amounts.
    - percentage_pool: desired percentage of the portfolio to be in USDC.
    - portfolio_total: total value of the portfolio in USDC.
    - market_prices: dict of market prices for each asset with 'bid' and 'ask' prices.
    
    Returns:
    - new_holdings: dict with updated asset amounts after rebalancing.
    - target_usdc: Decimal representing the target USDC amount.
    """
    # Calculate the target USDC amount based on the desired percentage of the portfolio total
    target_usdc = Decimal(percentage_pool) * Decimal(portfolio_total)
    
    # Get current USDC holdings amount, defaulting to 0 if not present
    current_usdc = Decimal(holdings.get("USDC", {}).get("amount", "0"))
    
    # If current USDC holdings meet or exceed the target, no rebalancing is needed
    if current_usdc >= target_usdc:
        return holdings, target_usdc  # Return the original holdings and target USDC amount
    
    # Calculate the USDC shortfall needed to reach the target
    usdc_shortfall = target_usdc - current_usdc
    
    # Create a copy of holdings to avoid modifying the original data
    new_holdings = holdings.copy()
    
    # Extract non-USDC assets and their amounts
    non_usdc_assets = {
        asset: Decimal(details.get("amount", "0"))
        for asset, details in holdings.items()
        if asset != "USDC" and asset != "NEAR"
    }
    
    # Calculate the total value of non-USDC assets in USDC terms
    total_non_usdc_value = Decimal(0)
    for asset, amount in non_usdc_assets.items():
        bid_price = Decimal(market_prices[asset]["bid"])
        total_non_usdc_value += amount * bid_price
    
    # Proportionally calculate the amount to sell from each non-USDC asset
    for asset, amount in non_usdc_assets.items():
        bid_price = Decimal(market_prices[asset]["bid"])
        
        # Determine the asset's value in USDC
        asset_value_in_usdc = amount * bid_price
        
        # Calculate the proportion of the total non-USDC value this asset represents
        asset_proportion = asset_value_in_usdc / total_non_usdc_value
        
        # Calculate the amount of USDC this asset needs to contribute to cover its share of the shortfall
        asset_usdc_contribution = usdc_shortfall * asset_proportion
        
        # Determine the amount of the asset to sell
        amount_to_sell = asset_usdc_contribution / bid_price
        
        # Update the asset's amount in new_holdings
        new_amount = amount - amount_to_sell
        new_holdings[asset]["amount"] = decimal_to_str(new_amount)
    
    # Update the USDC amount in new_holdings to reflect the addition from sold assets
    new_usdc_amount = current_usdc + usdc_shortfall
    new_holdings["USDC"] = {"amount": str(new_usdc_amount)}
    del new_holdings["NEAR"]
    
    # Return the rebalanced holdings and the target USDC amount
    print("Rebalanced Holdings:", new_holdings)
    return new_holdings, target_usdc

def decimal_to_str(tokens, exp="1"):
    quantized = str(tokens.quantize(Decimal(exp), rounding=ROUND_DOWN))
    return quantized
