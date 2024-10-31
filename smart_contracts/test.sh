#!/bin/bash
(cd pool && cargo test --lib) && \
  (cd controller && cargo test --lib)
