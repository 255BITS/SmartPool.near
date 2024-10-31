import urllib.parse
import urllib.request
import urllib.error
import urllib
from datetime import datetime, timezone
import re
import json
import random
from string import Template

MODEL = "llama-v3p1-70b-instruct"
CLOB_ENDPOINT = 'https://clob.polymarket.com'

def send_callback(pool_name, callback_url, predictions, prediction_market_url, recommended_action, choice):
    """
    Sends a POST request to the callback_url with the specified data.
    
    :param callback_url: The URL to send the callback POST request to.
    :param predictions: Dictionary containing prediction data.
    :param prediction_market_url: URL string to the prediction market.
    :param recommended_action: buy or sell
    :param choice: question and vote (yes or no)
    :return: Response data if successful, None otherwise.
    """
    if not callback_url:
        print("Callback URL not set.")
        return None

    # Prepare the payload
    payload = {
        "payload": {
            "predictions": predictions,
            "prediction_market_url": prediction_market_url,
        },
        "poolName": pool_name,
        "jobType": recommended_action,
    }

    # Encode the data to JSON format
    encoded_data = json.dumps(payload).encode('utf-8')
    headers = {
        "Content-Type": "application/json"
    }

    # Create and send the POST request
    request = urllib.request.Request(callback_url, data=encoded_data, headers=headers, method="POST")
    
    with urllib.request.urlopen(request) as response:
        response_data = response.read().decode('utf-8')
        print("Response:", response_data)
        return response_data

def render_template(context):
    """
    Load, render, and write the hardcoded template 'template.html' to 'index.html' with the given context.

    Args:
        context: A dictionary with variables to be used in the template.

    This method loads 'template.html', substitutes the context, and writes the rendered result to 'index.html'.
    """
    template_path = "template.html"  # Hardcoded template path

    try:
        with open(template_path, 'r', encoding='utf-8') as file:
            template = Template(file.read())
            rendered_content = template.safe_substitute(context)
            env.write_file('index.html', rendered_content)
        print("Rendered template from template.html to index.html successfully.")
    except FileNotFoundError:
        print("Template file template.html not found.")

model = "llama-v3p1-70b-instruct"

def format_markets(parsed_data):
    """
    Formats the markets into a numbered list of questions with event data.

    Args:
        parsed_data: The list of parsed event dictionaries.

    Returns:
        A formatted string containing enumerated market questions.
    """
    formatted = []
    for event in parsed_data:
        for idx, market in enumerate(event['markets'], 1):
            formatted.append(f"{idx}. {market['question']}")
    return "\n".join(formatted)


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
                        'closedTime': market.get('closedTime'),
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

