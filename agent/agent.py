import urllib.request
import json as json_lib

model = "llama-v3p1-70b-instruct"

def status_update(json, role, content):
    pass

def main():
    inp = env.list_messages()[-1]["content"]
    if isinstance(inp, str):
        try:
            inp = json_lib.loads(inp)
        except:
            pass

    if not isinstance(inp, dict):
        inp = {'my_positions': [], "target_market": "https://polymarket.com/event/highest-grossing-movie-in-2024", "question": prompt}

    env.mark_done()



def calculate_expected_profit(open_bids, current_probabilities, estimated_future_probabilities):
    moves = []

    for bid in open_bids:
        market_id = bid["market_id"]
        future_probs = estimated_future_probabilities[market_id]
        current_probs = current_probabilities[market_id]

        for choice in bid["choices"]:
            option = choice["option"]
            quantity = choice["quantity"]
            average_cost = choice["average_cost_usd"]
            amount_staked = choice["amount_staked"]
            order_book = choice["order_book"]

            # Calculate potential value based on future probability
            future_prob = future_probs[option]
            current_prob = current_probs[option]

            # Expected profit if probabilities shift to estimated future value
            expected_value = future_prob * quantity * average_cost
            current_value = current_prob * quantity * average_cost
            profit = expected_value - current_value

            # Determine if we should buy or sell
            action = "Hold"
            if profit > 0:
                action = "Sell"
            elif profit < 0:
                action = "Buy"

            moves.append({
                "market_id": market_id,
                "option": option,
                "action": action,
                "expected_profit": profit,
            })

    return sorted(moves, key=lambda x: x["expected_profit"], reverse=True)

def get_best_moves(open_bids, current_probabilities, estimated_future_probabilities, N=5):
    best_moves = calculate_expected_profit(open_bids, current_probabilities, estimated_future_probabilities)
    return best_moves[:N]

def display_best_moves(best_moves):
    for move in best_moves:
        print(f"Market: {move['market_id']}, Option: {move['option']}, Action: {move['action']}, Expected Profit: {move['expected_profit']}")

def test_calculate_expected_profit():
    # Example data for your open bids, estimated future probabilities, and current probabilities
    open_bids = [
        {
            "market_id": "oscars_host_2024",
            "market_title": "Will Will Smith host the Oscars 2024?",
            "choices": [
                {
                    "option": "Yes",
                    "bid_type": "Yes",
                    "amount_staked": 100,
                    "average_cost_usd": 2.0,
                    "quantity": 10,
                    "order_book": {
                        "bids": [
                            {"price": 0.35, "size": 15},
                            {"price": 0.40, "size": 25},
                        ],
                        "asks": [
                            {"price": 2.50, "size": 10},
                            {"price": 2.55, "size": 20},
                        ],
                    },
                },
                {
                    "option": "No",
                    "bid_type": "No",
                    "amount_staked": 50,
                    "average_cost_usd": 1.7,
                    "quantity": 5,
                    "order_book": {
                        "bids": [
                            {"price": 0.70, "size": 10},
                            {"price": 0.65, "size": 30},
                        ],
                        "asks": [
                            {"price": 0.80, "size": 5},
                            {"price": 0.85, "size": 15},
                        ],
                    },
                },
            ],
        }
    ]

    estimated_future_probabilities = {
        "oscars_host_2024": {"Yes": 0.6, "No": 0.4}
    }

    current_probabilities = {
        "oscars_host_2024": {"Yes": 0.4, "No": 0.6}
    }

    # Get the best N moves
    best_moves = get_best_moves(open_bids, current_probabilities, estimated_future_probabilities)

    # Display the top N moves
    display_best_moves(best_moves)

# Run the test
test_calculate_expected_profit()

main()

