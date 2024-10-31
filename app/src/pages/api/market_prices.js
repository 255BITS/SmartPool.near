import Decimal from "decimal.js";

export default async function handler(req, res) {
  // Get event_name from query parameters
  const { event_name } = req.query;
  
  // Check if event_name is provided
  if (!event_name) {
    res.status(400).json({ error: 'event_name is required' });
    return;
  }
  
  // Fetch data and process it
  try {
    const parsedEvents = await fetchAndParseEvents(event_name);
    const formattedPrices = formatPrices(parsedEvents);
    res.status(200).json(formattedPrices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function fetchAndParseEvents(slug) {
  // Compose the URL
  let url = 'https://gamma-api.polymarket.com/events?active=true&closed=false&archived=false';
  if (slug) {
    // If slug is a URL, extract slug from the URL
    if (slug.startsWith('https://')) {
      const parsedUrl = new URL(slug);
      const paths = parsedUrl.pathname.split('/');
      slug = paths[paths.length - 1];
    }
    url += '&slug=' + slug;
  }

  // Fetch the data
  const headers = { 'User-Agent': 'Mozilla/5.0' };
  try {
    const response = await fetch(url, { headers });
    const events = await response.json();

    const parsedEvents = [];
    for (const event of events) {
      const eventInfo = {
        volume: event.volume,
        question: event.title,
        slug: event.slug,
        notes: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        markets: []
      };

      for (const market of event.markets || []) {
        const marketInfo = {
          question: market.question,
          description: market.description,
          conditionId: market.conditionId,
          negativeMarketId: market.negRiskMarketID,
          closedTime: market.closedTime,
          bestBid: market.bestBid,
          bestAsk: market.bestAsk,
          lastTradePrice: market.lastTradePrice
        };
        eventInfo.markets.push(marketInfo);
      }

      if (eventInfo.markets.length > 0) {
        parsedEvents.push(eventInfo);
      }
    }
    return parsedEvents;

  } catch (error) {
    console.error('Error fetching data:', error);
    return [];
  }
}

function formatPrices(parsedData) {
  const options = {}; // Output data in the format { key: { bid: bid, ask: ask } }

  for (const event of parsedData) {
    for (const market of event.markets) {
      const question = market.question;

      // Convert bestBid and bestAsk to percentages
      let bidPrice = market.bestBid !== null ? Decimal(market.bestBid).toFixed(3) : null;
      let askPrice = market.bestAsk !== null ? Decimal(market.bestAsk).toFixed(3) : null;

      options[question] = { bid: bidPrice, ask: askPrice };
    }
  }

  return options;
}