def format_prices(parsed_data):
    """
    Helper method to format the parsed data into a readable string.

    Args:
        parsed_data: The list of parsed event dictionaries.

    Returns:
        A formatted string containing the parsed data.
        List of top 3 walls in [bid, ask] format
    """
    walls = []
    all_token_ids = []
    token_ids = []
    for event in parsed_data:
        for market in event["markets"]:
            all_token_ids += [[market["question"], market["clobTokenId"]]]
            if market["closedTime"] is None:
                token_ids += [market["clobTokenId"]]
    url = CLOB_ENDPOINT + '/books'
    headers = {'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}

    # Prepare the data payload
    params = [{'token_id': token_id} for token_id in token_ids]
    data = json.dumps(params).encode('utf-8')

    request = urllib.request.Request(url, data=data, headers=headers, method='POST')
    idx = 1

    with urllib.request.urlopen(request) as response:
        response_data = response.read().decode()
        order_books = json.loads(response_data)

        # Format the order_books data into a readable string
        formatted_output = []
        for question, token_id in all_token_ids:
            order_book = next((order for order in order_books if order.get("asset_id") == token_id), None)
            s = f"{idx}. {question}"
            idx+=1
            if order_book is None:
                formatted_output.append(f"{s} = Market closed")
                walls += []
                continue
            walls += [[order_book.get('bids', [])[-3:], order_book.get('asks', [])[-3:]]]
            s += f" = {float(walls[-1][0][-1].get('price'))*100.0}%-{float(walls[-1][1][-1].get('price'))*100.0}%"
            formatted_output.append(s)

        return "\n".join(formatted_output)

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
        current_day = datetime.now().strftime("%A, %B %d, %Y")

        event_info = (
            f"Event Question: {event['question']}\n"
            f"Volume: {event['volume']}\n"
            f"Notes: {event['notes']}\n"
            f"Current Day: {current_day}\n"
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
    current_day = datetime.now().strftime("%A, %B %d, %Y")
    print(market)

    return (
        f"Event Question: {event['question']}\n"
        f"Volume: {event['volume']}\n"
        f"Notes: {event['notes']}\n"
        f"Current Day: {current_day}\n"
        f"Hours Since Start: {hours_since_start} hours\n"
        f"Hours Until End: {hours_until_end} hours\n"
        f"Market Question: {market['question']}\n"
        f"Description: {market['description']}\n"
        f"Condition ID: {market['conditionId']}\n"
        "\nYou are trying to solve the probability of this happening. It can be 0% to 100% probability of 'Yes'. Output format is:\nReasoning: free form reason for probability\nProbability: Y%.\n"
    )

def main():
    inp = env.list_messages()[-1]["content"]
    if isinstance(inp, str):
        try:
            inp = json_lib.loads(inp)
        except:
            pass

    if not isinstance(inp, dict):
        inp = {"url": inp}

    if "https:" in inp["url"]:
        parsed_url = urllib.parse.urlparse(inp['url'])
        slug = parsed_url.path.split('/')[-1]

    data = fetch_and_parse_events(slug)
    if not data:
        print("No market data available.")
        return

    formatted_markets = format_markets(data)
    formatted_event = format_events(data)
    formatted_prices = format_prices(data)
    question_prompt = formatted_event + formatted_markets + "\n\nCurrent market predictions:\n"+formatted_prices+"\n\nPredictions:\n"
    sys_prompt = """You are predicting an event. You will return the probabilities of each option being true.

Prediction: is parsed and the format is "{index}. {question}: {reasoning} = {prediction}%"
You MUST follow this format for each entry! Example outputs
Predictions:
1. Question: This is where I reason = 100%
2. Question2: again, This is where I reason = 100%

Only write predictions, start with '1.'. Nothing else.

Example:
Event Question: Will the sun rise tomorrow?
Volume: 10.0
Notes: This is a market on if the sun will rise. It has every day so far.

1. Sun will rise tomorrow
2. Sun will not rise tomorrow

Current market predictions:
1. Sun will rise tomorrow = 98%-100%
2. Sun will not rise tomorrow = 0%-2%

Predictions:
1. Sun will rise tomorrow: Earth is spinning causing day cycles = 100.0%
2. Sun will not rise tomorrow: Earth will not stop spinning = 0.0%
"""

    print(sys_prompt)
    print(question_prompt)
    # Parse the predictions_llm_result to extract probabilities
    predictions = {}
    prompts = [{"role": "system", "content": sys_prompt}, {"role": "user", "content": question_prompt}]
    predictions_llm_result = env.completion(prompts, model=MODEL)

    lines = predictions_llm_result.splitlines()
    idx = 0
    for line in lines:
        if line.strip():
            idx += 1
            market = data[0]['markets'][idx - 1]
            match = re.match(r'(.*?):\s*(.*?)\s*=\s*([\d\.]+)%', line)

            if match:
                question = match.group(1).strip()
                reasoning = match.group(2).strip()
                probability = float(match.group(3))/100.0
                predictions[idx]=[question,reasoning,probability]
            else:
                print(f"Could not parse line: {line}")

    print("From prompts", prompts)
    print("____")
    print(predictions_llm_result)
    print("PREDICTIONS")
    print(predictions)
    environment_id = globals()['env'].env_vars.get("environmentId", globals()['env'].env_vars.get("environment_id", "")) # this should be set by the app runner
    agent_id = "smartpool.near/prediction-market-assistant/0.0.7"
    render_template({'sys_prompt': sys_prompt, 'prompt': question_prompt, 'predictions':json.dumps(predictions, indent=4),'environment_id':environment_id, 'agent_id':agent_id})

    send_callback(inp.get("pool_name", None), inp.get("callback_url", None), predictions, inp["url"], "buy", ["yes", predictions[1][0]])
    env.mark_done()

if __name__ == "__main__":
    print("calling main")
    main()
