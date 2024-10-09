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

main()

