import asyncio
import json
import traceback
import os
import urllib.request
import time

from core_functions import handle_buy, handle_sell, fulfill_deposit, ft_balance, fulfill_withdraw, ft_total_supply
from exchange import swap_near_to_usdc, calculate_usdc_total_from_holdings, rebalance_portfolio, swap_usdc_to_near, decimal_to_str
from pool_api_client import PoolApiClient
from decimal import Decimal, ROUND_DOWN

# Set up PoolApiClient with the AILP URL
AILP_URL = os.getenv('AILPURL', 'http://localhost:3000')
NEAR_CONFIG=os.getenv("NEAR_CONFIG", "")
NEARAI_CALLBACK_URL=os.getenv("NEARAI_CALLBACK_URL", "")
pool_api = PoolApiClient(AILP_URL)

def fetch_jobs():
    """Fetches pending jobs from the Pool API."""
    return pool_api.fetch_jobs()

def update_job_status(job_id, status, details=None):
    """Updates the job status via the Pool API."""
    pool_api.update_job_status(job_id, status, details)

# Function to recursively search for 'content' in nested JSON structure
def find_html_content(data):
    if isinstance(data, dict):
        # Check for the content in a dict format
        if "filename" in data and data["filename"] == "index.html":
            return data.get("content")
        for key, value in data.items():
            result = find_html_content(value)
            if result:
                return result
    elif isinstance(data, list):
        # Loop through list elements
        for item in data:
            result = find_html_content(item)
            if result:
                return result
    return None

