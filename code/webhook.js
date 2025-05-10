//webhook handling for roblox
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const https = require("https")
const express = require("express");
const bodyParser = require("body-parser");
const app = express();

app.disable('x-powered-by'); //safety
app.use(bodyParser.urlencoded({ extended: true })); //to be able to parse the requests' bodies
app.use(bodyParser.json());

app.use(express.static("website/public")); //put anything in the public/ folder accessible (for website) (like css, js, etc.)

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
            var jobid = modcallpayload.jobid
            var suspicionpercent = modcallpayload.suspicionpercent
            //var reportdetails = modcallpayload.reportdetails //which mod joined
            var discordmodcallserver = "719673864111652936"
            var discordmodcallchannel = "908390430863929404"
            
            var reportingusername
            var reportinguserid
            var reportedusername
            var reporteduserid
            var gamename
            var gamekeyname
            var gamelink
            var gameid
            
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
            
            if (gamekeyname === "ACSGroundsV1") {
              gameid = "5223287266"
            }
            if (gamekeyname === "ACSTestingPlace") {
              gameid = "6262966584"
            }
            
            var timeend = Date.now()
          
        
            async function sendTheReport() {
              var imageUrl1 = await getImageUrl1(reporteduserid)
              var imageUrl2 = await getImageUrl2(reportinguserid)
              //console.log(imageUrl1, imageUrl2)
              var embed = new EmbedBuilder()
                  .setTitle(":loudspeaker: Modcall")
                  .setFooter("Skynet Clans • Version " + process.env.VERSION + " • Took " + (timeend - timestart) + "ms")
                  .setTimestamp()
                  .setImage(imageUrl1)
                  .setThumbnail(imageUrl2)
                  .setColor(0x990000)
                  .setDescription("From: " + gamename)
                  //.setURL()
                  .addFields(
                    {name: ":name_badge: Reported User", value: "**[" + reportedusername + "](https://www.roblox.com/users/" + reporteduserid + "/profile)**", inline: true},
                    //{name: ":pencil: `group`", value: groupid, inline: true},
                    {name: ":shield: Reporting User", value: "||[" + reportingusername + "](https://www.roblox.com/users/" + reportinguserid + "/profile)||", inline: true},
                    {name: ":pager: Report Reason", value: reportreason},
                    {name: ":triangular_flag_on_post: Suspicion Meter", value: "**" + suspicionpercent + "%**", inline: true},
                    //{name: ":globe_with_meridians: Translation", value: translatedText},
                    {name: ":link: Join Link 1", value: "[Launch & autojoin (1)](https://www.roblox.com/games/start?placeId=" + gameid + '&launchData={"ReportJobId":"' + jobid + '"})', inline: true},
                    {name: ":link: Join Link 2", value: "[Launch & autojoin (2)](https://www.roblox.com/games/5223287266/ACS-Phoenix-Grounds?serverJobId=" + jobid + ")", inline: true},
                    {name: ":postbox: Server's JobId", value: "`" + jobid + "`"}
                  )
              client.guilds.fetch(discordmodcallserver).then(serverinstance => serverinstance.channels.resolve(discordmodcallchannel).send("<@&941348501151961108>",embed))
              makeResponse(true, "",value.id, {})
            }
            function sendTheThingy() {
              if (botOnline) {
                sendTheReport()
              } else {
                setTimeout(sendTheThingy, 1000)
              }
            }
            
            sendTheThingy()
          break;
          case "logging":
            var timestart = Date.now()
            var modcallpayload = payload2.payload
            var game = modcallpayload.game //used to indicate the game
            var commands = modcallpayload.commands
            var jobid = modcallpayload.jobid
            //var reportdetails = modcallpayload.reportdetails //which mod joined
            var discordmodcallserver = "719673864111652936"
            var discordmodcallchannel = "1291314421511094272"
            
            var text = ""
            var gamename
            var gamekeyname
            var gamelink
            var gameid
            
            for (const [key, value] of Object.entries(game)) {
              gamename = value
              gamekeyname = key
            }
            
            var brokenLoop = -1
            for (const [key, value] of Object.entries(commands)) {
              var tempText = text + "**[" +  value[0] + "]** " + value[1] + "\n"
              if (tempText.length > 1024) {
                brokenLoop = key
                break;
              } else {
                text = tempText
              }
            }
            
            //if (brokenLoop != -1) {
              
            //}
            
            switch(gamekeyname) {
              case "ACSGroundsV1":
                gameid = "5223287266"
                gamelink = "https://www.roblox.com/games/5223287266/ACS-Phoenix-Grounds"
              break;
              case "ACSTestingPlace":
                gameid = "6262966584"
                gamelink = "https://www.roblox.com/games/6262966584/ACS-Testing-Place"
              break;
              case "ACSFiringRangeV1":
                gameid = "5187794761"
                gamelink = "https://www.roblox.com/games/5187794761/ACS-CQB-Firing-Range"
              break;
            }
            
            var timeend = Date.now()
            
            async function sendLogs() {
              //console.log(imageUrl1, imageUrl2)
              var embed = new EmbedBuilder()
                  .setTitle(":minidisc: Logs")
                  .setFooter("Skynet Clans • Version " + process.env.VERSION + " • Took " + (timeend - timestart) + "ms")
                  .setTimestamp()
                  .setColor(0x006080)
                  .setDescription("From: " + gamename)
                  //.setURL()
                  .addFields(
                    {name: ":floppy_disk: Commands", value: text},
                    //{name: ":pencil: `group`", value: groupid, inline: true},
                    //{name: ":shield: Reporting User", value: "[" + reportingusername + "](https://www.roblox.com/users/" + reportinguserid + "/profile)", inline: true},
                    //{name: ":pager: Report Reason", value: reportreason},
                    //{name: ":triangular_flag_on_post: Suspicion Meter", value: "**" + suspicionpercent + "%**", inline: true},
                    //{name: ":globe_with_meridians: Translation", value: translatedText},
                    //{name: ":link: Join Link 1", value: "[Launch & autojoin (1)](https://www.roblox.com/games/start?placeId=" + gameid + '&launchData={"ReportJobId":"' + jobid + '"})', inline: true},
                    //{name: ":link: Join Link 2", value: "[Launch & autojoin (2)](" + gamelink + "?serverJobId=" + jobid + ")", inline: true},
                    {name: ":postbox: Server's JobId", value: "`" + jobid + "`"}
                  )
              if (brokenLoop != -1) {
                embed.addFields(
                  {name: ":warning: Warning", value: "Not enough embed space for entire command list."}
                )
              }
              client.guilds.fetch(discordmodcallserver).then(serverinstance => serverinstance.channels.resolve(discordmodcallchannel).send(embed))
              makeResponse(true, "",value.id, {})
            }
            function sendTheThingy2() {
              if (botOnline) {
                sendLogs()
              } else {
                setTimeout(sendTheThingy2, 1000)
              }
            }
            
            sendTheThingy2()
          break;
          case "suspicion":
            var timestart = Date.now()
            var modcallpayload = payload2.payload
            var reporteduser = modcallpayload.reporteduser //the user that as reported
            var suspicionpercent = modcallpayload.suspicionpercent
            var suspiciondetails = modcallpayload.suspiciondetails
            var game = modcallpayload.game //used to indicate the game
            var jobid = modcallpayload.jobid
            //var reportdetails = modcallpayload.reportdetails //which mod joined
            var discordmodcallserver = "719673864111652936"
            var discordmodcallchannel = "908390430863929404"
            
            var reportedusername
            var reporteduserid
            var gamename
            var gamekeyname
            var gamelink
            var gameid
            
            
            for (const [key, value] of Object.entries(reporteduser)) {
              reportedusername = value
              reporteduserid = key
            }
            
            for (const [key, value] of Object.entries(game)) {
              gamename = value
              gamekeyname = key
            }
            
            if (gamekeyname === "ACSGroundsV1") {
              gameid = "5223287266"
            }
            if (gamekeyname === "ACSTestingPlace") {
              gameid = "6262966584"
            }
            
            var timeend = Date.now()
                        
            async function sendSuspicion() {
              var imageUrl1 = await getImageUrl1(reporteduserid)
             
              //console.log(imageUrl1, imageUrl2)
              var embed = new EmbedBuilder()
                  .setTitle(":loudspeaker: Suspicion Report")
                  .setFooter("Skynet Clans • Version " + process.env.VERSION + " • Took " + (timeend - timestart) + "ms")
                  .setImage(imageUrl1)
                  //.setThumbnail(imageUrl2)
                  .setTimestamp()
                  .setColor(0xFE9900)
                  .setDescription("From: " + gamename)
                  //.setURL()
                  .addFields(
                    {name: ":name_badge: Suspicious User", value: "**[" + reportedusername + "](https://www.roblox.com/users/" + reporteduserid + "/profile)**", inline: true},
                    //{name: ":pencil: `group`", value: groupid, inline: true},
                    {name: ":pager: Suspicion Details", value: suspiciondetails, inline: false},
                    //{name: ":globe_with_meridians: Translation", value: translatedText},
                    {name: ":triangular_flag_on_post: Suspicion Meter", value: "**" + suspicionpercent + "%**", inline: true},
                    {name: ":link: Join Link 1", value: "[Launch & autojoin (1)](https://www.roblox.com/games/start?placeId=" + gameid + '&launchData={"ReportJobId":"' + jobid + '"})', inline: true},
                    {name: ":link: Join Link 2", value: "[Launch & autojoin (2)](https://www.roblox.com/games/5223287266/ACS-Phoenix-Grounds?serverJobId=" + jobid + ")", inline: true},
                    {name: ":postbox: Server's JobId", value: "`" + jobid + "`"}
                  )
              client.guilds.fetch(discordmodcallserver).then(serverinstance => serverinstance.channels.resolve(discordmodcallchannel).send("<@&941348501151961108>",embed))
              makeResponse(true, "",value.id, {})
            }
            
            function sendTheThingy3() {
              if (botOnline) {
                sendSuspicion()
              } else {
                setTimeout(sendTheThingy3, 1000)
              }
            }
            
            sendTheThingy3()
          break;
        }
        break;
      }
    }
  response.send(responseBody).status(200)
}); //listener for post requests (webhook)

