//start the bot and the webhook
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const client = new Client({intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
	],}); 
const https = require("https")
const Conf = require("conf");
const Cache = require("cache");
const robloxuserstore = new Cache(12*60*60*1000)
const config = new Conf();
const util = require("util")
const express = require("express");
const bodyParser = require("body-parser");
const app = express();

var botOnline = false

app.disable('x-powered-by'); //safety
app.use(bodyParser.urlencoded({ extended: true })); //to be able to parse the requests' bodies
app.use(bodyParser.json());

function logToDiscord(userId, gameName, banType, banReason, issuedBy) {
  var details = "`" + userId + "` was banned for `" + banReason + "` in `" + gameName + "`. Duration: `" + banType + "`"
  async function sendLogs() {
              //console.log(imageUrl1, imageUrl2)
              var embed = new EmbedBuilder()
                  .setTitle(":hammer: Ban")
                  .setFooter("Skynet Clans • Version " + process.env.VERSION)
                  .setTimestamp()
                  .setColor(0x600000)
                  //.setDescription("From: " + gamename)
                  //.setURL()
                  .addFields(
                    {name: "Open Cloud Ban - Issued by " + issuedBy, value: details},
                    //{name: ":pencil: `group`", value: groupid, inline: true},
                    //{name: ":shield: Reporting User", value: "[" + reportingusername + "](https://www.roblox.com/users/" + reportinguserid + "/profile)", inline: true},
                    //{name: ":pager: Report Reason", value: reportreason},
                    //{name: ":triangular_flag_on_post: Suspicion Meter", value: "**" + suspicionpercent + "%**", inline: true},
                    //{name: ":globe_with_meridians: Translation", value: translatedText},
                    //{name: ":link: Join Link 1", value: "[Launch & autojoin (1)](https://www.roblox.com/games/start?placeId=" + gameid + '&launchData={"ReportJobId":"' + jobid + '"})', inline: true},
                    //{name: ":link: Join Link 2", value: "[Launch & autojoin (2)](" + gamelink + "?serverJobId=" + jobid + ")", inline: true},
                    //{name: ":postbox: Server's JobId", value: "`" + jobid + "`"}
                  )
               var discordmodcallserver = "719673864111652936"
               var discordmodcallchannel = "1291314421511094272"
              client.guilds.fetch(discordmodcallserver).then(serverinstance => serverinstance.channels.resolve(discordmodcallchannel).send(embed))
            }
            function sendTheThingy4() {
              if (botOnline) {
                sendLogs()
              } else {
                setTimeout(sendTheThingy4, 1000)
              }
            }
            
            sendTheThingy4()
}

function performOpenCloudBan(userId, gameName, banType, banReason, issuedBy) {
  var requestPath = null
  var duration = null
  
  if (gameName == "phoenix") {
    requestPath = "/cloud/v2/universes/1826628366/user-restrictions/" + userId
  }
  
  if (requestPath == null) {
    console.log("No request path was defined. Stopping request")
    return
  }

  if (banType !== "perm") {
    duration = banType
  }
  
  var requestBody = {
    "path": requestPath,
    "gameJoinRestriction": {
      "active": true,
      "duration": duration,
      "privateReason": "Action performed by Open Cloud. Issued by: " + issuedBy,
      "displayReason": banReason,
      "excludeAltAccounts": false
    }
  }
  
  const requestBodyString = JSON.stringify(requestBody); // Stringify here
  
  var options = {
    hostname: 'apis.roblox.com',
    port: 443,
    path: requestPath,
    method: 'PATCH',
    headers: {
      'x-api-key': process.env.ROBLOXOPENCLOUD,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestBodyString)
    }
    //headers: {
    //    "Content-Type": 'application/x-www-form-urlencoded'
    //}
  }
  
  console.log("prepared the request")
  
  var req = https.request(options, res => {
    let data = '';

    console.log('Status: ', res.statusCode);
    console.log('Headers: ', JSON.stringify(res.headers));

    res.setEncoding('utf8');

    res.on('data', chunk => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            // Try to parse as JSON, but fall back to raw data if it fails
            const parsedData = data ? JSON.parse(data) : data;
            console.log('Response:', parsedData);
        } catch (e) {
            console.log('Raw Response:', data);
        }
    });
    
    if (res.statusCode == 200) {
      logToDiscord(userId, gameName, banType, banReason, issuedBy)
    }
    
    }).on('error', e => {
      console.error(e);
  });
  
  req.write(requestBodyString);
  req.end();
}

