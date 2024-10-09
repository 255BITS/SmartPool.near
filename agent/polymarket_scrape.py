import json
import urllib.request
import urllib.error

def fetch_and_parse_events():
    """
    Fetches data from the Polymarket API and parses out specific information:
    - volume
    - question
    - notes
    - startDate
    - endDate
    - markets (questions, ids, descriptions, conditionIds)

    Returns:
        A list of dictionaries containing the parsed data.
    """
    url = 'https://gamma-api.polymarket.com/events?active=true&closed=false&archived=false'
    headers = {'User-Agent': 'Mozilla/5.0'}
    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request) as response:
            data = response.read().decode()
            events = json.loads(data)

            parsed_events = []
            for event in events:
                event_info = {
                    'volume': event.get('volume'),
                    'question': event.get('title'),
                    'notes': event.get('description'),
                    'startDate': event.get('startDate'),
                    'endDate': event.get('endDate'),
                    'markets': []
                }

                for market in event.get('markets', []):
                    market_info = {
                        'question': market.get('question'),
                        'description': market.get('description'),
                        'conditionId': market.get('conditionId'),
                        'negativeMarketId': market.get('negRiskMarketID')
                    }
                    event_info['markets'].append(market_info)

                parsed_events.append(event_info)

            return parsed_events
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.reason} (URL: {url})")
        return []
    except Exception as e:
        print(f"Error fetching data from {url}: {e}")
        return []

def fetch_market_data(market_id):
    """
    Fetches detailed data for a specific market from Polymarket API.

    Args:
        market_id: The ID of the market to fetch data for.

    Returns:
        A dictionary containing key information about the market.
    """
    url = f'https://clob.polymarket.com/markets/{market_id}'
    headers = {'User-Agent': 'Mozilla/5.0'}
    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request) as response:
            data = response.read().decode()
            market_data = json.loads(data)

            important_data = {
                'question': market_data.get('question'),
                'description': market_data.get('description'),
                'end_date': market_data.get('end_date_iso'),
                'accepting_orders': market_data.get('accepting_orders'),
                'minimum_order_size': market_data.get('minimum_order_size'),
                'minimum_tick_size': market_data.get('minimum_tick_size'),
                'tokens': [{
                    'outcome': token.get('outcome'),
                    'price': token.get('price'),
                    'winner': token.get('winner')
                } for token in market_data.get('tokens', [])]
            }

            return important_data
    except Exception as e:
        print(f"Error fetching market data from {url}: {e}")
        return {}

def format_events(parsed_data):
    """
    Helper method to format the parsed data into a readable string.

    Args:
        parsed_data: The list of parsed event dictionaries.

    Returns:
        A formatted string containing the parsed data.
    """
    parsed_output = []
    for event in parsed_data:
        event_info = (
            f"Event Question: {event['question']}\n"
            f"Volume: {event['volume']}\n"
            f"Notes: {event['notes']}\n"
            f"Start Date: {event['startDate']}\n"
            f"End Date: {event['endDate']}\n"
            "Markets:\n"
        )

        markets_info = []
        for market in event['markets']:
            market_info = (
                f"  Market Question: {market['question']}\n"
                f"  Description: {market['description']}\n"
            )
            markets_info.append(market_info)

        event_info += "".join(markets_info) + "-" * 40 + "\n"
        parsed_output.append(event_info)

    return "".join(parsed_output)

# Example usage:
def main():
    # Fetch the parsed data object
    data = fetch_and_parse_events()

    # Format the data as a readable string using the helper method
    formatted_data = format_events([data[0]])
    print(formatted_data)

    # Fetching market data for the first market in the first event (if available)
    if data and data[0]['markets']:
        first_market_id = data[0]['markets'][0]['conditionId']
        market_data = fetch_market_data(first_market_id)
        if market_data:
            print("Market Data for First Market ID:")
            print(json.dumps(market_data, indent=4))
        else:
            print(f"Market with ID {first_market_id} not found.")
    else:
        print("No market data available.")

if __name__ == "__main__":
    main()
