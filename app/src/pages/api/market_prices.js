import Decimal from "decimal.js";
import { fetchAndParseEvents, formatPrices } from '@/services/polyService';

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

