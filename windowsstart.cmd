@echo off
cd /d "%~dp0"

if exist .git (
    rem Use git pull or git fetch when needed
    rem git fetch --all && git reset --hard origin/main
    git pull
) else (
    echo No .git folder found, skipping git pull
)

if exist package.json call npm install

node --env-file=.env start.js
pause