import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { Client, GatewayIntentBits, EmbedBuilder, MessageEmbed } = require('discord.js');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
const express = require("express");
const useragent = require('express-useragent');
const prefix = "m!"
//const Conf = require("conf");
//const config = new Conf();
//const blankJson = {
//  "timeStart": 0,
//  "timeEnd": 0,
//  "server": "",
//  "lastVote": "",
//  "role": "",
//}

var discordbotonline = false

const app = express();
//const pidusage = require("pidusage");


//console.log("Mahie bot is starting...");

client.on("message", message => { //basic command processor
  if (!message.content.startsWith(prefix)) return;

  var args = message.content.trim().split(/ +/g);
  const cmd = args[0].slice(prefix.length).toLowerCase();

  switch (cmd) { //using switch instead of using a ton of if and thens
    case "ping":
      message.channel.send(
        ":ping_pong: Pong! `" + `${Date.now() - message.createdTimestamp}` + "ms`"
      );
      break;
    case "version":
      message.channel.send("Mahie -- Version " + process.env.VERSION);
      break;
    case "devserverinvite":
      if (message.author.id == 307112794229047296 || message.author.id == 388776379824603138 || message.author.id == 705207812526964757) {
        message.channel.send("Generating invite...");
        message.channel.createInvite({ maxAge: 0, maxUses: 0 })
          .then(inv => message.channel.send(`${inv.url}`));
      }
      break;
    case "help":
      var embed = new MessageEmbed()
        .setTitle("Mahie Help Menu")
        .setAuthor(client.user.username, client.user.avatarURL())
        .setColor(0x660033)
        .setDescription("All commands are listed here!")
        .setFooter("Made with <3 by Mahmoud! - Version " + process.env.VERSION)
        //.setImage("http://i.imgur.com/yVpymuV.png")
        .setThumbnail("https://cdn.glitch.com/039ed08f-a869-40bd-adfd-1ea42b1c34fa%2FMahieHatSmall.png?v=1600280640711")
        .setTimestamp()
        //.setURL()
        .addFields(
          { name: "Main", value: "m!help\nm!ping\nm!version\nm!changelog\nm!stats", inline: true },
          { name: "Fun", value: "m!bakeacake `alias: m!bakecake`", inline: true }
        )
      message.channel.send({ embed });
      break;
    case "changelog":
      var embed = new Discord.MessageEmbed()
        .setTitle("Changelog")
        .setAuthor(client.user.username, client.user.avatarURL())
        .setColor(0x660033)
        .setDescription("Hey, there is no changelog yet!")
        .setFooter("Made with <3 by Mahmoud! - Version " + process.env.VERSION)
        //.setImage("http://i.imgur.com/yVpymuV.png")
        //.setThumbnail("https://cdn.glitch.com/039ed08f-a869-40bd-adfd-1ea42b1c34fa%2FMahieHatSmall.png?v=1600280640711")
        .setTimestamp()
        //.setURL()
        .addFields(
          { name: "??/?/20??", value: "The Possibilites..", inline: true },
          { name: "??/?/20??", value: "Oh.. Ah..", inline: true }
        )
      message.channel.send({ embed });
      break;
    case "bakecake":
      message.channel.send("kitchen comes first then cake")
      break;
    case "restart":
      if (message.author.id == 307112794229047296 || message.author.id == 388776379824603138 || message.author.id == 705207812526964757) {
        message.channel.send("Restarting...").then(() => console.log("Mahie bot is restarting...")).then(() => client.destroy()).then(() => process.exit());
      }
      break;
    case "stats":
      pidusage(process.pid, { usePs: true }, function (err, stats) {
        var embed = new MessageEmbed()
          .setTitle("Mahie Status")
          .setAuthor(client.user.username, client.user.avatarURL())
          .setColor(0x660033)
          .setDescription("You can read all information about Mahie here!")
          .setFooter("Made with <3 by Mahmoud! - Version " + process.env.VERSION)
          //.setImage("http://i.imgur.com/yVpymuV.png")
          //.setThumbnail("https://cdn.glitch.com/039ed08f-a869-40bd-adfd-1ea42b1c34fa%2FMahieHatSmall.png?v=1600280640711")
          .setTimestamp()
          //.setURL()
          .addFields(
            { name: ":gear: CPU", value: stats.cpu + "%", inline: true },
            { name: ":pager: Memory", value: `${Math.round(stats.memory / 1024 / 1024)}` + " MB", inline: true },
            { name: ":card_box: Servers", value: client.guilds.cache.size + " servers", inline: true },
            { name: ":book: Language", value: "discord.js", inline: true },
            { name: ":link: Hosted on", value: "[glitch.com](https://glitch.com)", inline: true },
            { name: ":clock: Time elapsed since restart", value: `${Math.round(process.uptime() / 60)}` + " minute(s)", inline: true },
          )
        message.channel.send({ embed });
      })
      break;
    case "pass":
      if ((message.author.id == 307112794229047296
        || message.author.id == 388776379824603138
        || message.author.id == 705207812526964757)
        && args[1] === process.env.PASSKEY
        && message.channel.id == 907739986584035328) {
        const passrole = "907723764081504256"
        const passtimer = "907724149588361246"
        message.channel.guild.members.fetch(message.author.id).then(
          member => member.roles.add([passrole], "Passkey Correct")).catch(console.error)
        message.channel.send("Access Granted!")
        var setTime = blankJson
        setTime.timeStart = Date.now()
        setTime.timeEnd = Date.now() + 10800000
        setTime.role = passrole
        setTime.server = message.channel.guild.id
        config.set(message.author.id, setTime)
      }
      break;
  }
});

