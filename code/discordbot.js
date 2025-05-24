//new discord bot stuff handler
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
//const fs = require('node:fs');
const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, MessageEmbed } = require('discord.js');

const isUpdatedDiscord = process.env.UPDATEDDISCORD == "TRUE";
const botPrefix = "c!"
var botOnline = false

var defaultFooter = "Skynet Clans • Version " + process.env.VERSION + " • Hosted on: " + process.env.HOSTING

function getClient() {
  if (isUpdatedDiscord) {
    return new Client({intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });
  } else {
    const { Intents } = require(`discord.js`);
    return new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.MESSAGE_CONTENT] });
  }
}

var MessageListeners = {}

function WaitForMessage(MessageType) {
    if (MessageListeners[MessageType] == undefined || MessageListeners[MessageType] == null) {
        MessageListeners[MessageType] = []
    }

    return new Promise((resolve) => {
        MessageListeners[MessageType].push(resolve)
    });
}

const client = getClient() 


// Send script messages
function shareData(data) {
    //console.log("Sent from Discord")
    process.send(data);
}

function convertToString(value) {
    var valueType = typeof(value)

    switch(valueType) {
        case "string":
            return value
        break

        case "number":
            return value.toString()
        break

        case "boolean":
            if (value) return "Yes"
            return "No"
        break

        case "bigint":
            return value.toString()
        break

        case "symbol":
            return value.toString()
        break

        case "null":
            return "[null]"
        break

        case "undefined":
            return "[undefined]"
        break

        default:
            return "[An " + valueType + " was passed as a value]"
        break
    }
}

function embedMessage(details, preEmbed) {
    function performEmbedChanges(anEmbed) {
        for (const [key, value] of Object.entries(details)) {
            //console.log(key, value)
            switch(key) {
                case "title":
                    anEmbed.setTitle(value)
                break;

                case "author":
                    if (!value.name && !value.iconURL && !value.URL) {
                        anEmbed.setAuthor({ name:convertToString(value) })
                    }

                    if (value.name) {
                        anEmbed.setAuthor({ name: convertToString(value.name) })
                    }
                    if (value.iconURL) {
                        anEmbed.setAuthor({ iconURL: convertToString(value.iconURL) })
                    }
                    if (value.URL) {
                        anEmbed.setAuthor({ url: convertToString(value.URL) })
                    }
                break;

                case "color":
                    anEmbed.setColor(value)
                break;

                case "description":
                    anEmbed.setDescription(convertToString(value))
                break;

                case "footer":
                    if (isUpdatedDiscord) {
                        if (value.iconURL) {
                            anEmbed.setFooter({ text: convertToString(value.text), iconURL: convertToString(value.iconURL) })
                        } else {
                            if (value.text) {
                                anEmbed.setFooter({ text: convertToString(value.text) })
                            } else {
                                anEmbed.setFooter({ text: convertToString(value) })
                            }
                        }
                    } else {
                      if (value.text) {
                            anEmbed.setFooter(convertToString(value.text))
                        } else {
                            anEmbed.setFooter(convertToString(value))
                        }
                    }
                break;
                
                case "image":
                    anEmbed.setImage(convertToString(value))
                break;

                case "thumbnail":
                    anEmbed.setThumbnail(convertToString(value))
                break;

                case "url":
                    anEmbed.setUrl(convertToString(value))
                break;

                case "timestamp":
                    anEmbed.setTitle(value)
                break;

                case "fields":
                    Object.keys(value).forEach(function(key) {
                        var localValue = value[key]
                        localValue.name = convertToString(localValue.name)
                        localValue.value = convertToString(localValue.value)
                    });

                    anEmbed.addFields(value)
                break;
            }
        }
    }

    if (preEmbed !== undefined && preEmbed !== null) {
        //perform changes and return
        performEmbedChanges(preEmbed)
        return
    }
    
    var embed 
    if (isUpdatedDiscord) {
      embed = new EmbedBuilder()
    } else {
      embed = new MessageEmbed()
    }
  
    performEmbedChanges(embed)
      
    return embed
}

//var SlashCommands = {

//}