//performOpenCloudBan(91552156, "phoenix", "3s", "testing")

const prefix = "c!";
var errorembed = new EmbedBuilder()
  .setTitle("") //Error, syntax error, etc
  .setColor("#CC0000") //Error: #CC0000, Syntax: #00AACC
  .setDescription("") //The description of the error
  //.setFooter("Skynet Clans • Version " + process.env.VERSION + " • Took " + (timeend - timestart) + "ms")
  .setTimestamp()

function isDict(o) {
  var string = JSON.stringify(o);
  return string.startsWith("{") && string.endsWith("}")
}

function getClan(clanID, callback) {
  try {
    if (clanID == "" || clanID == null || clanID == undefined) {
      callback({
        error: "syntax",
        message: ""
      })
    } 
    var clan = config.get(clanID)
    if (clan === undefined) {
      callback({
        error: "error",
        message: "Couldn't find your clan!"
      })
    }
    if (clan !== undefined && isDict(clan) && clan.type == "clan") {
      callback({
        error: "no",
        foundClan: clan
      })
    } else {
      callback({
        error: "error",
        message: "The clan was found, but an error occured while reading the data. Please try again later!"
      })
    }
  } catch {
    callback({
      error: "error",
      message: "An error while executing code has occured. Please try again later!"
    })
  }
}

function getImageUrl1(userid) {
              var imageUrl1
              return new Promise((resolve, reject) => {
                https.get("https://thumbnails.roblox.com/v1/users/avatar?userIds=" + userid + "&size=420x420&format=Png&isCircular=false", res => {
                  let output = '';
                  res.setEncoding('utf8');
                  res.on('data', chunk => {
                    output += chunk;
                  });
    
                  res.on('end', () => {
                    let data = JSON.parse(output);
                    imageUrl1 = data.data[0].imageUrl
                    resolve(imageUrl1)
                  });
                })
              })
            }
           function getImageUrl2(userid) {
             var imageUrl2
             return new Promise((resolve, reject) => {
               https.get("https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=" + userid + "&size=150x150&format=Png&isCircular=false", res => {
                  let output = '';
                  res.setEncoding('utf8');
                  res.on('data', chunk => {
                    output += chunk;
                  });
    
                  res.on('end', () => {
                    let data = JSON.parse(output);
                    imageUrl2 = data.data[0].imageUrl
                    resolve(imageUrl2)
                  });
                })
              })
            }

function getRobloxID(discordID, callback) {
  var playerid = robloxuserstore.get(discordID)
  if (playerid !== undefined || playerid !== null) {
    callback(
      {error: false,
       id: playerid})
  } else {
    var options = {
      hostname: 'api.blox.link',
      port: 443,
      path: '/v1/user/' + discordID,
      method: 'GET'
    }
    var req = https.request(options, res => {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        var body = JSON.parse(chunk)
        if (body.status === "ok") {
          robloxuserstore.put(discordID, body.primaryAccount)
          callback({
            error: false,
            id: body.primaryAccount})
        } else {
          callback({
            error: true,
            message: body.error})
        }
      });
    })
    req.on('error', error => {
      console.error(error)
      callback({
        error: true,
        message: error})
    })        
    req.end()
  }
}
  
function clanstatus(selectedclan) {
  switch(selectedclan.clanstatus) {
    case "publickey":
      return ":unlock:"
    case "inviteonly":
      return ":closed_lock_with_key:"
    case "grouponly":
      return ":lock_with_ink_pen:"
    default:
      return ":grey_question:"
  }
}

function clanactivity(selectedclan, bool) {
  switch(selectedclan.clanactivity) {
    case "online":
      if (bool) {
        return "<:online:908084492680446043> `Ingame` • "
      } else {
        return "<:online:908084492680446043>"
      }
    case "offline":
      if (bool) {
        return "<:offline:908084492453937174> `Offline` • "
      } else {
        return "<:offline:908084492453937174>"
      }
    case "event":
      if (bool) {
        return "<:event:908084493166989363> `In an event` • "
      } else {
        return "<:event:908084493166989363>"
      }
    case "training":
      if (bool) {
        return "<:training:908084493775147049> `Training` • "
      } else {
        return "<:training:908084493775147049>"
      }
    default:
      if (bool) {
        return "<:offline:908084492453937174> `Offline` • "
      } else {
        return "<:offline:908084492453937174>"
      }
  }
}

