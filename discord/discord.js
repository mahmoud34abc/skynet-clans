function discord() {
  const Discord = require("discord.js");
  const client = new Discord.Client();
  const https = require("https")
  const Conf = require("conf");
  const Cache = require("cache");
  const robloxuserstore = new Cache(12*60*60*1000)
  const config = new Conf();
  const util = require("util")
  const prefix = "c!";
  
  function isDict(o) {
    var string = JSON.stringify(o);
    return string.startsWith("{") && string.endsWith("}")
  }
  
  function getRobloxID(discordID, callback) {
    
    var playerid = robloxuserstore.get(discordID)
    if (playerid !== undefined && playerid !== null) {
      callback({error: false,
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
            callback({error: false,
                      id: body.primaryAccount})
          } else {
            callback({error: true,
                      message: body.error})
          }
        });
      })
      req.on('error', error => {
        console.error(error)
        callback({error: true,
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
  
    const cleanseString = function(string) { //used to make clan IDs
    while (/\s+$/.test(string)) {
      var str = string.substring(0, string.length - 1);
      string = str;
    }

    str = string
      .replace(/\s+/g, "-")
      .replace(/\W+/g, "-")
      .toLowerCase();
    str = str.replace(/-\s*$/, "");

    return str;
  };
  
  const makeClanID = function(str) {
    var name = cleanseString(str);
    var randomnumber = Math.floor(Math.random() * 8999 + 1000);
    return name + "-" + randomnumber;
  }

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
          if (config.has(args[1])) {
            config.delete(args[1])
            message.channel.send("Clan deleted")
          } else {
            message.channel.send("Couldn't find the clan to delete!")
          }
        } else {
          message.channel.send("Only the dev can use `deleteclan`!")
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
            
            message.channel.send({embed})
          } else {
            message.channel.send("No clans found for search query '" + args[1] + "'!")
          }
        }
        break;
      case "clan": //search for clan and send it's data in an embed
        var clan
        getRobloxID(message.member.id, function(outputjson) {
          if (args[1] === undefined && outputjson.error === false) {
            if (config.has(outputjson.id)) {
              var clanid = config.get(outputjson.id)
              if (config.has(clanid)) {
                clan = config.get(clanid)
              }
            }
          } else if (config.has(args[1])) {
            clan = config.get(args[1])
          }
          
          
          if (clan === undefined) {
            message.channel.send("Couldn't find clan!")
            return
          }
          if (clan !== undefined && isDict(clan) && clan.type == "clan") {
          
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
              if (membersintext === "") {
                membersintext = membersintext + value
              } else {
                membersintext = value + "\n" + membersintext
              }
            }
          
            //clan uniforms
            for (const [key] of Object.entries(clan.clanuniforms)) {
              if (uniformsintext === "") {
                uniformsintext = uniformsintext + key
              } else {
                uniformsintext = uniformsintext + "\n" + key
              }
            }
            //clan allies
            for (const [_4, value] of Object.entries(clan.clanallies)) {
              if (clanalliesintext === "") {
                clanalliesintext = clanalliesintext + value
              } else {
                clanalliesintext = value + "\n" + clanalliesintext
              }
            }
            
            //clan enemies
            for (const [_5, value] of Object.entries(clan.clanenemies)) {
              if (clanenemiesintext === "") {
                clanenemiesintext = clanenemiesintext + value
              } else {
                clanenemiesintext = value + "\n" + clanenemiesintext
              }
            }
        
            //clan owner
            for (const [key, value] of Object.entries(clan.clanowner)) {
              userid = key
              if (value !== "") {
                username = value
              }
            }
          
            //clan group
            for (var [key, value] of Object.entries(clan.clangroup)) {
              groupid = key
              if (value !== "") {
                groupName = value
              }
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
              .setThumbnail("https://www.roblox.com/Thumbs/Asset.ashx?assetId=" + clan.clanlogo)
              .setTimestamp()
              //.setURL()
              .addFields(
                {name: ":pager: Description", value: clanactivity(clan, true) + clan.clandescription},
                {name: ":moneybag: Clan Credit", value: clancreditintext, inline: true},
                {name: ":elevator: Members", value: membersintext, inline: true},
                {name: ":martial_arts_uniform: Uniform Names", value: uniformsintext, inline: true},
                {name: ":radio: Group", value: "[" + groupName + "](https://www.roblox.com/groups/" + groupid + "/" + cleanseString(groupName) + "#!/about)", inline: true},
                {name: ":shield: Clan Allies", value: clanalliesintext, inline: true},
                {name: ":crossed_swords: Clan Enemies", value: clanenemiesintext, inline: true}
              )
            
            message.channel.send({embed})
          }
        })
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
        var memberid = message.author.id
        var stage = 0
        var arguement1
        var arguement2
        var arguement3
        var clanname
        var clanid
        var description
        var logo
        var execute = function(robloxid) {
          if (robloxid.error === false) {
           if (config.has(robloxid.id)) {
             message.channel.send(":warning: You already have or in a clan!")
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
                message.channel.send(embed2)
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
        
        getRobloxID(message.member.id, execute)
        break;
      case "editclan":
        var execute = function(robloxdata) {
          if (robloxdata.error === false) {
            if (config.has(robloxdata.id) && config.has(config.get(robloxdata.id))) {
              var clan = config.get(config.get(robloxdata.id))
              var groupid, userid
              for (const [key, value] of Object.entries(clan.clanowner)) {
                userid = key
              }
              for (var [key, value] of Object.entries(clan.clangroup)) {
                groupid = key
              }
              
              if (userid === robloxdata.id) {
                if (args[1] === undefined) {
                  if (groupid === undefined) {
                    groupid = "None"
                  }
                  if (clan.clanstatus === "" || clan.clanstatus === undefined) {
                    clan.clanstatus = "Not selected"
                  }
                  if (clan.clanlogo === "" || clan.clanlogo === undefined) {
                    clan.clanlogo = "Not set"
                  }
                  if (clan.clandescription === "" || clan.clandescription === undefined) {
                    clan.clandescription = "Not set"
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
                    {name: ":pencil: `description`", value: clan.clandescription},
                    //{name: ":pencil: `group`", value: groupid, inline: true},
                    {name: ":pencil: `icon`", value: clan.clanlogo, inline: true},
                    {name: ":pencil: `joinMode`", value: clan.clanstatus, inline: true}
                  )
                  
                  message.channel.send("*Any field with a :pencil: can be edited! `c!editclan property value`",editembed)
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
                  }
                  if (clan !== config.get(clan.clanid)) {
                    clan.clanactivity = "online"
                    config.set(clan.clanid, clan)
                  }
                } else {
                  message.channel.send("Invalid property choice! Please check again")
                }
              } else {
                message.channel.send("You don't have permission to change the clan data!")
              }
            }
          } else {
            message.channel.send("An error has occured: " + robloxdata.message)
          }
        }
        getRobloxID(message.member.id, execute)
        break;
      case "joinclan":
        var execute = function(robloxdata) {
          if (robloxdata.error === false) {
            var playerid = robloxdata.id
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
        getRobloxID(message.member.id, execute)
        break;
      }
  });
  
  console.log(config.size)
  client.login(process.env.TOKEN); //login as bot
}


module.exports = discord; //export as module (so server.js can use it)