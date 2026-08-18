#!/bin/bash
export PATH="$HOME/program/node/bin:$PATH"
cd "$(dirname "$0")/frontend"
exec npm run dev
