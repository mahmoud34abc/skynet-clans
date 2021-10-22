//start the bot and the webhook

var discord = require('./discord/discord.js'),
  website = require('./website/website.js');

discord()
website()