function clanactivitycolor(selectedclan) {
  switch(selectedclan.clanactivity) {
    case "online":
      return "0x00ff00"
    case "event":
      return "0xff0000"
    case "training":
      return "0xffff00"
  }
}
  
const blankJson = {
  type: "clan",
  clanname: "",
  clanid: "",
  clanlogo: "",
  clanowner: {},
  clancredit: 0,
  clanuniforms: {},
  clanmembers: {},
  clanallies: {},
  clanenemies: {},
  clanserver: "",
  clangroup: {},
  clandescription: "",
  clantag: "",
  clanjoin: "",
  clannotification: "",
  clanstatus: "",
  clanactivity: "online",
  lastonline: 0
};

const blankUserJson = {
  type: "user",
  username: "",
  clan: "",
  notices: {
    gameName: {
      type: "warn",
      content: "",
      countAsOffense: true,
      reasonIndex: "ModcallMisuse",
      issuer: "moderatorId",
      issuedSince: 0,
      read: false
    }
  },
  ban: {
    gameName: {
      banned: false,
      reason: "",
      durationInText: "",
      bannedUntil: 0,
      issuer: "moderatorId",
      issuedSince: 0
    }
  },
  mod: {
    isAMod: false,
    rank: "",
    points: 0
  }
};
  
const cleanseString = function(string) { //used to make clan IDs
  if (!string.length > 32) {
    var str
    while (/\s+$/.test(string)) {
      str = string.substring(0, string.length - 1);
      string = str;
    }
    str
      .replace(/\s+/g, "-")
      .replace(/\W+/g, "-")
      .toLowerCase();
    str = str.replace(/-\s*$/, "");

    return str;
  } else {
    console.warn("String to cleanse is longer than 32 characters!")
  }
};

const cleanseStringUnlimited = function(string) { //used to make clan IDs
  while (/\s+$/.test(string)) {
    string = string.substring(0, string.length - 1);
  }
  string
    .replace(/\s+/g, "-")
    .replace(/\W+/g, "-")
    .toLowerCase();
  string = string.replace(/-\s*$/, "");

  return string;
};
  
const makeClanID = function(str) {
  var name = cleanseString(str);
  var randomnumber = Math.floor(Math.random() * 8999 + 1000);
  return name + "-" + randomnumber;
}

function routineCheck() {
  var currentTime = Date.now()

  var clansstore = config.store
  for (const [key, value] of Object.entries(clansstore)) {
    if (isDict(value) && ("type" in value) && value.type === "clan") {
      if ((value.lastonline + 60*4000) < currentTime) {
        value.clanactivity = "offline"
        value.lastonline = currentTime
      }
    }
  }
  config.store = clansstore
}
routineCheck();

