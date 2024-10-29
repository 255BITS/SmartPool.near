import asyncio
import os
from core_functions import handle_buy, handle_sell, fulfill_deposit, handle_withdraw
from exchange import swap_near_to_usdc
from pool_api_client import PoolApiClient

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
            await fulfill_deposit(details, pool_name, owner_account_id, private_key)
            near_amount = details['iou']['amount']
            usdc_received, fees = swap_near_to_usdc(near_amount)
            pool_api.record_action("SWAP", "Platform", "NEAR", "USDC", near_amount, usdc_received, fees)
            pool_api.add_pool_holdings("USDC", usdc_received)
            print(f"Deposit processed: {job_id} {details}")
        
        elif action == 'WITHDRAW':
            net_withdraw, fees = handle_withdraw(details['user_id'], float(details['percentage']), details['receiptuuid'])
            details = {
                "action": "WITHDRAW",
                "net_withdraw": net_withdraw,
                "fees": fees,
            }
            print(f"Withdraw processed: {net_withdraw} USDC withdrawn with {fees} fees")
        
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
