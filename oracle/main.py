import asyncio
import traceback
import os
from core_functions import handle_buy, handle_sell, fulfill_deposit, ft_balance, fulfill_withdraw, ft_total_supply
from exchange import swap_near_to_usdc, calculate_usdc_total_from_holdings, rebalance_portfolio, swap_usdc_to_near, decimal_to_str
from pool_api_client import PoolApiClient
from decimal import Decimal, ROUND_DOWN

# Set up PoolApiClient with the AILP URL
AILP_URL = os.getenv('AILPURL', 'http://localhost:3000')
pool_api = PoolApiClient(AILP_URL)

def fetch_jobs():
    """Fetches pending jobs from the Pool API."""
    return pool_api.fetch_jobs()

def update_job_status(job_id, status, details=None):
    """Updates the job status via the Pool API."""
    pool_api.update_job_status(job_id, status, details)

def runAI(pool):
    # TODO needs current prices
    print("--", pool)
    holdings = pool["holdings"]
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
            current_usdc_holdings = calculate_usdc_total_from_holdings(pool["holdings"])
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
            tokens = details['iou']['amount']
            total_tokens = await ft_balance(pool_name, account_id)
            pool = pool_api.get_pool(pool_name)
            portfolio_total = calculate_usdc_total_from_holdings(pool["holdings"])
            print("-- found", tokens, total_tokens)
            percentage_pool = Decimal(tokens)/Decimal(total_tokens)
            usdc_received = rebalance_portfolio(pool["holdings"], percentage_pool, portfolio_total)
            pool_api.record_action(
                pool_name,
                "REBALANCE",
                "Platform",
                details={
                    "result_amount": usdc_received,
                    "fees": 0
                }
            )

            print("Received", usdc_received)
            near_received, fees = swap_usdc_to_near(usdc_received)

            pool_api.record_action(
                pool_name,
                "SWAP",
                "Platform",
                details={
                    "from_asset": "USDC",
                    "to_asset": "NEAR",
                    "amount": usdc_received,
                    "result_amount": str(near_received),
                    "fees": fees
                }
            )
            print("Sending", near_received, type(near_received));

            near_received_minus_fee = near_received*Decimal("0.95")
            near_received_minus_fee_quantized = near_received_minus_fee.quantize(Decimal("1"), rounding=ROUND_DOWN)
            await fulfill_withdraw(near_received_minus_fee_quantized, details, pool_name, owner_account_id, private_key)
            pool_api.record_action(
                pool_name,
                "WITHDRAW",
                account_id,
                details={
                    "from_asset": "USDC",
                    "to_asset": "NEAR",
                    "amount": usdc_received,
                    "result_amount": str(near_received_minus_fee_quantized),
                    "fees": fees
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
