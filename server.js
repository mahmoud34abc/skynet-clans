//start the bot and the webhook
const {Client,Intents,MessageEmbed} = require("discord.js");
const client = new Client({intents: ["GUILD_MESSAGES","DIRECT_MESSAGES"]});
const https = require("https")
const Conf = require("conf");
const Cache = require("cache");
const robloxuserstore = new Cache(12*60*60*1000);
const config = new Conf();
const util = require("util")
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
app.disable('x-powered-by');
app.use(bodyParser.urlencoded({ extended: true })); //to be able to parse the requests' bodies
app.use(bodyParser.json());
const prefix = "c!";
var errorembed = new MessageEmbed()
  .setTitle("") //Error, syntax error, etc
  .setColor("0xCC0000") //Error: 0xCC0000, Syntax: 0x00AACC
  .setDescription("") //The description of the error
  //.setFooter("Skynet Clans • Version " + process.env.VERSION + " • Took " + (timeend - timestart) + "ms")
  .setTimestamp(Date.now())

function isDict(o) {
  var string = JSON.stringify(o);
  return (string.startsWith("{") && string.endsWith("}"))
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

client.on("messageCreate", message => { //basic command processor
  var timestart = Date.now()
  if (!message.content.startsWith(prefix)) return;  
})

app.post("/webhook", (request, response) => {  //since I'm planning this to be semi-public, it'll require authkeys
  var responseBody = []                        //to make clans and make changes to them and give them credit
                                               //authkeys will only be given to trusted ones, and exploiting them
                                               //will cause deactivation to their authkey
  function makeResponse(bool,message,id,payload) {
    const theResponse = {
      id,
      status: bool?200:400,
      responseStatus: bool?'OK':'BAD REQUEST',
      message,
      payload,
    }
    var arraylength = responseBody.length
    var newResponse = {...theResponse}
    newResponse.message = message
    newResponse.id = id
    newResponse.payload = {...payload}
    responseBody[arraylength + 1] = newResponse
  }
  
  const body = request.body
  const payload = body.payload //requests will be sent every 2 seconds, so they'll be in a dictionary called payload
  for (const [key, value] of Object.entries(payload)) {
    if (key == "requestType") {
      console.log(value)
    }
    const payload2 = value.payload
    switch(value.requestType) {
      case "heartbeat":
        makeResponse(true, "",value.id, {})
        break;
      case "createclan":
        const clanname = payload2.clanname
        const clanowner = payload2.clanowner
        const clandescription = payload2.clandescription
        const clanlogo = payload2.clanlogo
        var newclan = blankJson
        newclan.clanname = clanname
        newclan.clanowner = clanowner
        newclan.clandescription = clandescription
        newclan.clanlogo = clanlogo
        newclan.clanid = makeClanID(clanname)
        var ownerid
        for (const [key2, value2] of Object.entries(clanowner)) {
          newclan.clanowner[key2] = value2
          ownerid = key2
        }
        if (config.has(newclan.clanid)) {
          newclan.clanid = makeClanID(clanname) 
          if (config.has(newclan.clanid)) {
            var errorMessage = "Too much clans with the same clan ID! " + newclan.clanid + " " + newclan.clanname
            console.error(errorMessage)
            makeResponse(false, errorMessage, value.id, {error: 1})
          } else {
            config.set(newclan.clanid,newclan)
            config.set(ownerid.toString(),newclan.clanid)
            makeResponse(true, "", value.id, {"newclan": newclan})
          }
        } else {
          config.set(newclan.clanid,newclan)
          config.set(ownerid.toString(),newclan.clanid)
          makeResponse(true, "", value.id, {"newclan": newclan})
        }
        break
      case "modifyclan":
        if (config.has(value.clanid) && config.get(value.clanid).type === "clan") {
          var changesjson = {}
          for (const [key1,value1] of Object.entries(payload)) {
            changesjson[key1] = value1
          }
        
          var changedClan = config.get(payload2.clanid)
          for (const [key1, value1] of Object.entries(changesjson)) {
            if (changedClan.hasOwnProperty(key1)) {
              changedClan[key1] = value1
            } else {
              switch(key1) {
                case "addcredit":
                  changedClan["clancredit"] = changedClan["clancredit"] + value1
                  break;
                case "removecredit":
                  changedClan["clancredit"] = changedClan["clancredit"] - value1
                  break;
                default:
                  var errorMessage = "Undefined change! " + key1
                  console.error(errorMessage)
                  break;
              }
            }
          }
          config.set(payload2.clanid, changedClan)
          makeResponse(true, "", value.id, {"newclan": changedClan})
        } else {
          var errorMessage = "Couldn't find clan of ID " + payload2.clanid
          console.error(errorMessage)
          makeResponse(false, errorMessage, value.id, {"error": 1})
        }
        break;
      case "deleteclan":
        const clantodelete = payload2.clanid
        if (config.has(clantodelete) && config.get(value.clanid).type === "clan") {
          config.delete(clantodelete)
          makeResponse(true, "", value.id, {"deletedclan": payload2.clanid2})
        } else {
          console.error("Couldn't find clan of ID " + clantodelete)
          makeResponse(false, "Couldn't find clan of ID " + clantodelete, value.id, {"error": 1})
        }
        break;
      case "fetchclan":
        var clanid = payload2.clanid
        if (config.has(clanid) && config.get(value.clanid).type === "clan") {
          makeResponse(true, "", value.id, {"clan": config.get(clanid)})
        } else {
          console.error("Couldn't find clan of ID"  + clanid)
          makeResponse(false, "Couldn't find clan of ID"  + clanid, value.id, {error: 1})
        }
        break;
      case "fetchuser":
        var player = payload2.player
        for (const [key3,value3] of Object.entries(player)) {
          if (config.has(key3)) {
            var clanid = config.get(key3)
            if ((clanid !== "" || clanid !== null || clanid !== undefined) && config.has(clanid)) {
              var clan = config.get(clanid)
              for (const [key4] of Object.entries(clan.clanowner)) {
                if (key3 === key4) {
                  clan.clanowner[key4] = value3
                }
              }
              for (const [key5] of Object.entries(clan.clanmembers)) {
                if (key3 == key5) {
                  clan.clanmembers[key5] = value3
                }
              }
              config.set(clanid, clan)
              makeResponse(true, "",value.id,{"clan": clan})
            } else {
              if (clanid !== "" || clanid !== null || clanid !== undefined) {
                makeResponse(false, "Couldn't find clan of ID " + clanid + "! The clan could have been deleted.", value.id, {"error": 2})
              } else {
                makeResponse(true, "", value.id, {})
                config.delete(key3)
              }
            }
          } else {
            makeResponse(true, "", value.id, {})
          }
        }
        break;
      case "addcredit":
        var credittoadd = payload2.credit
        var clanid = payload2.clanid
        if (config.has(clanid) && config.get(value.clanid).type === "clan") {
          var clan = config.get(clanid)
          clan.clancredit = clan.clancredit + credittoadd
          config.set(clanid, clan)
          makeResponse(true, "", value.id, {"newclan": clan})
        } else {
          makeResponse(false, "Couldn't find clan of ID"  + clanid, value.id, {error: 1})
        }
        break;
      case "removecredit":
        var credittoremove = payload2.credit
        var clanid = payload2.clanid
        if (config.has(clanid) && config.get(value.clanid).type === "clan") {
          var clan = config.get(clanid)
          clan.clancredit = clan.clancredit - credittoremove
          config.set(clanid, clan)
          makeResponse(true, "", value.id, {"newclan": clan})
        } else {
          console.error("Couldn't find clan of ID"  + clanid)
          makeResponse(false, "Couldn't find clan of ID"  + clanid, value.id, {error: 1})
        }
        break;
      case "clannotifcation":
        break;
      case "joinclan":
        var player = payload2.player
        var clanid = payload2.clanid
        if (config.has(clanid) && config.get(value.clanid).type === "clan") {
          var clan = config.get(clanid)
          for (const [key3,value3] of Object.entries(player)) {
            clan.clanmembers[key3] = value3
          }
          config.set(clanid, clan)
          config.set(key.toString(),clanid)
          makeResponse(true, "", value.id, {"newclan": clan})
        } else {
          console.error("Couldn't find clan of ID"  + clanid)
          makeResponse(false, "Couldn't find clan of ID"  + clanid, value.id, {error: 1})
        }
        break;
      case "leaveclan":
        var player = payload2.player
        var clanid = payload2.clanid
        if (config.has(clanid) && config.get(value.clanid).type === "clan") {
          var clan = config.get(clanid)
          for (const [key3,_] of Object.entries(player)) {
            clan.clanmembers.delete(key3)
            config.delete(key3.toString())
          }
          config.set(clanid, clan)
          makeResponse(true, "", value.id, {"newclan": clan})
        } else {
          console.error("Couldn't find clan of ID"  + clanid)
          makeResponse(false, errorMessage, value.id, {error: 1})
        }
        break;
      case "moderation":
        var requesttype = payload2.requestType
        switch(requesttype) {
          case "modcall":
            var timestart = Date.now()
            var modcallpayload = payload2.payload
            var reporteduser = modcallpayload.reporteduser //the user that as reported
            var reportinguser = modcallpayload.reportinguser //the user that reported
            var reportreason = modcallpayload.reportreason //the reason for reporting
            var game = modcallpayload.game //used to indicate the game
            //var serverjobid = modcallpayload.serverjobid //used for joining the server from ingame
            //var reportdetails = modcallpayload.reportdetails //which mod joined
            var discordmodcallserver = "719673864111652936"
            var discordmodcallchannel = "908390430863929404"
            
            var reportingusername
            var reportinguserid
            var reportedusername
            var reporteduserid
            var gamename
            var gamekeyname
            
            for (const [key, value] of Object.entries(reportinguser)) {
              reportingusername = value
              reportinguserid = key
            }
            
            for (const [key, value] of Object.entries(reporteduser)) {
              reportedusername = value
              reporteduserid = key
            }
            
            for (const [key, value] of Object.entries(game)) {
              gamename = value
              gamekeyname = key
            }
            
            //dont forget to make a quicklink field!
            var timeend = Date.now()
            var embed = new MessageEmbed()
                .setTitle(":loudspeaker: Modcall")
                .setFooter("Skynet Clans • Version " + process.env.VERSION + " • Took " + (timeend - timestart) + "ms")
                //.setImage("https://www.roblox.com/Thumbs/Asset.ashx?assetId=" + clan.clanlogo)
                //.setThumbnail("https://www.roblox.com/Thumbs/Asset.ashx?assetId=" + clan.clanlogo)
                .setTimeStamp(Date.now())
                .setColor(0x660000)
                .setDescription("From: " + gamename)
                //.setURL()
                .addFields(
                  {name: ":name_badge: Reported User", value: "[" + reportedusername + "](https://www.roblox.com/users/" + reporteduserid + "/profile)", inline: true},
                  //{name: ":pencil: `group`", value: groupid, inline: true},
                  {name: ":shield: Reporting User", value: "[" + reportingusername + "](https://www.roblox.com/users/" + reportinguserid + "/profile)", inline: true},
                  {name: ":pager: Report Reason", value: reportreason}
                )
            client.guilds.resolve(discordmodcallserver).then(serverinstance => serverinstance.channels.resolve(discordmodcallchannel).send({content: "<@&941348501151961108>", embeds: [embed]}))
            makeResponse(true, "",value.id, {})
          break;
        }
        break;
      }
    }
  response.send(responseBody).status(200)
}); //listener for post requests (webhook)

setInterval(routineCheck, 60*4000);

// listen for requests
var listener = app.listen(process.env.PORT, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});

client.login(process.env.TOKEN); //log in as bot

client.on("ready", () => { //set the bot status
  console.log("Skynet Clans bot is online");
  client.user.setPresence({
    status: "idle",
    activities: {
      name: "modcalls only",
      type: 3
    }
  });
});