# SmartPool Prediction Market Assistant

SmartPool is an intelligent, autonomous pool of resources that allows for optimized deposits and withdrawals, with assets liquidated or invested on demand. Each pool operates under an intelligent agent, which continuously runs optimizations based on specific market dynamics—such as prediction markets in this example.

## Project Overview

The SmartPool framework is designed to manage pooled assets intelligently by:
- **Handling Deposits**: Assets are invested as they enter the pool, following the agent's strategies to maximize returns.
- **Processing Withdrawals**: Assets are liquidated upon withdrawal requests, ensuring efficient cash-out while balancing the pool’s positions.
- **Optimizing Investments**: Each pool’s underlying agent continuously evaluates the current market landscape, making buy/sell decisions, adjusting holdings, and optimizing the pool’s allocations to enhance performance.

In this example, the agent is configured to optimize holdings within a prediction market, where it uses probability-based decisions to invest in and divest from positions intelligently.

## Project Structure

### 1. **Agent**
- **Path**: `agent/`
- **Description**: This Python script serves as the pool’s main intelligent agent. It interfaces with the NEAR AI API and Polymarket API to retrieve prediction market data and decide the best course of action for each position.
- **Features**:
  - Makes strategic buy/sell recommendations based on live market data.
  - Outputs formatted responses to update the oracle on market analysis and recommended actions.
  - Can be used separately for one-off prediction market help

### 2. **Oracle**
- **Path**: `oracle/`
- **Description**: The oracle acts as the SmartPool’s job manager, continuously running to process deposits, withdrawals, and buy/sell jobs. It interacts with the Pool API, handling fund rebalancing and orchestrating transactions across various assets.
- **Capabilities**:
  - Connects with the NEAR AI prediction market assistant to optimize positions.
  - Balances portfolio holdings based on current market data, calculating returns and executing trades.
  - Supports USDC and NEAR transactions, along with the calculation of VPT (Value Per Token) for deposits and withdrawals.

### 3. **Next.js Web Application**
- **Path**: `app/`
- **URL**: [smartpool.255labs.xyz](https://smartpool.255labs.xyz)
- **Description**: The Next.js web application offers a frontend interface for users to interact with the SmartPool, displaying real-time insights on market trends, predictions, and job processing.

### 4. **Smart Contracts**
- **Path**: `smart_contracts/`
- **Description**: Rust-based NEAR smart contracts will facilitate the pool’s intelligent deposit and withdrawal processes. These contracts will autonomously manage the fund’s liquidity by executing delayed transactions based on the agent's market optimization.

## NEAR AI Agent

The NEAR AI agent is live and can be accessed at: [https://app.near.ai/agents/smartpool.near/prediction-market-assistant/0.1.0](https://app.near.ai/agents/smartpool.near/prediction-market-assistant/0.1.0).

The agent’s main functions are:
- **Monitoring Market Events**: Continuously tracks prediction market events and gathers data.
- **Optimizing Holdings**: Evaluates market conditions to make informed buy/sell decisions.
- **Reporting to Oracle**: Provides actionable insights in JSON format for the oracle to act upon.

## Deployment and Environment Variables

### Services

The job service, located in `app/src/services/jobService.js`, is responsible for creating, fetching, and updating jobs, allowing the oracle to monitor and act upon queued actions effectively.

## Running the Project

### Agent
This will give recommendations given a polymarket prediction market. See it live at: [https://app.near.ai/agents/smartpool.near/prediction-market-assistant/0.1.0](https://app.near.ai/agents/smartpool.near/prediction-market-assistant/0.1.0).

### Oracle

```bash
python3 oracle/main.py
```

#### Environment Variables

- `SMARTPOOL_URL`: URL for the Pool API Client.
- `NEAR_CONFIG`: Configuration for NEARAI authorization. See nearai for details.
- `NEARAI_CALLBACK_URL`: Callback URL for NEAR AI integration.

### Next.js Application
From the app/ directory, install dependencies and start the development server:

```bash
npm install
npm run dev
```

### Smart Contract

Build with cargo.
