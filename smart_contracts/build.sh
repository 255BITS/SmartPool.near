#!/bin/bash
set -e

# Build the pool contract
echo "Building pool contract..."
cargo build --release -p pool --target wasm32-unknown-unknown

wasm-opt -Oz target/wasm32-unknown-unknown/release/pool.wasm -o target/wasm32-unknown-unknown/release/pool_optimized.wasm

# Build the controller contract
echo "Building controller contract..."
cargo build --release -p controller --target wasm32-unknown-unknown
