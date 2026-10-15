#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
yarn typecheck && yarn test && yarn build
node node_modules/@vornrun/connector-sdk/dist/cli.js check slack/dist/index.js --mock --receipt slack/verified.json
