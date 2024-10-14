# get_user_balance.py
import requests
import os

AILP_URL = os.getenv('AILPURL', 'http://localhost')

def get_user_balance(user_id):
    """Fetches the user balance from an external API."""
    response = requests.get(f'{AILP_URL}/get-balance/{user_id}')
    if response.status_code != 200:
        raise ValueError(f"Failed to fetch balance for user {user_id}")
    return response.json()

def update_user_balance(user_id, usdc=None, near=None, tokens=None):
    """Updates the user balance via an external API."""
    payload = {
        "user_id": user_id,
        "usdc": usdc,
        "near": near,
        "tokens": tokens
    }
    response = requests.post(f'{AILP_URL}/update-balance', json=payload)
    if response.status_code != 200:
        raise ValueError(f"Failed to update balance for user {user_id}")

def create_transaction(user_id, type, amount, fees, details=None):
    """Creates a transaction record via an external API."""
    payload = {
        "user_id": user_id,
        "type": type,
        "amount": amount,
        "fees": fees,
        "details": details
    }
    response = requests.post(f'{AILP_URL}/create-transaction', json=payload)
    if response.status_code != 200:
        raise ValueError(f"Failed to create transaction for user {user_id}")

