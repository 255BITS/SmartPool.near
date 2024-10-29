import requests

class PoolApiClient:
    def __init__(self, base_url):
        self.base_url = base_url

    def fetch_jobs(self):
        """Fetches pending jobs from the /api/jobs endpoint."""
        try:
            response = requests.get(f"{self.base_url}/api/jobs")
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Error fetching jobs: {e}")
            return []

    def update_job_status(self, job_id, status, details=None):
        """Updates the job status via the /api/jobs endpoint."""
        payload = {
            "jobId": job_id,
            "status": status,
            "details": details,
        }
        try:
            response = requests.post(f"{self.base_url}/api/jobs", json=payload)
            response.raise_for_status()
            print(f"Job {job_id} status updated to {status}")
        except requests.RequestException as e:
            print(f"Failed to update job status for job {job_id}: {e}")

    def record_action(self, action_type, origin, from_asset, to_asset, amount, result_amount, fees):
        """Records a swap or action with pool holdings."""
        payload = {
            "action_type": action_type,
            "origin": origin,
            "from_asset": from_asset,
            "to_asset": to_asset,
            "amount": amount,
            "result_amount": result_amount,
            "fees": fees,
        }
        try:
            response = requests.post(f"{self.base_url}/api/actions", json=payload)
            response.raise_for_status()
            print(f"Action recorded: {action_type} from {from_asset} to {to_asset}")
        except requests.RequestException as e:
            print(f"Failed to record action {action_type}: {e}")

    def add_pool_holdings(self, asset, amount):
        """Updates the pool holdings for a specified asset."""
        payload = {
            "asset": asset,
            "amount": amount,
        }
        try:
            response = requests.post(f"{self.base_url}/api/pool/holdings", json=payload)
            response.raise_for_status()
            print(f"Pool holdings updated: {amount} of {asset}")
        except requests.RequestException as e:
            print(f"Failed to update pool holdings for {asset}: {e}")
