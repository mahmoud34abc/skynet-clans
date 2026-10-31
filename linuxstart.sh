#!/bin/bash
cd "$(dirname "$0")" || exit 1

if [ -d .git ]; then
    # Use git pull or git fetch when needed
    # git fetch --all && git reset --hard origin/main
    git pull
else
    echo "No .git folder found, skipping git pull"
fi

[ -f package.json ] && npm install

node --env-file=.env start.js