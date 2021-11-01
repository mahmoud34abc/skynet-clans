Skynet Clans Handler
=================

This project is made for handling Skynet's games (and maybe any others) clans systems and saves their data,
and loads the data back when requested from the ROBLOX game servers.

For me it looked like making the clans system using Glitch would be better for saving, since DataStores could fail
and to allow Discord functionality.

The handler does not collect data for any reason, it only saves it to share it back to the server.
There is no intent and never will be, to collect any kind of data and use it for ourselves.

You can check the code out on [github](https://github.com/mahmoud34abc/skynet-clans) if you prefer instead from here.

How it works
----

- The player requests the game server to make a new clan.
- The game server requests the handler (this) to make the new clan, while sending info. <--- DOCUMENT IT MAH AFTER U FINSIH IT
- The handler responds with a success or a fail, and sends basic clan info with it. (clan logo, clan name, etc).
- If a player joins the clan, the game server requests the handler to process the request.
- The handler responds back with either a fail due to the player being already in a clan or owning one, or a success and updates the clan info.
- If a new player joins the server, the game server requests the handler with the user's ID to send back clan id + info of the player, if they are in any.
- The handler responds back with either telling the game server they are in a clan and sends its info, or it responds with no clan data.

Behind the scenes
----
- The saving is done with `conf` [npm module](https://www.npmjs.com/package/conf).
- The `express` [npm module](https://www.npmjs.com/package/express) is used to open [the site and the webhook](https:///skynet-clans.glitch.me) to allow requests from ROBLOX game servers
- The `body-parser` [npm module](https://www.npmjs.com/package/body-parser) is a helper module for express, which allows easy JS reading the game servers' requests, since it can't be done without the module
- The `discord.js` [npm module](https://www.npmjs.com/package/discord.js) is used to run the Discord bot.
- The `cache` [npm module](https://www.npmjs.com/package/cache) is used to cache roblox user IDs when needed (for Discord functionality)
- It saves atomically, which means if the process crashed or died, it won't lose data.