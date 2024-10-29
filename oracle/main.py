import requests
import os
import time
from core_functions import handle_buy, handle_sell, handle_deposit, handle_withdraw

AILP_URL = os.getenv('AILPURL', 'http://localhost:3000')
JOBS_ENDPOINT = f"{AILP_URL}/api/jobs"

def fetch_jobs():
    """Fetches pending jobs from the /api/jobs endpoint."""
    response = requests.get(JOBS_ENDPOINT)
    if response.status_code != 200:
        print("Failed to fetch jobs")
        return []
    jobs = response.json()
    return jobs

def update_job_status(job_id, status, details=None):
    """Updates the job status via the /api/jobs endpoint."""
    payload = {
        "jobId": job_id,
        "status": status,
        "details": details,
    }
    response = requests.post(JOBS_ENDPOINT, json=payload)
    if response.status_code != 200:
        print(f"Failed to update job status for job {job_id}")
    else:
        print(f"Job {job_id} status updated to {status}")

def process_job(job):
    job_id = job['id']
    action = job['action']
    details = job['details']

    try:
        if action == 'BUY':
            tokens_bought, fees = handle_buy(user_id, float(amount))
            details = {
                "action": "BUY",
                "tokens_bought": tokens_bought,
                "fees": fees,
            }
            print(f"BUY processed: {tokens_bought} tokens bought with {fees} fees")
        elif action == 'SELL':
            usdc_received, fees = handle_sell(user_id, float(amount))
            details = {
                "action": "SELL",
                "usdc_received": usdc_received,
                "fees": fees,
            }
            print(f"SELL processed: {usdc_received} USDC received with {fees} fees")
        elif action == 'fulfillDeposit':
            #net_deposit, fees = fulfill_deposit(details)
            #details = {
            #    "action": "DEPOSIT",
            #    "net_deposit": net_deposit,
            #    "fees": fees,
            #}
            #print(f"Deposit processed: {net_deposit} USDC deposited with {fees} fees")
            #
            print(f"Deposit processed: {id} {details}")
        elif action == 'WITHDRAW':
            net_withdraw, fees = handle_withdraw(user_id, float(percentage), receiptuuid)
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

def run_job_processor():
    """Runs the job processor, polling for jobs every 10 seconds."""
    while True:
        jobs = fetch_jobs()
        for job in jobs:
            process_job(job)
        time.sleep(10)  # Poll every 10 seconds

if __name__ == "__main__":
    run_job_processor()