async function messageHandler(message) {
    const user = message.author
    const messageContent = message.content

    var args = message.content.trim().split(/ +/g);
    const cmd = args[0].slice(botPrefix.length).toLowerCase();

    switch(cmd) {
        case "gameban":
            var allowedRoles = ["719857755036581908", "719857778675417098", "727939786815569981", "1282069297186865152", "1291525088159727737", "720057768459108425"]
            //const allowedRoles = []
            var allowed = false
            
            for (const roleId of allowedRoles) {
                if (message.member.roles.cache.has(roleId)) {
                    allowed = true
                    break
                }
            }
        
            if (allowed !== true) {
                message.channel.send("You do not have permission to use this command!")
                return
            }
            
            if (args[1] == null | args[2] == null | args[3] == null) {
                message.channel.send("Missing arguements! `c!gameban [userId] [gameName] [banType] [banReason]`")
                return
            }
        
            var banReason = ""
            var skip = 0
            for (const word of args) {
                if (skip > 3) {
                    //console.log(word);
                    banReason = banReason + word + " "
                }
                skip = skip + 1
            }
        
            if (banReason == "") {
                banReason = "No reason provided"
            }
        
            var issuedBy = message.member.displayName + " (" + message.member.user.id + ")"

            var dataToSend = [{
                MessageTo: "webhook.js",
                Type: "OpenCloudBan",
                Payload: {
                  ServerToSendTo: "719673864111652936",
                  OriginalChannelId: message.channel.id,
                  Arguements: [args[1], args[2], args[3], banReason, issuedBy]
                },
            }]
            shareData(dataToSend)

            //performOpenCloudBan(args[1], "phoenix", args[3], banReason, issuedBy)
            message.channel.send(":clock3: Sending to ROBLOX...")
        break;

        case "viewban":
            var allowedRoles = ["726746155970461769", "727940388765040650", "719857755036581908", "719857778675417098", "727939786815569981", "1282069297186865152", "1291525088159727737", "720057768459108425"]
            //const allowedRoles = []
            var allowed = false
            for (const roleId of allowedRoles) {
                if (message.member.roles.cache.has(roleId)) {
                    allowed = true
                    break
                }
            }
            
            if (allowed !== true) {
                message.channel.send("You do not have permission to use this command!")
                return
            }
                
            if (args[1] == null) {
                message.channel.send("Missing arguements! `c!viewban [userId] [gameName]`")
                return
            }

            var dataToSend = [{
                MessageTo: "webhook.js",
                Type: "OpenCloudViewBan",
                Payload: {
                  ServerToSendTo: "719673864111652936",
                  OriginalChannelId: message.channel.id,
                  Arguements: [args[1], args[2]]
                },
            }]
            shareData(dataToSend)

            //performOpenCloudBan(args[1], "phoenix", args[3], banReason, issuedBy)
            message.channel.send(":clock3: Fetching from ROBLOX...")

        break;

        case "ping":
            var messageSendingTime = Date.now()
            var messageReceivedTime = null
            var orgMsg = await message.channel.send({ content: ":ping_pong: Ping.."})
            messageReceivedTime = Date.now();

            var dataToSend = [{
                MessageTo: "webhook.js",
                Type: "Ping",
                Payload: {}
            }]
            
            var frameworkSendingTime = Date.now()
            shareData(dataToSend)
            await WaitForMessage("Pong")
            var frameworkReceivedTime = Date.now()

            orgMsg.edit({ content: ":ping_pong: Ping.. Pong!\n\n:globe_with_meridians: Discord Ping: `" + (messageReceivedTime - messageSendingTime) + "ms`\n:gear: Framework Ping: `" + (frameworkReceivedTime - frameworkSendingTime) + "ms`"})
        break;
        }
    }

client.on('messageCreate', (message) => {
    // Ignore messages from bots
    if (!message.content.startsWith(botPrefix)) return; 
    if (message.author.bot) return;

    //console.log(`New message in #${message.channel.name}:`);
    //console.log(`Author: ${message.author.tag}`);
    //console.log(`Content: ${message.content}`);
    
    // You can also check for attachments
    //if (message.attachments.size > 0) {
    //  console.log('Attachments:', message.attachments.map(a => a.url));
    //}
    messageHandler(message)
});

//START
client.on("ready", () => { //set the bot status
  botOnline = true
  console.log("Skynet Clans bot is online");
  client.user.setPresence({
    status: "idle",
    activities: [{
      name: "modcalls & handling bans",
      type: 0
    }]
  });
});

client.login(process.env.TOKEN); //log in as bot

// Receive script messages

async function handleSharedData(data) {
    if (!botOnline) {
        setTimeout(function() {handleSharedData(data)}, 500)
        return
    }

    //console.log(data)
    //console.log(MessageListeners)

    if (!(MessageListeners[data.Type] == null || MessageListeners[data.Type] == undefined)) {
        MessageListeners[data.Type].forEach((value, index) => {
            //console.log(value)
            value(data)
        });
    }

    if (data.MessageTo == "discordbot.js") {
        switch(data.Type) {
            case "Embed":
                var guildId = data.Payload.ServerToSendTo
                var channelId = data.Payload.ChannelToSendTo
                var embedable = data.Payload.Embed
                var embed = embedMessage(embedable)

                var guild = await client.guilds.fetch(guildId);
                var channel = await guild.channels.fetch(channelId);
                if (channelId == "908390430863929404") {
                    await channel.send({ content: "<@&941348501151961108>", embeds: [embed] });
                } else {
                    await channel.send({ embeds: [embed] });
                }
            break;
            
            case "Message":
                var guildId = data.Payload.ServerToSendTo
                var channelId = data.Payload.ChannelToSendTo
                var messageString = data.Payload.Message

                var guild = await client.guilds.fetch(guildId);
                var channel = await guild.channels.fetch(channelId);
                await channel.send({ content: messageString });
            break;
        }
    }
}

process.on('message', (data) => {
    //console.log("Received on Discord")
    handleSharedData(data)
});

process.on('exit', async () => {
    //logout from discord client
    await client.logout();
    client.destroy();
})

//shareData("hiii")