def call_near_ai_api(prediction_market_url, usdc_available, holdings):
    url = "https://api.near.ai/v1/agent/runs"
    print("NEAR_C", NEAR_CONFIG)
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {NEAR_CONFIG}'
    }
    new_message = {
        "prediction_market_url": prediction_market_url,
        "usdc_available": usdc_available,
        "holdings": holdings
    }
    new_message = {
        "url": prediction_market_url,
        "callback_url": NEARAI_CALLBACK_URL,
        "holdings": holdings,
        "usdc_available": usdc_available
    }

    payload = json.dumps({
        "agent_id": "smartpool.near/prediction-market-assistant/0.0.14",
        "new_message": new_message,
        "max_iterations": 1
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload, headers=headers)
    try:
        print("Calling...")
        with urllib.request.urlopen(req) as response:
            result = response.read()
            print("RESULT")
            print(result)
            return result.decode("utf-8")
    except Exception as e:
        print(f"Error calling NEAR AI API: {e}")
        return None

def runAI(pool):
    # TODO needs current prices
    print("--", pool)
    holdings = pool["holdings"]
    response = call_near_ai_api("https://polymarket.com/event/when-will-gpt-5-be-announced?tid=1729566306341", 0, {})
    print("___", response)
    return {"operation": "BUY"}, "http://fake url"

async def process_job(job):
    job_id = job['id']
    action = job['action']
    details = job['details']
    pool_name = job['poolName']
    owner_account_id = "itchy-harmony.testnet"
    private_key = os.getenv("OWNER_PRIVATE_KEY", None)
    
    if private_key is None:
        print("MUST SET OWNER_PRIVATE_KEY!!")
        return
    
    print("--", job)

    try:
        if action == 'BUY':
            tokens_bought, fees = handle_buy(details['user_id'], float(details['amount']))
            details = {
                "action": "BUY",
                "tokens_bought": tokens_bought,
                "fees": fees,
            }
            print(f"BUY processed: {tokens_bought} tokens bought with {fees} fees")
        
        elif action == 'SELL':
            usdc_received, fees = handle_sell(details['user_id'], float(details['amount']))
            details = {
                "action": "SELL",
                "usdc_received": usdc_received,
                "fees": fees,
            }
            print(f"SELL processed: {usdc_received} USDC received with {fees} fees")

        elif action == 'runAI':
            pool = pool_api.get_pool(pool_name)
            ai_action, log_url = runAI(pool)
            pool_api.record_action(
                pool_name,
                "AI CALL",
                "Platform",
                details={
                    "log_url": log_url,
                    "ai_action": ai_action
                }
            )

            if ai_action["operation"] == "BUY":
                print("Should BUY here", ai_action)
                pool_api.record_action(
                    pool_name,
                    "BUY",
                    "NEAR AI",
                    details={
                        "ai_action": ai_action,
                    }
                )
            elif ai_action["operation"] == "SELL":
                print("Should SELL here", ai_action)
                pool_api.record_action(
                    pool_name,
                    "SELL",
                    "NEAR AI",
                    details={
                        "ai_action": ai_action,
                    }
                )

            print(f"NEAR AI run executed")

        elif action == 'fulfillDeposit':
            account_id = details["iou"]["account_id"]
            near_amount = Decimal(details['iou']['amount'])

            # Step 1: Calculate operational fee and net deposit amount
            operational_fee = near_amount * Decimal('0.01')  # 1% operational fee
            near_after_fee = near_amount - operational_fee
            usdc_received, fees = await swap_near_to_usdc(near_after_fee, pool_name, owner_account_id, private_key)

            # Step 2: Record the SWAP action in the pool’s history
            pool_api.record_action(
                pool_name,
                "SWAP",
                "Platform",
                details={
                    "from_asset": "NEAR",
                    "to_asset": "USDC",
                    "amount": decimal_to_str(near_after_fee),
                    "result_amount": decimal_to_str(usdc_received, "0.01"),
                    "fees": decimal_to_str(fees)
                }
            )

            # Step 3: Get current pool USDC holdings BEFORE adding new usdc_received
            pool = pool_api.get_pool(pool_name)
            market_prices = pool_api.get_market_prices(pool)
            current_usdc_holdings = calculate_usdc_total_from_holdings(pool["holdings"], market_prices, "ASK")
            pool_total_value_before = Decimal(current_usdc_holdings)

            # Step 4: Get current total token supply in standard units
            tokens_issued_yocto = await ft_total_supply(pool_name)
            tokens_issued = Decimal(tokens_issued_yocto)/Decimal(1e24)

            print("--", tokens_issued_yocto)
            # Step 5: Calculate Value per Token (VPT)
            if int(tokens_issued_yocto) == 0:
                # First deposit scenario: set initial VPT
                value_per_token = Decimal('1')  # Initial value per token in USDC
            else:
                value_per_token = pool_total_value_before / tokens_issued

            # Step 6: Calculate tokens to issue based on VPT
            tokens_to_issue = usdc_received / value_per_token

            # Convert tokens_to_issue to yocto units for NEP-141 compliance
            tokens_to_issue_yocto = tokens_to_issue * Decimal(1e24)
            print("!!", tokens_to_issue_yocto, usdc_received, value_per_token, pool_total_value_before, tokens_issued)

            # Step 7: Add net deposit amount to pool holdings
            pool_api.add_pool_holdings(pool_name, "USDC", decimal_to_str(usdc_received, "0.01"))

            # Step 8: Fulfill deposit with calculated tokens in yocto units
            await fulfill_deposit(tokens_to_issue_yocto, details, pool_name, owner_account_id, private_key)

            # Step 9: Record the DEPOSIT action in the pool’s history
            pool_api.record_action(
                pool_name,
                "DEPOSIT",
                account_id,
                details={
                    "from_asset": "NEAR",
                    "to_asset": "USDC",
                    "amount": decimal_to_str(usdc_received, "0.01"),
                    "result_tokens": decimal_to_str(tokens_to_issue),
                    "fees": decimal_to_str(operational_fee + fees)
                }
            )

            print(f"Deposit processed: {job_id} {details}")

        elif action == 'fulfillWithdraw':
            account_id = details["iou"]["account_id"]
            # Convert the token amount to Decimal
            tokens_yocto = Decimal(details['iou']['amount'])
            tokens = tokens_yocto / Decimal(1e24)  # Convert yocto tokens to standard units

            # Step 1: Get total token supply in standard units
            total_tokens_yocto = await ft_total_supply(pool_name)
            total_tokens = Decimal(total_tokens_yocto) / Decimal(1e24)

            # Step 2: Calculate the percentage of the pool the user owns
            percentage_pool = tokens / total_tokens

            # Step 3: Get the current pool holdings and total USDC value
            pool = pool_api.get_pool(pool_name)
            market_prices = pool_api.get_market_prices(pool)
            portfolio_total_usdc = calculate_usdc_total_from_holdings(pool["holdings"], market_prices, "bid")

            print("-- found tokens:", tokens, "total tokens:", total_tokens)
            print("-- percentage of pool to withdraw:", percentage_pool)

            # Step 4: Rebalance the portfolio to get the required USDC
            # (Assuming rebalance_portfolio returns the USDC amount equivalent to the percentage of the pool)
            usdc_received = rebalance_portfolio(pool["holdings"], percentage_pool, portfolio_total_usdc, market_prices)

            # Record the REBALANCE action
            pool_api.record_action(
                pool_name,
                "REBALANCE",
                "Platform",
                details={
                    "result_amount": decimal_to_str(usdc_received, "0.01"),
                    "fees": "0"
                }
            )

            print("USDC received after rebalancing:", usdc_received)

            # Step 5: Swap USDC to NEAR
            near_received, fees = await swap_usdc_to_near(usdc_received, pool_name, owner_account_id, private_key)

            # Record the SWAP action
            pool_api.record_action(
                pool_name,
                "SWAP",
                "Platform",
                details={
                    "from_asset": "USDC",
                    "to_asset": "NEAR",
                    "amount": decimal_to_str(usdc_received, "0.01"),
                    "result_amount": decimal_to_str(near_received),
                    "fees": decimal_to_str(fees)
                }
            )

            print("NEAR received from swap:", near_received)

            # Step 6: Deduct the 2% operational fee
            operational_fee = near_received * Decimal("0.02")
            near_received_minus_fee = near_received - operational_fee

            # Quantize the NEAR amount (round down to the nearest whole number if necessary)
            near_received_minus_fee_quantized = near_received_minus_fee.quantize(Decimal("1"), rounding=ROUND_DOWN)

            # Step 7: Fulfill the withdrawal by sending NEAR to the user
            await fulfill_withdraw(near_received_minus_fee_quantized, details, pool_name, owner_account_id, private_key)

            # Record the WITHDRAW action
            pool_api.record_action(
                pool_name,
                "WITHDRAW",
                account_id,
                details={
                    "from_asset": "USDC",
                    "to_asset": "NEAR",
                    "amount": decimal_to_str(usdc_received, "0.01"),
                    "result_amount": decimal_to_str(near_received_minus_fee_quantized),
                    "fees": decimal_to_str(operational_fee + fees)
                }
            )

            print(f"Withdraw processed: {job_id} {details}")
        else:
            details = {"error": f"Unknown action: {action}"}
            print(f"Unknown action: {action}")

        # Update job status to 'complete' with details
        update_job_status(job_id, 'complete', details)
    
    except Exception as e:
        error_details = {
            "error": str(e),
            "stack_trace": traceback.format_exc()
        }
        print(f"Failed to process job {job_id}: {error_details}")

        # Update job status to 'failed' with error details
        update_job_status(job_id, 'failed', error_details)

async def run_job_processor():
    """Runs the job processor, polling for jobs every 10 seconds."""
    while True:
        jobs = fetch_jobs()
        for job in jobs:
            await process_job(job)  # Sequentially process each job
        await asyncio.sleep(10)  # Poll every 10 seconds

if __name__ == "__main__":
    asyncio.run(run_job_processor())
