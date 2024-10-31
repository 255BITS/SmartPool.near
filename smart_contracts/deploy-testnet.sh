#!/bin/bash
source .env && \
  cd controller && \
  cargo near deploy --no-locked --no-docker smartpool.testnet without-init-call network-config testnet sign-with-seed-phrase "$TESTNET_SEED_PHRASE" --seed-phrase-hd-path 'm/44'\''/397'\''/0'\''' send
