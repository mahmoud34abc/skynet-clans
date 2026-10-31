git init -b main
git remote add -t main origin https://github.com/mahmoud34abc/skynet-clans.git
git fetch origin main
git reset --hard origin/main
git branch --set-upstream-to=origin/main main