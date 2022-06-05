//start the bot and the webhook
const {Client,Intents} = require("discord.js");
const client = new Client({intents: [Intents.FLAGS.MESSAGE_CONTENT]});
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
var errorembed = new Discord.MessageEmbed()
  .setTitle() //Error, syntax error, etc
  .setColor() //Error: #CC0000, Syntax: #00AACC
  .setDescription() //The description of the error
  //.setFooter("Skynet Clans • Version " + process.env.VERSION + " • Took " + (timeend - timestart) + "ms")
  .setTimestamp()

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
  var args = message.content.trim().split(/ +/g);
  const cmd = args[0].slice(prefix.length).toLowerCase();
  
  switch (cmd) { //using switch instead of using a ton of if and thens
    case "restart": //only accessible by the developer
      if (message.author.id == 307112794229047296 ||
          message.author.id == 388776379824603138 ||
          message.author.id == 705207812526964757) {
        message.channel.send({content: "Restarting..."}).then(
          () => console.log("Skynet Clans bot is restarting...")).then(
            () => client.destroy()).then(
              () => process.exit());
      } else {
        message.channel.send({content: "Only the dev can use `restart`!"})
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
              message.channel.send({content: "Clan deleted"})
            } else {
              switch (data.error) {
                case "syntax":
                  //syntax error
                  console.log("Syntax Error")
                  var timeend = Date.now()
                  var errorembed = new Discord.MessageEmbed()
                    .setTitle("Syntax error")
                    .setColor("0x00aacc")
                    .setDescription("Missing arguements! Please include `clanID` as the first arguement. Example: `" + prefix + "deleteclan clanID`")
                    .setTimestamp()
                    .setFooter("Skynet Clans • Version " + process.env.VERSION + " • Took " + (timeend - timestart) + "ms")
                  message.channel.send({embeds: [errorembed]})
                break;
                case "error":
                  //just an error
                  console.log("Error")
                  var timeend = Date.now()
                  var errorembed = new Discord.MessageEmbed()
                    .setTitle("Error")
                    .setColor("0xcc0000")
                    .setDescription(data.message)
                    .setTimestamp()
                    .setFooter("Skynet Clans • Version " + process.env.VERSION + " • Took " + (timeend - timestart) + "ms")
                  message.channel.send({embeds: [errorembed]})
                break;
              }
            }
          } catch {
            //error in executing
            console.log("Error has occured in `deleteclan` command")
            message.channel.send({content: "Error has occured in `deleteclan` command"})
          }
        }
        getClan(args[1],execute)
      } else {
        message.channel.send({content: "Only developers can use `deleteclan`!"})
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
        message.channel.send({content: "Missing arguement! Type `" + prefix + "search clanname` to search"})
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
            const embed = new Discord.MessageEmbed()
              .setTitle("Found " + foundnumber + " clan(s)")
              .setAuthor("Search query for '" + args[1] + "'")
              //.setColor()
              .setDescription(foundclans)
              .setFooter("Skynet Clans • Version: " + process.env.VERSION + " • Took " + (timeend - timestart) + "ms")
              //.setImage("http://i.imgur.com/yVpymuV.png")
              //.setThumbnail(avatarpic)
              .setTimestamp()
              //.setURL()
            
            message.channel.send({embeds: [embed]})
          } else {
            message.channel.send({content: "No clans found for search query '" + args[1] + "'!"})
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
              var embed = new Discord.MessageEmbed()
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
            
              message.channel.send({embeds: [embed]})
            } else {
              switch (data.error) {
                case "syntax":
                  //syntax error
                  console.log("Syntax Error")
                  var timeend = Date.now()
                  var errorembed = new Discord.MessageEmbed()
                    .setTitle("Syntax error")
                    .setColor("0x00aacc")
                    .setDescription("Missing arguements! Please include `clanID` as the first arguement. Example: `" + prefix + "clan clanID`")
                    .setTimestamp()
                    .setFooter("Skynet Clans • Version " + process.env.VERSION + " • Took " + (timeend - timestart) + "ms")
                  message.channel.send({embeds: [errorembed]})
                break;
                case "error":
                  //just an error
                  console.log("Error")
                  var timeend = Date.now()
                  var errorembed = new Discord.MessageEmbed()
                    .setTitle("Error")
                    .setColor("0xcc0000")
                    .setDescription(data.message)
                    .setTimestamp()
                    .setFooter("Skynet Clans • Version " + process.env.VERSION + " • Took " + (timeend - timestart) + "ms")
                  message.channel.send({embeds: [errorembed]})
                break;
              }
            }
          } catch {
            //error in excution
            console.log("Error has occured in `clan` command")
            message.channel.send({content: "Error has occured in `clan` command"})
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
          message.channel.send({content: "Updated clans! (Took " + (timeEnd - timeStart) + "ms)"})
          config.store = clansstore
        } else {
          message.channel.send({content: "Only the dev can use `updateclans`!"})
        }
        break;
      case "printclandata":
        if (args[1] === undefined) {
          console.log(util.inspect(config.store,false,null))
        } else {
          if (config.has(args[1])) {
            console.log(util.inspect(config.get(args[1]),false,null))
          } else {
            message.channel.send({content: "Couldn't find clan!"})
          }
        }
        break;
      case "ping":
        message.channel.send({content: ":ping_pong: Pong! `" + `${Date.now() - message.createdTimestamp}` + "ms`"});
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
        function execute(robloxid) {
          if (robloxid.error === false) {
           if (config.has(robloxid.id)) {
             message.channel.send({content: ":warning: You already have or in a clan!"})
        } else {
        const embed1 = new Discord.MessageEmbed()
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
        message.channel.send({embeds: [embed1]})
        
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
                message.channel.send({content: ":warning: Error: a lot of clans already have this name! Please select another."})
              } else {
                const embed2 = new Discord.MessageEmbed()
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
                message.channel.send({embeds: [embed2]})
              }
            break;
              case 3:
                const embed3 = new Discord.MessageEmbed()
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
                message.channel.send({embeds: [embed3]})
                break;
              case 4:
                if (config.has(clanid)) {
                  message.channel.send({content: ":warning: Error: a lot of clans already have this name! Please select another."})
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
                  const embed4 = new Discord.MessageEmbed()
                    .setTitle(newclan.clanname)
                    .setAuthor("Done!")
                    //.setColor()
                    .setDescription("Congratulations! You've made a clan with the id `" + clanid + "` which can be joined by ~~`c!clanjoin " + clanid + "`!~~ NOT YET Functionality ingame will be added soon!")
                    .setFooter("Skynet Clans • Version " + process.env.VERSION)
                    //.setImage("https://www.roblox.com/Thumbs/Asset.ashx?assetId=" + clan.clanlogo)
                    //.setThumbnail("https://www.roblox.com/Thumbs/Asset.ashx?assetId=" + clan.clanlogo)
                    .setTimestamp()
                  collector.stop()
                  message.channel.send({embeds: [embed4]})
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
          message.channel.send({content: "An error occured: " + robloxid.message})
        }
        }
        
        getRobloxID(message.member.id, execute)
        break;
      case "editclan":
        function execute(robloxdata) {
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
                  var editembed = new Discord.MessageEmbed()
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
                  
                  message.channel.send({content: "*Any field with a :pencil: can be edited! `c!editclan property value`", embeds: [editembed]}).catch(console.error)
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
                        message.channel.send({content: "Successfully set `description` to:\n> " + clan.clandescription})
                        break;
                      //case "group":
                      //  break;
                      case "icon":
                        clan.clanlogo = string
                        message.channel.send({content: "Successfully set `icon` to `" + clan.clanlogo + "`!"})
                        break;
                      case "joinMode":
                        switch(string) {
                          //case "publickey":
                          //  break;
                          case "inviteonly":
                            clan.clanstatus = "inviteonly"
                            message.channel.send({content: "Successfully set `joinMode` to `" + clan.clanstatus + "`!"})
                            break;
                          case "grouponly":
                            if (groupid !== "" || groupid !== undefined || groupid !== null || !Number.isNaN(groupid)) {
                              clan.clanstatus = "grouponly"
                              message.channel.send({content: "Successfully set `joinMode` to `" + clan.clanstatus + "`!"})
                            } else {
                              message.channel.send({content: "It looks like you didn't set a group as clan group yet! ~~`" + prefix +"editclan group id`~~"})
                            }
                            break;
                        }
                        break;
                      default:
                        message.channel.send({content: "Invalid property choice! Please check again"})
                        break;
                    }
                  } else {
                    message.channel.send({content: "Please send the second arguement!"})
                  }
                  if (clan !== config.get(clan.clanid)) {
                    clan.clanactivity = "online"
                    config.set(clan.clanid, clan)
                  }
                }
              } else {
                message.channel.send({content: "You don't have permission to change the clan data!"})
              }
            }
          } else {
            message.channel.send({content: "An error has occured: " + robloxdata.message})
          }
        }
        getRobloxID(message.member.id, execute)
        break;
      case "joinclan":
        function execute(robloxdata) {
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
              message.channel.send({content: "Couldn't find the clan! `" + prefix + "joinclan clanid`"})
            }
          } else {
            message.channel.send({content: "An error has occured: " + robloxdata.message})
          }
        }
        getRobloxID(message.member.id, execute)
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
          message.channel.send({content: "Updated users! (Took " + (timeEnd - timeStart) + "ms)"})
          config.store = clansstore
        } else {
          message.channel.send({content: "Only the dev can use `updateusers`!"})
        }
        break;
      }
  });
  
  console.log(config.size)

  app.use(express.static("public")); //put anything in the public/ folder accessible (for website) (like css, js, etc.)

  //app.get("/", (request, response) => { //listener for get requests (website)
  //  response.sendFile(`${__dirname}/views/index.html`);
  //});
  
  
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
                     var errorMessage = "Invalid change! " + key1
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
            var embed = new Discord.MessageEmbed()
                .setTitle(":loudspeaker: Modcall")
                .setFooter("Skynet Clans • Version " + process.env.VERSION + " • Took " + (timeend - timestart) + "ms")
                //.setImage("https://www.roblox.com/Thumbs/Asset.ashx?assetId=" + clan.clanlogo)
                //.setThumbnail("https://www.roblox.com/Thumbs/Asset.ashx?assetId=" + clan.clanlogo)
                .setTimestamp()
                .setColor(0x660000)
                .setDescription("From: " + gamename)
                //.setURL()
                .addFields(
                  {name: ":name_badge: Reported User", value: "[" + reportedusername + "](https://www.roblox.com/users/" + reporteduserid + "/profile)", inline: true},
                  //{name: ":pencil: `group`", value: groupid, inline: true},
                  {name: ":shield: Reporting User", value: "[" + reportingusername + "](https://www.roblox.com/users/" + reportinguserid + "/profile)", inline: true},
                  {name: ":pager: Report Reason", value: reportreason}
                )
            client.guilds.fetch(discordmodcallserver).then(serverinstance => serverinstance.channels.resolve(discordmodcallchannel).send({content: "<@&941348501151961108>", embeds: [embed]}))
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
    activity: {
      name: "Readying up",
      type: 0
    }
  });
});