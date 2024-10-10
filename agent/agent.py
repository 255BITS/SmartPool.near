import json
import urllib.parse
import urllib.request
import urllib.error
from datetime import datetime, timezone

def fetch_and_parse_events(slug=None):
    """
    Fetches data from the Polymarket API and parses out specific information:
    - volume
    - question
    - notes
    - startDate
    - endDate
    - markets (questions, ids, descriptions, conditionIds, clobTokenIds)

    Returns:
        A list of dictionaries containing the parsed data.
    """
    url = 'https://gamma-api.polymarket.com/events?active=true&closed=false&archived=false'
    if slug is not None:
        url += "&slug="+slug
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
                    'slug': event.get('slug'),
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
                        'negativeMarketId': market.get('negRiskMarketID'),
                        'clobTokenId': json.loads(market.get('clobTokenIds', [None]))[0]  # Assume first token ID is relevant
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

def fetch_order_book(token_id, top_n=3):
    """
    Fetches the order book data for a specific token from Polymarket API.

    Args:
        token_id: The ID of the token to fetch order book data for.
        top_n: The number of top bids and asks to return.

    Returns:
        A dictionary containing the top bids and asks of the order book.
    """
    url = f'https://clob.polymarket.com/book?token_id={token_id}'
    headers = {'User-Agent': 'Mozilla/5.0'}
    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request) as response:
            data = response.read().decode()
            order_book_data = json.loads(data)

            # Get the top N bids and asks
            top_bids = sorted(order_book_data.get('bids', []), key=lambda x: float(x['price']), reverse=True)[:top_n]
            top_asks = sorted(order_book_data.get('asks', []), key=lambda x: float(x['price']))[:top_n]

            order_book = {
                'bids': top_bids,
                'asks': top_asks
            }

            return order_book
    except Exception as e:
        print(f"Error fetching order book data from {url}: {e}")
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
        # Calculate hours since startDate and remaining hours until endDate
        try:
            start_dt = datetime.fromisoformat(event['startDate'].replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(event['endDate'].replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)

            hours_since_start = int((now - start_dt).total_seconds() / 3600)
            hours_until_end = int((end_dt - now).total_seconds() / 3600)
        except Exception as e:
            print(f"Error parsing dates: {e}")
            hours_since_start = 'N/A'
            hours_until_end = 'N/A'

        event_info = (
            f"Event Question: {event['question']}\n"
            f"Volume: {event['volume']}\n"
            f"Notes: {event['notes']}\n"
            f"Hours Since Start: {hours_since_start} hours\n"
            f"Hours Until End: {hours_until_end} hours\n"
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

def test_polymarket():
    # Fetch the parsed data object
    data = fetch_and_parse_events()
    # Format the data as a readable string using the helper method
    if data:
        formatted_data = format_events([data[0]])
        print(formatted_data)

        # Fetching market data for the first market in the first event (if available)
        if data[0]['markets']:
            first_market = data[0]['markets'][0]
            first_market_id = first_market['conditionId']
            clob_token_id = first_market['clobTokenId']

            market_data = fetch_market_data(first_market_id)
            if market_data:
                print("Market Data for First Market ID:")
                print(json.dumps(market_data, indent=4))
            else:
                print(f"Market with ID {first_market_id} not found.")

            # Fetching order book data for the first token in the first market (if available)
            if clob_token_id:
                order_book_data = fetch_order_book(clob_token_id)
                if order_book_data:
                    print("Order Book Data for First Market Token ID:")
                    print(json.dumps(order_book_data, indent=4))
                else:
                    print(f"Order book with Token ID {clob_token_id} not found.")
    else:
        print("No market data available.")


def main():
    inp = env.list_messages()[-1]["content"]
    slug = inp
    if "https:" in inp:
        # Parse the URL to extract the slug
        parsed_url = urllib.parse.urlparse(inp)
        slug = parsed_url.path.split('/')[-1]

    # Fetch the parsed data object
    data = fetch_and_parse_events(slug)
    if not data:
        print("No market data available.")
        return

    if isinstance(data, str):
        try:
            data = json_lib.loads(data)
        except:
            pass

    # Find and print the event matching the given slug
    matching_events = data
    if matching_events:
        formatted_data = format_events(matching_events)
        print(formatted_data)
    else:
        print(f"No event found with slug: {slug}")
    env.mark_done()

if __name__ == "__main__":
    main()