app.post("/skynetwebhook", (request, response) => {
  var body = request.body
  if (body.requesttype == "Feedback") {
    var avatarpic = body.avatarurl
    var username = body.username
    var displayname = body.displayname
    var userid = body.userid
    var originalfeedbackmessage = body.originalfeedbackmessage
    var game = body.game
    var onmobile = body.onmobile
    var requestCorrect = true
    for (var [key, value] of Object.entries(body)) {
      if ((key !== "feedbackmessage" || key !== "originalfeedbackmessage") && value == null) {
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
      
      async function sendTheFeedback() {
        var embed = new EmbedBuilder()
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
            {name: ":speech_balloon: Feedback", value: originalfeedbackmessage},
            //{name: ":globe_with_meridians: Translation", value: translatedText},
            {name: ":mobile_phone: On Mobile?", value: mobilestatus, inline: true},
            {name: ":pager: User ID", value: userid, inline: true},
            {name: ":link: Profile Link", value: "[" + username + "](https://www.roblox.com/users/" + userid + "/profile)", inline: true}
          )
      
        client.guilds.fetch("719673864111652936").then(
          serverinstance => serverinstance.channels.resolve(channeltosend).send({embed}).catch(console.error));
      //setTimeout(function(){
        //client.guilds.fetch("864110943570100254").then(
          //serverinstance => serverinstance.channels.resolve(logchanneltosend).send({embed}).catch(console.error))
      //}, 1000);
        response.status(200).send({
            type: "success",
            message: "Successfully sent feedback!",
          })
        }
        sendTheFeedback()
      }
  } else {
    response.status(403).send("Forbidden")
  }
  requestCorrect = true
});

// listen for requests
var listener = app.listen(process.env.PORT, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});

// Receive messages
process.on('message', (data) => {
  console.log('Received shared data:', data);
});

// Send messages
function shareData(data) {
  process.send(data);
}

shareData("hello")