function removeError(error, key) {
  console.log(error)
  config.delete(key)
}

function checkTimes() {
  var allTimes = config.store
  var currentTime = Date.now()
  if (discordbotonline) {
    for (const [key, value] of Object.entries(allTimes)) {
      if (currentTime > value.timeEnd) {
        console.log("passed", key)
        try {
          client.guilds.fetch(value.server).then(
            serverinstance => serverinstance.members.fetch(key).then(
              userinstance => userinstance.roles.remove([value.role], "Access Expired").catch(config.delete(key))).catch(config.delete(key))).catch(config.delete(key))
          config.delete(key)
          client.guilds.fetch("1127313356483723347").then(
            serverinstance => serverinstance.members.fetch(key).then(
              userinstance => serverinstance.channels.resolve("1127323755526508664").send(userinstance.user.username + " has been removed from voter role successfully").catch(console.error)).catch(console.error)).catch(console.error);
        } catch {
          console.error
          config.delete(key)
        }
      }
    }
  } else {
    console.log("Not performing check, bot is offline")
  }
}
//checkTimes();
//setInterval(checkTimes, 60*1000);

client.on("clientReady", () => {
  console.log("Mahie bot is online");
  discordbotonline = true
  client.user.setPresence({
    status: "online",
    activity: {
      name: "with the birds! | m!help",
      type: 0
    }
  });
});

//website & webhook

const voteEmojis = [":heart:", ":heart_decoration:", ":sparkling_heart:", ":gift_heart:", ":cupid:", ":heartpulse:", ":heart_on_fire:", ":white_flower:", ":tada:", ":sparkles:", ":partying_face:", ":stars:", ":heart_eyes:", ":star_struck:", ":heart_eyes_cat:", ":star2: ", ":comet:", ":dizzy:", ":star:", ":rosette:", ":reminder_ribbon:", ":sparkler:", ":fireworks:"]
var requestCorrect = true

function upvotedServer(user, server, site, role) {
  var currentTime = Date.now()
  var savedTime = config.get(user)
  var timeEnd = currentTime + 86400000
  var lastVote = site

  if (savedTime.lastVote == lastVote && ((currentTime - savedTime.timeStart) < 3600000)) {
    console.log("Duplicated vote!")
  } else {
    function calculateTime(savedTime) {
      if (savedTime && savedTime.timeEnd && (isNaN(savedTime.timeEnd) != true)) {
        if (savedTime.timeEnd + 43200000 > currentTime + 86400000) {
          return (currentTime + 86400000)
        } else {
          return (savedTime.timeEnd + 43200000)
        }
      } else {
        return (currentTime + 43200000)
      }
    }

    var chosenTime = calculateTime(savedTime)
    var discordchosenTime = Math.floor(chosenTime / 1000)
    const random = Math.floor(Math.random() * voteEmojis.length);
    client.guilds.fetch(server).then(
      serverinstance => serverinstance.members.fetch(user).then(
        userinstance => userinstance.roles.add(serverinstance.roles.cache.get(role), "Upvoted").catch(console.error).then(
          userinstance.send(voteEmojis[random] + " `§` Thanks for upvoting **" + serverinstance.name + "** on **" + site + "**! You've been given the Voter role and perks! Expires at <t:" + discordchosenTime + ">").catch(console.error).then(
            () => serverinstance.channels.resolve("1127323755526508664").send(userinstance.user.username + " has voted via " + site + " and has been given perks successfully!").catch(console.error)))));
    var thedata = blankJson
    thedata.timeStart = currentTime
    thedata.timeEnd = chosenTime
    thedata.role = role
    thedata.server = server
    thedata.lastVote = site
    config.set(user, thedata)
    console.log(config.store)
  }
}

function checkHttps(req, res, next) {
  const proto = req.get("X-Forwarded-Proto");
  if (proto && proto.includes("https")) {
    return next();
  }
  res.redirect("https://" + req.hostname + req.originalUrl);
}

app.use(express.urlencoded({ extended: true }))
app.use(express.json());
app.use(useragent.express());

app.use(express.static("public"));

//app.all('*', checkHttps);

app.get("/", (request, response) => {
  response.sendFile(__dirname + "/views/index.html");
});

