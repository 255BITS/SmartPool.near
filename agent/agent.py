import json
import urllib.parse
import urllib.request
import urllib.error
from datetime import datetime, timezone

model = "llama-v3p1-70b-instruct"

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

def calculate_hours(start_date, end_date):
    """
    Helper method to calculate hours since the start date and hours until the end date.

    Args:
        start_date: The start date in ISO format.
        end_date: The end date in ISO format.

    Returns:
        A tuple containing hours since start and hours until end.
    """
    try:
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)

        hours_since_start = int((now - start_dt).total_seconds() / 3600)
        hours_until_end = int((end_dt - now).total_seconds() / 3600)
    except Exception as e:
        print(f"Error parsing dates: {e}")
        hours_since_start = 'N/A'
        hours_until_end = 'N/A'

    return hours_since_start, hours_until_end

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
        hours_since_start, hours_until_end = calculate_hours(event['startDate'], event['endDate'])

        event_info = (
            f"Event Question: {event['question']}\n"
            f"Volume: {event['volume']}\n"
            f"Notes: {event['notes']}\n"
            f"Hours Since Start: {hours_since_start} hours\n"
            f"Hours Until End: {hours_until_end} hours\n"
        )

        parsed_output.append(event_info)

    return "".join(parsed_output)

def format_market(event, market):
    """
    Formats a single market into a prompt string including event-level information.

    Args:
        event: A dictionary containing event information.
        market: A dictionary containing market information.

    Returns:
        A formatted string for the market, including event-level information.
    """
    hours_since_start, hours_until_end = calculate_hours(event['startDate'], event['endDate'])

    return (
        f"Event Question: {event['question']}\n"
        f"Volume: {event['volume']}\n"
        f"Notes: {event['notes']}\n"
        f"Hours Since Start: {hours_since_start} hours\n"
        f"Hours Until End: {hours_until_end} hours\n"
        f"Market Question: {market['question']}\n"
        f"Description: {market['description']}\n"
        f"Condition ID: {market['conditionId']}\n"
        "\nYou are trying to solve the probability of this happening. It can be 0% to 100% probability of 'Yes'. Output format is:\nReasoning: free form reason for probability\nProbability: Y%.\n"
    )

def test_polymarket():
    # Fetch the parsed data object
    data = fetch_and_parse_events()
    # Format the data as a readable string using the helper method
    if data:
        # Fetching market data for each market in the first event
        for market in data[0]['markets']:
            # Format the market data including event information
            market_string = format_market(data[0], market)
            # Call env.completion to generate a prompt for the market
            response = env.completion(model="gpt-3.5-turbo", prompt=market_string)
            print(response)
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
            data = json.loads(data)
        except:
            pass

    # Array to store market probabilities
    market_probabilities = []

    # Find and print the event matching the given slug
    matching_events = data
    if matching_events:
        # Generate completion for each market in the event
        for event in matching_events:
            for index, market in enumerate(event['markets']):
                print("________________________")
                market_string = format_market(event, market)
                print(market_string)
                prompts = [{"role": "system", "content": "You are a predictor."}, {"role": "user", "content": market_string}]
                response = env.completion(model, prompts)
                print("___")
                print(response)
                print("________________________")

                # Parse the response to extract the probability
                try:
                    probability_line = response.split('Probability:')[-1].strip()
                    try:
                        probability_value = float(probability_line.split(":")[-1].strip().replace('%', '')) / 100
                    except ValueError:
                        probability_value = -1
                    market_probabilities.append(probability_value)
                    event['markets'][index]['ai_probability'] = probability_value
                except Exception as e:
                    print(f"Error parsing probability from response: {e}")

        # Print the final market probabilities array
        print("\nMarket Probabilities:")
        print(json.dumps(market_probabilities, indent=2))
    else:
        print(f"No event found with slug: {slug}")
    env.mark_done()

if __name__ == "__main__":
    main()
