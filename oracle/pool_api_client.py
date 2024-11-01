import requests
import re
from urllib.parse import urlparse, parse_qs

def parse_event_url(url):
    # Parse the URL
    parsed_url = urlparse(url)
    
    # Extract the event_name from the path (everything after '/event/')
    event_name = parsed_url.path.split('/event/')[-1]
    
    # Extract the `tid` from query parameters
    query_params = parse_qs(parsed_url.query)
    tid = query_params.get('tid', [None])[0]
    
    return [event_name, tid]

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


    def record_action(self, pool_name, action, by, details=None):
        """Records an action with pool details."""
        payload = {
            "action": action,
            "by": by,
            "details": details or {},  # Use an empty JSON object if details is None
            "poolName": pool_name
        }
        try:
            response = requests.post(f"{self.base_url}/api/actions", json=payload)
            response.raise_for_status()
            print(f"Action recorded: {action} by {by}")
        except requests.RequestException as e:
            print(f"Failed to record action {action}: {e}")

    def get_pool(self, pool_name):
        try:
            response = requests.get(f"{self.base_url}/api/pool", params={"name": pool_name})
            return response.json()
        except requests.RequestException as e:
            print(f"Failed to retrieve pool '{pool_name}': {e}")

    def add_pool_holdings(self, pool_name, asset_name, amount, cost_basis="0"):
        """Updates pool holdings by adding to the specified asset amount."""
        payload = {
            "poolName": pool_name,
            "assetName": asset_name,
            "amount": amount,
            "costBasis": cost_basis
        }
        try:
            response = requests.post(f"{self.base_url}/api/add_pool_holdings", json=payload)
            response.raise_for_status()
            print(f"Holdings updated: {asset_name} increased by {amount} in {pool_name}")
        except requests.RequestException as e:
            print(f"Failed to update holdings for {asset_name}: {e}")

    def update_pool(self, pool_name, new_holdings):
        try:
            response = requests.post(
                f"{self.base_url}/api/pool",
                params={"name": pool_name},
                json={"holdings": new_holdings}
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Failed to update pool '{pool_name}': {e}")

    def get_market_prices(self, pool):
        """Fetches pending jobs from the /api/jobs endpoint."""
        try:
            event_name, tid = parse_event_url(pool["markets"][0])
            response = requests.get(f"{self.base_url}/api/market_prices?event_name={event_name}&tid={tid}")
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Error fetching jobs: {e}")
            return []