client.on("message", message => { //basic command processor
  var timestart = Date.now()
  if (!message.content.startsWith(prefix)) return;  
  var args = message.content.trim().split(/ +/g);
  const cmd = args[0].slice(prefix.length).toLowerCase();
  
  switch (cmd) { //using switch instead of using a ton of if and thens
    case "restart": //only accessible by the developer
      if (message.author.id == 307112794229047296 ||
          message.author.id == 388776379824603138 ||
          message.author.id == 705207812526964757) {
        message.channel.send("Restarting...").then(
          () => console.log("Skynet Clans bot is restarting...")).then(
            () => client.destroy()).then(
              () => process.exit());
      } else {
        message.channel.send("Only the dev can use `restart`!")
      }
      break;
    case "deleteclan": //only accessible by the developer
      if (message.author.id == 307112794229047296 ||
          message.author.id == 388776379824603138 ||
          message.author.id == 705207812526964757) {
        function execute(data) {
          try {
            if (data.error == "no") {
              config.delete(args[1])
              message.channel.send("Clan deleted")
            } else {
              switch (data.error) {
                case "syntax":
                  //syntax error
                  console.log("Syntax Error")
                  var timeend = Date.now()
                  var errorembed = new EmbedBuilder()
                    .setTitle("Syntax error")
                    .setColor("0x00aacc")
                    .setDescription("Missing arguements! Please include `clanID` as the first arguement. Example: `" + prefix + "deleteclan clanID`")
                    .setTimestamp()
                    .setFooter("Skynet Clans • Version " + process.env.VERSION + " • Took " + (timeend - timestart) + "ms")
                  message.channel.send([errorembed])
                break;
                case "error":
                  //just an error
                  console.log("Error")
                  var timeend = Date.now()
                  var errorembed = new EmbedBuilder()
                    .setTitle("Error")
                    .setColor("0xcc0000")
                    .setDescription(data.message)
                    .setTimestamp()
                    .setFooter("Skynet Clans • Version " + process.env.VERSION + " • Took " + (timeend - timestart) + "ms")
                  message.channel.send([errorembed])
                break;
              }
            }
          } catch {
            //error in executing
            console.log("Error has occured in `deleteclan` command")
            message.channel.send("Error has occured in `deleteclan` command")
          }
        }
        getClan(args[1],execute)
      } else {
        message.channel.send("Only developers can use `deleteclan`!")
      }
        break;
    case "search":
      var clans = config.store
      
      for (const [key, value] of Object.entries(args)) {
        if (key > 1) {
          args[1] = args[1] + " " + value
        }
      }
      
      if (args[1] === "" || args[1] === undefined) {
        message.channel.send("Missing arguement! Type `" + prefix + "search clanname` to search")
      } else {
        args[1] = args[1].toLowerCase();
        var foundclans = ""
        var foundaclan = false
        var foundnumber = 0
          
          for (const [_1, value] of Object.entries(clans)) {
            if (value.type == "clan") {
              var str = value.clanname
              var result = str.toLowerCase().search(args[1])
              if (result !== -1) {
                foundaclan = true
                foundnumber = foundnumber + 1
                //console.log("Clan found: " + value.clanname)
                var claninfo = clanstatus(value) + " " + clanactivity(value, false) + " " + value.clanname + " `" + value.clanid + "`"
                if (foundclans === "") {
                  foundclans = foundclans + claninfo
                } else {
                  foundclans = claninfo + "\n" + foundclans
                }
              }
            }
          }
          
          var timeend = Date.now()
          if (foundaclan) {
            const embed = new EmbedBuilder()
              .setTitle("Found " + foundnumber + " clan(s)")
              .setAuthor("Search query for '" + args[1] + "'")
              //.setColor()
              .setDescription(foundclans)
              .setFooter("Skynet Clans • Version: " + process.env.VERSION + " • Took " + (timeend - timestart) + "ms")
              //.setImage("http://i.imgur.com/yVpymuV.png")
              //.setThumbnail(avatarpic)
              .setTimestamp()
              //.setURL()
            
            message.channel.send({embed})
          } else {
            message.channel.send("No clans found for search query '" + args[1] + "'!")
          }
        }
        break;
      case "clan": //search for clan and send it's data in an embed
        function execute(data) {
          try {
            console.log(data)
            if (data.error == "no") {
              var clan = data.foundClan
              var membersintext = "None"
              var uniformsintext = "None"
              var clanalliesintext = "None"
              var clanenemiesintext = "None"
              var username = "a roblox player"
              var userid = ""
              var groupName = "None"
              var groupid = ""
              
              //processing into text
              //clan members
              for (const [_2, value] of Object.entries(clan.clanmembers)) {
                if (value === "" || value !== undefined || value !== null) {
                  membersintext = membersintext + value
                } else {
                  membersintext = value + "\n" + membersintext
                }
                if (membersintext === "") {
                  membersintext = "None"
                }
              }
            
              //clan uniforms
              for (const [key] of Object.entries(clan.clanuniforms)) {
                if (value === "" || value !== undefined || value !== null) {
                  uniformsintext = uniformsintext + key
                } else {
                  uniformsintext = uniformsintext + "\n" + key
                }
                if (uniformsintext === "") {
                  uniformsintext = "None"
                }
              }
              //clan allies
              for (const [_4, value] of Object.entries(clan.clanallies)) {
                if (value === "" || value !== undefined || value !== null) {
                  clanalliesintext = clanalliesintext + value
                } else {
                  clanalliesintext = value + "\n" + clanalliesintext
                }
                if (clanalliesintext === "") {
                  clanalliesintext = "None"
                }
              }
              
              //clan enemies
              for (const [_5, value] of Object.entries(clan.clanenemies)) {
                if (value === "" || value !== undefined || value !== null) {
                  clanenemiesintext = clanenemiesintext + value
                } else {
                  clanenemiesintext = value + "\n" + clanenemiesintext
                }
                if (clanenemiesintext === "") {
                  clanenemiesintext = "None"
                }
              }
          
              //clan owner
              for (const [key, value] of Object.entries(clan.clanowner)) {
                userid = key
                if (value !== "" || value !== undefined || value !== null) {
                  username = value
                }
                if (username === "") {
                  username = "a ROBLOX player"
                }
              }
            
              //clan group
              if (clan.clangroup.length > 2) {
                for (var [key, value] of Object.entries(clan.clangroup)) {
                  groupid = key
                  if (value !== "" || value !== undefined || value !== null) {
                    groupName = value
                  }
                }
              } else {
                groupName = "None"
              }
              
              var clancreditintext = clan.clancredit
            
              var timeend = Date.now()
              var embed = new EmbedBuilder()
                .setTitle(clanstatus(clan) + " " + clan.clanname + " `" + clan.clanid + "`")
                .setAuthor("Clan Info")
                .setColor(clanactivitycolor(clan))
                .setDescription("Owned by [" + username + "](https://www.roblox.com/users/" + userid + "/profile)")
                .setFooter("Skynet Clans • Version " + process.env.VERSION + " • Took " + (timeend - timestart) + "ms")
                //.setImage("https://www.roblox.com/Thumbs/Asset.ashx?assetId=" + clan.clanlogo)
                .setThumbnail("https://www.roblox.com/Thumbs/Asset.ashx?assetId=" + clan.clanlogo + "&size=48x48&format=png")
                .setTimestamp()
                //.setURL()
                .addFields(
                  {name: ":pager: Description", value: clanactivity(clan, true) + clan.clandescription},
                  {name: ":moneybag: Clan Credit", value: clancreditintext, inline: true},
                  {name: ":elevator: Members", value: membersintext, inline: true},
                  {name: ":martial_arts_uniform: Uniform Names", value: uniformsintext, inline: true},
                  {name: ":radio: Group", value: "[" + groupName + "](https://www.roblox.com/groups/" + groupid + "/" + cleanseStringUnlimited(groupName) + "#!/about)", inline: true},
                  {name: ":shield: Clan Allies", value: clanalliesintext, inline: true},
                  {name: ":crossed_swords: Clan Enemies", value: clanenemiesintext, inline: true}
                )
            
              message.channel.send([embed])
            } else {
              switch (data.error) {
                case "syntax":
                  //syntax error
                  console.log("Syntax Error")
                  var timeend = Date.now()
                  var errorembed = new EmbedBuilder()
                    .setTitle("Syntax error")
                    .setColor("0x00aacc")
                    .setDescription("Missing arguements! Please include `clanID` as the first arguement. Example: `" + prefix + "clan clanID`")
                    .setTimestamp()
                    .setFooter("Skynet Clans • Version " + process.env.VERSION + " • Took " + (timeend - timestart) + "ms")
                  message.channel.send([errorembed])
                break;
                case "error":
                  //just an error
                  console.log("Error")
                  var timeend = Date.now()
                  var errorembed = new EmbedBuilder()
                    .setTitle("Error")
                    .setColor("0xcc0000")
                    .setDescription(data.message)
                    .setTimestamp()
                    .setFooter("Skynet Clans • Version " + process.env.VERSION + " • Took " + (timeend - timestart) + "ms")
                  message.channel.send([errorembed])
                break;
              }
            }
          } catch {
            //error in excution
            console.log("Error has occured in `clan` command")
            message.channel.send("Error has occured in `clan` command")
          }
        }
      
      if (args[1] == "" || args[1] == undefined || args[1] == null) {
        getRobloxID(message.member.id, execute)
      } else {
        getClan(args[1], execute)
      }
      break;
      case "updateclans":
         if (message.author.id == 307112794229047296 ||
            message.author.id == 388776379824603138 ||
            message.author.id == 705207812526964757) {
          var timeStart = Date.now();
          var clansstore = config.store
          for (const [key, value] of Object.entries(clansstore)) {
            if (isDict(value) && ("type" in value) && value.type === "clan") {
              console.log("passed", key)
              for (const [key2, value2] of Object.entries(blankJson)) {
                if ((key2 in value) === false) {
                  console.log("adding")
                  clansstore[key][key2] = value2
                  //console.log(value)
                }
              }
            }
          }
          var timeEnd = Date.now();
          message.channel.send("Updated clans! (Took " + (timeEnd - timeStart) + "ms)")
          config.store = clansstore
        } else {
          message.channel.send("Only the dev can use `updateclans`!")
        }
        break;
      case "printclandata":
        if (args[1] === undefined) {
          console.log(util.inspect(config.store,false,null))
        } else {
          if (config.has(args[1])) {
            console.log(util.inspect(config.get(args[1]),false,null))
          } else {
            message.channel.send("Couldn't find clan!")
          }
        }
        break;
      case "ping":
        message.channel.send(
          ":ping_pong: Pong! `" + `${Date.now() - message.createdTimestamp}` + "ms`"
        );
        break;
      case "createclan":
        var stage = 0
        var arguement1
        var arguement2
        var arguement3
        var clanname
        var clanid
        var description
        var logo
        function execute2(robloxid) {
          if (robloxid.error === false) {
           if (config.has(robloxid.id)) {
             message.channel.send(":warning: You already have or in a clan!")
        } else {
        const embed1 = new EmbedBuilder()
          .setTitle("Clan 1/3")
          .setAuthor("Setting up a clan")
          //.setColor()
          .setDescription(":warning: **DO NOT SET A BAD NAME OR DESCRIPTION.** IT'LL BE TAGGED BY ROBLOX LATER INGAME AND YOU'LL BE ASKED TO CHANGE. **Setup times out after 2 mins**")
          .setFooter("Skynet Clans • Version " + process.env.VERSION)
          //.setImage("https://www.roblox.com/Thumbs/Asset.ashx?assetId=" + clan.clanlogo)
          //.setThumbnail("https://www.roblox.com/Thumbs/Asset.ashx?assetId=" + clan.clanlogo)
          .setTimestamp()
          //.setURL()
          .addFields(
            {name: ":shield: Clan Name", value: "Pick a name for your clan! (send it as a normal message)"}
          )
        message.channel.send(embed1)
        
        stage =  1
        
        const filter = m => (m.author.id === message.author.id);
        var collectingchannel = message.channel
        var collector = collectingchannel.createMessageCollector(filter, {time: 120000});
        collector.on("collect", msg => {
          console.log(msg.content)
          console.log(stage)
          switch(stage) {
            case 1:
              arguement1 = msg.content
              clanname = arguement1
              stage = 2
              break
            case 2:
              arguement2 = msg.content
              stage = 3
              break
            case 3:
              arguement3 = msg.content
              stage = 4
              break
            }
          }
        )
        
        collector.on("collect", msg => {
          switch(stage) {
            case 2:
              clanid = makeClanID(clanname)
              if (config.has(clanid)) {
                message.channel.send(":warning: Error: a lot of clans already have this name! Please select another.")
              } else {
                const embed2 = new EmbedBuilder()
                  .setTitle("Clan 2/3")
                  .setAuthor("Setting up a clan")
                  //.setColor()
                  .setDescription(":warning: **DO NOT SET A BAD NAME OR DESCRIPTION.** IT'LL BE TAGGED BY ROBLOX LATER INGAME AND YOU'LL BE ASKED TO CHANGE")
                  .setFooter("Skynet Clans • Version " + process.env.VERSION)
                  //.setImage("https://www.roblox.com/Thumbs/Asset.ashx?assetId=" + clan.clanlogo)
                  //.setThumbnail("https://www.roblox.com/Thumbs/Asset.ashx?assetId=" + clan.clanlogo)
                  .setTimestamp()
                  //.setURL()
                  .addFields(
                    {name: ":pager: Description", value: "Type a description for your clan! (can be changed later) (send it as a normal message)"}
                  )
                message.channel.send(embed2)
              }
            break;
              case 3:
                const embed3 = new EmbedBuilder()
                  .setTitle("Clan 3/3")
                  .setAuthor("Almost done!")
                  //.setColor()
                  .setDescription(":warning: **DO NOT SET A BAD NAME OR DESCRIPTION.** IT'LL BE TAGGED BY ROBLOX LATER INGAME AND YOU'LL BE ASKED TO CHANGE")
                  .setFooter("Skynet Clans • Version " + process.env.VERSION)
                  //.setImage("https://www.roblox.com/Thumbs/Asset.ashx?assetId=" + clan.clanlogo)
                  //.setThumbnail("https://www.roblox.com/Thumbs/Asset.ashx?assetId=" + clan.clanlogo)
                  .setTimestamp()
                  //.setURL()
                  .addFields(
                    {name: ":frame_photo: Description", value: "Paste a rbxassetid://**id** logo for your clan! (optional, type `skip` to leave empty) (can be changed later) (send it as a normal message)"}
                  )
                message.channel.send(embed3)
                break;
              case 4:
                if (config.has(clanid)) {
                  message.channel.send(":warning: Error: a lot of clans already have this name! Please select another.")
                } else {
                  var newclan = blankJson
                  newclan.clanid = clanid
                  newclan.clanname = arguement1
                  newclan.clanowner = {}
                  newclan.clanowner[robloxid.id] = ""
                  newclan.clandescription = arguement2
                  newclan.clanlogo = arguement3
                  config.set(clanid, newclan)
                  config.set(robloxid, clanid)
                  const embed4 = new EmbedBuilder()
                    .setTitle(newclan.clanname)
                    .setAuthor("Done!")
                    //.setColor()
                    .setDescription("Congratulations! You've made a clan with the id `" + clanid + "` which can be joined by ~~`c!clanjoin " + clanid + "`!~~ NOT YET Functionality ingame will be added soon!")
                    .setFooter("Skynet Clans • Version " + process.env.VERSION)
                    //.setImage("https://www.roblox.com/Thumbs/Asset.ashx?assetId=" + clan.clanlogo)
                    //.setThumbnail("https://www.roblox.com/Thumbs/Asset.ashx?assetId=" + clan.clanlogo)
                    .setTimestamp()
                  collector.stop()
                  message.channel.send(embed4)
                  break
                }
              }
            })
          //.setURL()
          //.addFields(
          //  {name: ":frame_photo: Description", value: "Paste a `rbxassetid://id` logo for your clan! (optional, type `skip` to leave empty) (can be changed later) (send it as a normal message)"}
          //)
        //const clanname = payload2.clanname
        //const clanowner = payload2.clanowner
        //const clandescription = payload2.clandescription
        //const clanlogo = payload2.clanlogo
        //var newclan = blankJson
        //newclan.clanname = clanname
        //newclan.clanowner = clanowner
        //newclan.clandescription = clandescription
        //newclan.clanlogo = clanlogo
        //newclan.clanid = makeClanID(clanname)
    }
        } else {
          message.channel.send("An error occured: " + robloxid.message)
        }
        }
        
        getRobloxID(message.member.id, execute2)
        break;
      case "editclan":
        function execute3(robloxdata) {
          if (robloxdata.error === false) {
            if (config.has(robloxdata.id) && config.has(config.get(robloxdata.id))) {
              var clan = config.get(config.get(robloxdata.id))
              var userid
              for (const [key] of Object.entries(clan.clanowner)) {
                userid = key
              }
              
              if (userid === robloxdata.id) {
                if (args[1] === undefined) {
                  var groupid
                  for (var [key] of Object.entries(clan.clangroup)) {
                    groupid = key
                  }
                  if (groupid === undefined) {
                    groupid = "Not set - `id`"
                  }
                  var clanlogotext, clanstatustext, clandescriptiontext
                  if (clan.clanstatus === "" || clan.clanstatus === undefined) {
                    clanstatustext = "Not selected - `option`"
                  } else {
                    clanstatustext = clan.clanstatus
                  }
                  if (clan.clanlogo === "" || clan.clanlogo === undefined) {
                    clanlogotext = "Not set - `id`"
                  } else {
                    clanlogotext = clan.clanlogo
                  }
                  if (clan.clandescription === "" || clan.clandescription === undefined) {
                    clandescriptiontext = "Not set - `string (no emojis or markup)`"
                  } else {
                    clandescriptiontext = clan.clandescription
                  }
                  
                  var timeend = Date.now() 
                  var editembed = new EmbedBuilder()
                  .setTitle(clan.clanname + " `" + clan.clanid + "`")
                  .setAuthor("Clan Info")
                  .setFooter("Skynet Clans • Version " + process.env.VERSION + " • Took " + (timeend - timestart) + "ms")
                  .setImage("https://www.roblox.com/Thumbs/Asset.ashx?assetId=" + clan.clanlogo)
                  //.setThumbnail("https://www.roblox.com/Thumbs/Asset.ashx?assetId=" + clan.clanlogo)
                  .setTimestamp()
                  .setDescription("There are three join modes: ~~`publickey`~~, `inviteonly` and `grouponly`.\n:warning: **Please note that you'll have to change the property if it has been tagged by roblox!**")
                  //.setURL()
                  .addFields(
                    {name: ":pencil: `description`", value: clandescriptiontext},
                    //{name: ":pencil: `group`", value: groupid, inline: true},
                    {name: ":pencil: `icon`", value: clanlogotext, inline: true},
                    {name: ":pencil: `joinMode`", value: clanstatustext, inline: true}
                  )
                  
                  message.channel.send("*Any field with a :pencil: can be edited! `c!editclan property value`",editembed).catch(console.error)
                } else if (args[1] !== undefined && args[2] !== undefined) {
                  var string = ""
                  for (const [key, value] of Object.entries(args)) {
                    if (key > 1) {
                      if (string === "") {
                        string = value
                      } else {
                        string = string + " " + value
                      }
                    }
                  }
                  //console.log(args[1],string)
                  
                  if (string !== undefined) {
                    switch(args[1]) {
                      case "description":
                        clan.clandescription = string
                        message.channel.send("Successfully set `description` to:\n> " + clan.clandescription)
                        break;
                      //case "group":
                      //  break;
                      case "icon":
                        clan.clanlogo = string
                        message.channel.send("Successfully set `icon` to `" + clan.clanlogo + "`!")
                        break;
                      case "joinMode":
                        switch(string) {
                          //case "publickey":
                          //  break;
                          case "inviteonly":
                            clan.clanstatus = "inviteonly"
                            message.channel.send("Successfully set `joinMode` to `" + clan.clanstatus + "`!")
                            break;
                          case "grouponly":
                            if (groupid !== "" || groupid !== undefined || groupid !== null || !Number.isNaN(groupid)) {
                              clan.clanstatus = "grouponly"
                              message.channel.send("Successfully set `joinMode` to `" + clan.clanstatus + "`!")
                            } else {
                              message.channel.send("It looks like you didn't set a group as clan group yet! ~~`" + prefix +"editclan group id`~~")
                            }
                            break;
                        }
                        break;
                      default:
                        message.channel.send("Invalid property choice! Please check again")
                        break;
                    }
                  } else {
                    message.channel.send("Please send the second arguement!")
                  }
                  if (clan !== config.get(clan.clanid)) {
                    clan.clanactivity = "online"
                    config.set(clan.clanid, clan)
                  }
                }
              } else {
                message.channel.send("You don't have permission to change the clan data!")
              }
            }
          } else {
            message.channel.send("An error has occured: " + robloxdata.message)
          }
        }
        getRobloxID(message.member.id, execute3)
        break;
      case "joinclan":
        function execute4(robloxdata) {
          if (robloxdata.error === false) {
            var clan
            if (config.has(args[1])) {
              clan = config.get(args[1])
              console.log(args[1],args[2])
              switch(clan.clanstatus) {
                //case "publickey":
                //  break;
                case "inviteonly":
                  break;
                case "grouponly":
                  break;
              }
            } else {
              message.channel.send("Couldn't find the clan! `" + prefix + "joinclan clanid`")
            }
          } else {
            message.channel.send("An error has occured: " + robloxdata.message)
          }
        }
        getRobloxID(message.member.id, execute4)
        break;
      case "loadsavedata":
        if (message.author.id == 307112794229047296 ||
            message.author.id == 388776379824603138 ||
            message.author.id == 705207812526964757) {
          config.store = {}
        }
        break;
      case "updateusers":
        if (message.author.id == 307112794229047296 ||
            message.author.id == 388776379824603138 ||
            message.author.id == 705207812526964757) {
          var timeStart = Date.now();
          var clansstore = config.store
          for (const [key, value] of Object.entries(clansstore)) {
            if (!isDict(value)) {
              console.log("passed & submitting", key)
              var playerprofile = blankUserJson
              playerprofile.clan = value
              clansstore[key] = playerprofile
            } else {
              for (const [key2, value2] of Object.entries(blankUserJson)) {
                if ((key2 in value) === false && ("type" in value) && value.type === "user") {
                  console.log("passed & adding")
                  clansstore[key][key2] = value2
                  console.log(value)
                }
              }
            }
          }
          var timeEnd = Date.now();
          message.channel.send("Updated users! (Took " + (timeEnd - timeStart) + "ms)")
          config.store = clansstore
        } else {
          message.channel.send("Only the dev can use `updateusers`!")
        }
        break;
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
          break
        }
          
        if (args[1] == null | args[2] == null | args[3] == null) {
          message.channel.send("Missing arguements! `c!gameban [userId] [gameName] [banType] [banReason]`")
          break
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
        performOpenCloudBan(args[1], "phoenix", args[3], banReason, issuedBy)
        message.channel.send("Sent ban to Roblox. Please double-check #mod-logs and see if the ban went through!")
        break; 
      }
  });
  
  console.log(config.size)

 

client.login(process.env.TOKEN); //log in as bot

client.on("ready", () => { //set the bot status
  botOnline = true
  console.log("Skynet Clans bot is online");
  client.user.setPresence({
    status: "idle",
    activity: {
      name: "modcalls & handling bans",
      type: 0
    }
  });
});