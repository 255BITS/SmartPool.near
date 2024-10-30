import asyncio
import os
from core_functions import handle_buy, handle_sell, fulfill_deposit, ft_balance, fulfill_withdraw
from exchange import swap_near_to_usdc, calculate_usdc_total_from_holdings, rebalance_portfolio, swap_usdc_to_near
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
        
        elif action == 'fulfillDeposit':
            near_amount = details['iou']['amount']
            usdc_received, fees = swap_near_to_usdc(near_amount)
            pool_api.record_action(
                pool_name,
                "SWAP",
                "Platform",
                details={
                    "from_asset": "NEAR",
                    "to_asset": "USDC",
                    "amount": near_amount,
                    "result_amount": usdc_received,
                    "fees": fees
                }
            )
            pool_api.add_pool_holdings(pool_name, "USDC", usdc_received)
            # todo: get token count in pool and award based on new capital
            # todo: do we ignore the NEAR total here?
            tokens = 1000
            await fulfill_deposit(tokens, details, pool_name, owner_account_id, private_key)
            print(f"Deposit processed: {job_id} {details}")
        
        elif action == 'fulfillWithdraw':
            tokens = details['iou']['amount']
            pool = pool_api.get_pool(pool_name)
            total_tokens = await ft_balance(pool_name, details["iou"]["account_id"])
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
            print(f"Withdraw processed: {job_id} {details}")
        
        else:
            details = {"error": f"Unknown action: {action}"}
            print(f"Unknown action: {action}")

        # Update job status to 'complete' with details
        update_job_status(job_id, 'complete', details)
    
    except Exception as e:
        error_details = {"error": str(e)}
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
