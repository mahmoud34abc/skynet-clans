//new discord bot stuff handler
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
//const fs = require('node:fs');
const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');

const client = new Client({intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const botPrefix = "c!"

var botOnline = false

// Send script messages
function shareData(data) {
  process.send(data);
}

function embedMessage(details, preEmbed) {
    function performEmbedChanges(anEmbed) {
        for (const [key, value] of Object.entries(details)) {
            switch(key) {
                case "title":
                    anEmbed.setTitle(value)
                break;
                case "author":
                    anEmbed.setAuthor({ name: value.name, iconURL: value.iconURL, url: value.URL })
                break;
                case "color":
                    anEmbed.setColor(value)
                break;
                case "description":
                    anEmbed.setDescription(value)
                break;
                case "footer":
                    anEmbed.setFooter({ text: value.text, iconURL: value.iconURL })
                break;
                case "image":
                    anEmbed.setImage(value)
                break;
                case "thumbnail":
                    anEmbed.setThumbnail(value)
                break;
                case "url":
                    anEmbed.setUrl(value)
                break;
                case "timestamp":
                    anEmbed.setTitle(value)
                break;
                case "fields":
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

    var embed = new EmbedBuilder()
    performEmbedChanges(embed)

    return embed
}

//var SlashCommands = {

//}

function messageHandler(message) {
    const user = message.author
    const messageContent = message.content

    var args = message.content.trim().split(/ +/g);
    const cmd = args[0].slice(botPrefix.length).toLowerCase();

    switch(cmd) {
        case "gameban":
            const allowedRoles = ["719857755036581908", "719857778675417098", "727939786815569981", "1282069297186865152", "1291525088159727737", "720057768459108425"]
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
                    console.log(word);
                    banReason = banReason + word + " "
                }
                skip = skip + 1
            }
        
            if (banReason == "") {
                banReason = "No reason provided"
            }
        
            var issuedBy = message.member.displayName + " (" + message.member.user.id + ")"

            var dataToSend = [{
                MessageTo: "Webhook",
                Type: "OpenCloudBan",
                Payload: {
                  ServerToSendTo: "719673864111652936",
                  ChannelToSendTo: message.channel.channelId,
                  Arguements: [args[1], "phoenix", args[3], banReason, issuedBy]
                },
            }]
            shareData(dataToSend)

            //performOpenCloudBan(args[1], "phoenix", args[3], banReason, issuedBy)
            message.channel.send(":clock3: Sending to ROBLOX...")
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

    //console.log('Received shared data:', data);

    if (data.MessageTo == "Discord") {
        switch(data.Type) {
            case "Embed":
                var guildId = data.Payload.ServerToSendTo
                var channelId = data.Payload.ChannelToSendTo
                var embedable = data.Payload.Embed
                var embed = embedMessage(embedable)

                var guild = await client.guilds.fetch(guildId);
                var channel = await guild.channels.fetch(channelId);
                if (channelId !== "1291314421511094272") {
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
    handleSharedData(data)
});

process.on('exit', async () => {
    //logout from discord client
    await client.logout();
    client.destroy();
})

//shareData("hiii")