function skynetwebhook(request, response) {
  var body = request.body
  if (body.requesttype == "Feedback") {
    const avatarpic = body.avatarurl
    const username = body.username
    const displayname = body.displayname
    const userid = body.userid
    const originalfeedbackmessage = body.originalfeedbackmessage
    const game = body.game
    const onmobile = body.onmobile
    for (const [key, value] of Object.entries(body)) {
      if ((key !== "originalfeedbackmessage") && value == null) {
        console.log("Error: " + key + " is null, please send the correct value!")
        response.status(200).send({
          type: "error",
          message: "Error: " + key + " is null, please resend the request!",
          required: key
        })
        requestCorrect = false
      }
    }

    if (requestCorrect == true) {
      var channeltosend
      var logchanneltosend
      var gamename
      var mobilestatus

      if (game == "ACSGroundsV1") {
        channeltosend = "738407389669097492"
        logchanneltosend = "864112225652178958"
        gamename = "ACS Grounds v1.7.7"
      } else if (game == "ACSGroundsV2") {
        channeltosend = "738407389669097492"
        logchanneltosend = "864112225652178958"
        gamename = "ACS Grounds v2.0.1"
      } else if (game == "ACSFiringRange") {
        channeltosend = "738407354013581383"
        logchanneltosend = "864112163487219722"
        gamename = "ACS Firing Range"
      } else if (game == "ACSJungle") {
        channeltosend = "876525691150172161"
        logchanneltosend = "876525854837051402"
        gamename = "ACS Jungle"
      }

      if (onmobile == true) {
        mobilestatus = "Yes"
      } else {
        mobilestatus = "No"
      }

      const embed = new MessageEmbed()
        .setTitle("Game")
        .setAuthor(displayname + " (" + username + ")")
        //.setColor()
        .setDescription(gamename)
        //.setFooter("Made with <3 by Mahmoud! - Version " + process.env.VERSION)
        //.setImage("http://i.imgur.com/yVpymuV.png")
        .setThumbnail(avatarpic)
        .setTimestamp()
        //.setURL()
        .addFields(
          { name: ":speech_balloon: Feedback", value: originalfeedbackmessage },
          { name: ":mobile_phone: On Mobile?", value: mobilestatus, inline: true },
          { name: ":pager: User ID", value: userid, inline: true },
          { name: ":link: Profile Link", value: "[" + username + "](https://www.roblox.com/users/" + userid + "/profile)", inline: true }
        )

      client.guilds.fetch("719673864111652936").then(
        serverinstance => serverinstance.channels.resolve(channeltosend).send({ embed }).catch(console.error));
      response.status(200).send({
        type: "success",
        message: "Successfully sent feedback!",
      })
    }
  } else {
    response.status(403).send("Forbidden")
  }
  requestCorrect = true
}

app.post("/skynetwebhook", (request, response) => {
  if (discordbotonline !== true) {
    setTimeout(function () {
      skynetwebhook(request, response)
    }, 3000);
  } else {
    skynetwebhook(request, response)
  }
});

app.post("/webhook", (request, response) => {
  var useragentsource = request.useragent.source
  console.log(useragentsource)

  if (useragentsource == 'Top.gg Webhook/1.0.0') {
    var body = request.body
    var server = body.guild
    var user = body.user
    var type = body.type
    console.log(useragentsource, server, user, type)

    if (type == "upvote" && server == "1127313356483723347") {
      var role = '1154879464921124914'
      upvotedServer(user, server, "Top.gg", role)
    }
    response.status(200).send("OK")
  } else if (useragentsource == 'GuzzleHttp/6.5.5 curl/7.79.1 PHP/7.4.25' || (request.body.payload != null && request.body.payload.payload != null)) {
    var body = request.body
    var type = body.type
    var payload = body.payload.payload
    var amount = payload.amount
    var user = payload.user.id
    var server = payload.server
    console.log(useragentsource, type, payload, amount, user, server)

    if (type == "gems" && server == "1127313356483723347") {
      var role = '1154879464921124914'
      upvotedServer(user, server, "Discordservers.com", role)
    }
    response.status(200).send("OK")
  } else if (useragentsource == 'python-requests/2.25.1' || (request.body.server_slug != null)) {
    var body = request.body
    var user = body.user_id
    var server = body.guild_id
    console.log(useragentsource, user, server)

    if (server == "1127313356483723347") {
      var role = '1154879464921124914'
      upvotedServer(user, server, "Discadia.com", role)
    }
    response.status(200).send("OK")
  } else {
    console.log(request.body)
    server = "1127313356483723347"
    client.guilds.fetch(server).then(serverinstance => serverinstance.channels.resolve("1127323755526508664").send("<@1145432841665138860> Unknown Request: ```" + useragentsource + request.body + "```").catch(console.error)).catch(console.error);
    response.status(403).send("Forbidden, not a recognized useragent");
  }
});

//startup

const listener = app.listen(process.env.PORT, () => {
  //console.log("Your app is listening on port " + listener.address().port);
});

client.login(process.env.MAHIEBOTTOKEN);
//console.log(config.store)