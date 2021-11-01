function discord() {
  const Discord = require("discord.js");
  const client = new Discord.Client();
  const https = require('https')
  const Conf = require("conf");
  const config = new Conf();
  const prefix = "c!";
  var time = new Date();
  function isDict(o) {
    var string = JSON.stringify(o);
    return string.startsWith("{") && string.endsWith("}")
  }
  const blankJson = {
    "type": "clan",
    "clanname": "",
    "clanid": "",
    "clanlogo": "",
    "clanowner": {},
    "clancredit": 0,
    "clanuniforms": {},
    "clanmembers": {},
    "clanallies": {},
    "clanenemies": {},
    "clanserver": "",
    "clangroup": {},
    "clandescription": "",
    "clantag": "",
    "clanjoin": "",
    "clannotification": "",
    "clanstatus": ""
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
      status: "online",
      activity: {
        name: "Coming Soon",
        type: 0
      }
    });
  });

  client.on("message", message => { //basic command processor
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
      //case "verify":
      //  if (args[1] === undefined || args[1] === "") {
      //    const embed = new Discord.MessageEmbed()
      //      .setTitle("Verify to unlock extra commands")
      //      //.setAuthor("Search query for '" + args[1] + "'")
      //      //.setColor()
      //      .setDescription("Verifying is seamless, and allows you to use:\n`clan` command without a clan id to get the data of the clan you're in! (More coming soon!)\n\nTo verify, run the verify command again with a number of one of the roblox verification bots you use for verifying.")
      //      .setFooter("Skynet Clans • Version " + process.env.VERSION)
      //      //.setImage("http://i.imgur.com/yVpymuV.png")
      //      //.setThumbnail(avatarpic)
      //      .addFields(
      //          {name: ":pager: Available Services", value: ":one: - Bloxlink"})
      //      .setTimestamp()
      //      //.setURL()
      //    
      //    message.channel.send({embed})
      //  } else {
      //    switch(args[1]) {
      //      case "1":
      //        var options = {
      //          hostname: 'api.blox.link',
      //          port: 443,
      //          path: '/v1/user/' + message.member.id,
      //          method: 'GET'
      //        }
      //        var req = https.request(options, res => {
      //          //console.log(`statusCode: ${res.statusCode}`)
      //          res.setEncoding('utf8');
      //          res.on('data', function (chunk) {
      //             var body = JSON.parse(chunk)
      //             if (body.status === "ok") {
      //               message.channel.send("Your account's id is " + body.primaryAccount + "!")
      //             } else {
      //                message.channel.send("An error occured: " + body.error)
      //              }
      //            });
      //          })
      //          req.on('error', error => {
      //            console.error(error)
      //            message.channel.send("An error occured while retrieving data: " + error)
      //          })
      //        
      //          req.end()
      //        break;
      //      default:
      //        message.channel.send("Invalid choice!")
      //        break;
      //    }
      //  }
      //  break;
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
          
          for (const [undefined, value] of Object.entries(clans)) {
            if (value.type == "clan") {
              var str = value.clanname
              var result = str.toLowerCase().search(args[1])
              if (result !== -1) {
                foundaclan = true
                foundnumber = foundnumber + 1
                console.log("Clan found: " + value.clanname)
                var claninfo = value.clanname + " `" + value.clanid + "`"
                if (foundclans === "") {
                  foundclans = foundclans + claninfo
                } else {
                  foundclans = claninfo + "\n" + foundclans
                }
              }
            }
          }
          
          if (foundaclan) {
            const embed = new Discord.MessageEmbed()
              .setTitle("Found " + foundnumber + " clan(s)")
              .setAuthor("Search query for '" + args[1] + "'")
              //.setColor()
              .setDescription(foundclans)
              .setFooter("Skynet Clans • Version " + process.env.VERSION)
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
        if (config.has(args[1])) {
          const clan = config.get(args[1])
          if (clan.type == "clan") {
          
            var membersintext = ""
            var uniformsintext = ""
            var clanalliesintext = ""
            var clanenemiesintext = ""
            function clanstatus() {
              switch(clan.clanstatus) {
                case "public":
                  return ":unlock:"
                case "inviteonly":
                  return ":closed_lock_with_key:"
                case "grouponly":
                  return ":lock_with_ink_pen:"
                default:
                  return ":grey_question:"
              }
            }
            var username = ""
            var userid = ""
            var groupName = ""
            var groupid = ""
          
            //processing into text
            //clan members
            for (const [undefined, value] of Object.entries(clan.clanmembers)) {
              if (membersintext === "") {
                membersintext = membersintext + value
              } else {
                membersintext = value + "\n" + membersintext
              }
            }
          
            //clan uniforms
            for (const [key, undefined] of Object.entries(clan.clanuniforms)) {
              if (uniformsintext === "") {
                uniformsintext = uniformsintext + key
              } else {
                uniformsintext = uniformsintext + "\n" + key
              }
            }
            //clan allies
            for (const [undefined, value] of Object.entries(clan.clanallies)) {
              if (clanalliesintext === "") {
                clanalliesintext = clanalliesintext + value
              } else {
                clanalliesintext = value + "\n" + clanalliesintext
              }
            }
          
            //clan enemies
            for (const [undefined, value] of Object.entries(clan.clanenemies)) {
              if (clanenemiesintext === "") {
                clanenemiesintext = clanenemiesintext + value
              } else {
                clanenemiesintext = value + "\n" + clanenemiesintext
              }
            }
          
            //clan owner
            for (const [key, value] of Object.entries(clan.clanowner)) {
              userid = key
              username = value
            }
            
            //clan group
            for (const [key, value] of Object.entries(clan.clangroup)) {
              groupid = key
              groupName = value
            }
            
            var clancreditintext = clan.clancredit
            uniformsintext = "None"
            membersintext = "None"
            clanalliesintext = "None"
            clanenemiesintext = "None"
            username = "a roblox player"
            
            const embed = new Discord.MessageEmbed()
              .setTitle(clanstatus() + " " + clan.clanname)
              .setAuthor("Clan Info")
              //.setColor()
              .setDescription("Owned by [" + username + "](https://www.roblox.com/users/" + userid + "/profile)")
              .setFooter("Skynet Clans • Version " + process.env.VERSION)
              //.setImage("https://www.roblox.com/Thumbs/Asset.ashx?assetId=" + clan.clanlogo)
              .setThumbnail("https://www.roblox.com/Thumbs/Asset.ashx?assetId=" + clan.clanlogo)
              .setTimestamp()
              //.setURL()
              .addFields(
                {name: ":pager: Description", value: clan.clandescription},
                {name: ":moneybag: Clan Credit", value: clancreditintext, inline: true},
                {name: ":elevator: Members", value: membersintext, inline: true},
                {name: ":martial_arts_uniform: Uniform Names", value: uniformsintext, inline: true},
                {name: ":radio: Group", value: "[" + groupName + "](https://www.roblox.com/groups/" + groupid + "/" + cleanseString(groupName) + "#!/about)", inline: true},
                {name: ":shield: Clan Allies", value: clanalliesintext, inline: true},
                {name: ":crossed_swords: Clan Enemies", value: clanenemiesintext, inline: true}
              )
            
            message.channel.send({embed})
          }
        } else {
          message.channel.send("Invalid Clan ID!")
        }
        break;
      case "updateclans":
         if (message.author.id == 307112794229047296 ||
            message.author.id == 388776379824603138 ||
            message.author.id == 705207812526964757) {
          var timeStart = time.getTime();
          var clansstore = config.store
          for (const [key, value] of Object.entries(clansstore)) {
            if (isDict(value) && ("type" in value) && value.type === "clan") {
              console.log("passed", key)
              for (const [key2, value2] of Object.entries(blankJson)) {
                if ((key2 in value) === false) {
                  console.log("adding")
                  clansstore[key][key2] = value2
                }
              }
            }
          }
          var timeEnd = time.getTime();
          message.channel.send("Updated clans! (Took " + (timeEnd - timeStart) + "ms)")
          config.store = clans
        } else {
          message.channel.send("Only the dev can use `restart`!")
        }
        break;
      case "printclandata":
        console.log(config.store)
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
        var options = {
          hostname: 'api.blox.link',
          port: 443,
          path: '/v1/user/' + memberid,
          method: 'GET'
        }
        const execute = function(robloxid) {
           if (config.has(robloxid)) {
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
                    {name: ":frame_photo: Description", value: "Paste a `rbxassetid://id` logo for your clan! (optional, type `skip` to leave empty) (can be changed later) (send it as a normal message)"}
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
                  newclan.clanowner[robloxid] = ""
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
        }
        var req = https.request(options, res => {
        //console.log(`statusCode: ${res.statusCode}`)
          res.setEncoding('utf8');
          res.on('data', function (chunk) {
            var body = JSON.parse(chunk)
            if (body.status === "ok") {
              var robloxid = body.primaryAccount
              execute(robloxid)
            } else {
              message.channel.send("An error occured: " + body.error)
            }
          });
        })
        
        req.on('error', error => {
          console.error(error)
          message.channel.send("An error occured while retrieving roblox data: " + error)
        })
        

        
        req.end()
        break
    }
  });
  
  
  client.login(process.env.TOKEN); //login as bot
}


module.exports = discord; //export as module (so server.js can use it)
