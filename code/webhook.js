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

// Send messages
function shareData(data) {
  //console.log("Sent from Webhook")
  process.send(data);
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

var defaultFooter = "Skynet Clans • Version " + process.env.VERSION + " • Hosting on: " + process.env.HOSTING


app.use(express.static("website/public")); //put anything in the public/ folder accessible (for website) (like css, js, etc.)

async function getRobloxAvatarPic(userid, size, type) {
  return new Promise((resolve) => {
    https.get("https://thumbnails.roblox.com/v1/users/" + type + "?userIds=" + userid + "&size=" + size + "x" + size + "&format=Png&isCircular=false", res => {
      let output = '';
      var imageUrl1
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

function getRobloxID(discordID, callback) { //saving this for later
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
  

app.post("/webhook", async(request, response) => {  //since I'm planning this to be semi-public, it'll require authkeys
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
      //if (key == "requestType") {
      //    console.log(value)
      //}
      const payload2 = value.payload
      switch(value.requestType) {
        case "heartbeat":
          makeResponse(true, "",value.id, {})
        break;
        case "moderation":
          var requesttype = payload2.requestType
          switch(requesttype) {
            case "modcall":
              //console.log(payload)       
              var modcallpayload = payload2.payload
              var reporteduser = modcallpayload.reporteduser //the user that as reported
              var reportinguser = modcallpayload.reportinguser //the user that reported
              var reportreason = modcallpayload.reportreason //the reason for reporting
              var game = modcallpayload.game //used to indicate the game
              var jobid = modcallpayload.jobid
              var suspicionpercent = modcallpayload.suspicionpercent
              //var reportdetails = modcallpayload.reportdetails //which mod joined
              var reportingusername
              var reportinguserid
              var reportedusername
              var reporteduserid
              var gamename
              var gamekeyname
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
              
              switch(gamekeyname) {
                case "ACSGroundsV1":
                  gameid = "5223287266"
                break;

                case "ACSTestingPlace":
                  gameid = "6262966584"
                break;

                case "ACSJungle": 
                  gameid = "7120086775"
                break;
              }

              var newEmbed = {
                ["title"]: ":loudspeaker: Modcall",
                ["footer"]: defaultFooter,
                ["image"]: await getRobloxAvatarPic(reporteduserid, 420, "avatar"),
                ["thumbnail"]: await getRobloxAvatarPic(reportinguserid, 150, "avatar-headshot"),
                ["color"]: 0x990000,
                ["description"]: "From: " + gamename,
                ["fields"]: [
                  {name: ":name_badge: Reported User", value: "**[" + reportedusername + "](https://www.roblox.com/users/" + reporteduserid + "/profile)**", inline: true},
                  //{name: ":pencil: `group`", value: groupid, inline: true},
                  {name: ":shield: Reporting User", value: "||[" + reportingusername + "](https://www.roblox.com/users/" + reportinguserid + "/profile)||", inline: true},
                  {name: ":pager: Report Reason", value: reportreason},
                  {name: ":triangular_flag_on_post: Suspicion Meter", value: "**" + suspicionpercent + "%**", inline: true},
                  //{name: ":globe_with_meridians: Translation", value: translatedText},
                  {name: ":link: Join Link 1", value: "[Launch & autojoin (1)](https://www.roblox.com/games/start?placeId=" + gameid + '&launchData={"ReportJobId":"' + jobid + '"})', inline: true},
                  {name: ":link: Join Link 2", value: "[Launch & autojoin (2)](https://www.roblox.com/games/5223287266/ACS-Phoenix-Grounds?serverJobId=" + jobid + ")", inline: true},
                  {name: ":postbox: Server's JobId", value: "`" + jobid + "`"}
                ]
              }
                        
              var dataToSend = [
                  {
                  MessageTo: "discordbot.js",
                  Type: "Embed",
                  Payload: {
                    ServerToSendTo: "719673864111652936",
                    ChannelToSendTo: "908390430863929404",
                    Embed: newEmbed
                  },
                }
              ]

              shareData(dataToSend)
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
                        var gameid
                        
                        for (const [key, value] of Object.entries(game)) {
                          gamename = value
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
                        
                        var timeend = Date.now()
                        
                        var newEmbed = {
                            ["title"]: ":minidisc: Logs",
                            ["footer"]: defaultFooter,
                            ["color"]: 0x006080,
                            ["description"]: "From: " + gamename,
                            ["fields"]: [
                                {name: ":floppy_disk: Commands", value: text},
                                {name: ":postbox: Server's JobId", value: "`" + jobid + "`"},
                            ]
                        }

                        if (brokenLoop != -1) {
                            newEmbed.fields = [
                                {name: ":floppy_disk: Commands", value: text},
                                {name: ":postbox: Server's JobId", value: "`" + jobid + "`"},
                                {name: ":warning: Warning", value: "Not enough embed space for entire command list."}
                            ]
                        }

                        var dataToSend = [
                            {
                              MessageTo: "discordbot.js",
                              Type: "Embed",
                              Payload: {
                                  ServerToSendTo: "719673864111652936",
                                  ChannelToSendTo: "1291314421511094272",
                                  Embed: newEmbed
                              },
                          }
                        ]

                        shareData(dataToSend)
                    break;
                    case "suspicion":
                        var modcallpayload = payload2.payload
                        var reporteduser = modcallpayload.reporteduser //the user that as reported
                        var suspicionpercent = modcallpayload.suspicionpercent
                        var suspiciondetails = modcallpayload.suspiciondetails
                        var game = modcallpayload.game //used to indicate the game
                        var jobid = modcallpayload.jobid
                        //var reportdetails = modcallpayload.reportdetails //which mod joined
                        
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
                        
                        switch(gamekeyname) {
                          case "ACSGroundsV1":
                            gameid = "5223287266"
                          break;

                          case "ACSTestingPlace":
                            gameid = "6262966584"
                          break;

                          case "ACSJungle": 
                            gameid = "7120086775"
                          break;
                        }
                                  
                        var newEmbed = {
                            ["title"]: ":loudspeaker: Suspicion Report",
                            ["footer"]: defaultFooter,
                            ["image"]: await getRobloxAvatarPic(reporteduserid, 420, "avatar"),
                            ["color"]: 0xFE9900,
                            ["description"]: "From: " + gamename,
                            ["fields"]: [
                                 {name: ":name_badge: Suspicious User", value: "**[" + reportedusername + "](https://www.roblox.com/users/" + reporteduserid + "/profile)**", inline: true},
                                //{name: ":pencil: `group`", value: groupid, inline: true},
                                {name: ":pager: Suspicion Details", value: suspiciondetails, inline: false},
                                //{name: ":globe_with_meridians: Translation", value: translatedText},
                                {name: ":triangular_flag_on_post: Suspicion Meter", value: "**" + suspicionpercent + "%**", inline: true},
                                {name: ":link: Join Link 1", value: "[Launch & autojoin (1)](https://www.roblox.com/games/start?placeId=" + gameid + '&launchData={"ReportJobId":"' + jobid + '"})', inline: true},
                                {name: ":link: Join Link 2", value: "[Launch & autojoin (2)](https://www.roblox.com/games/5223287266/ACS-Phoenix-Grounds?serverJobId=" + jobid + ")", inline: true},
                                {name: ":postbox: Server's JobId", value: "`" + jobid + "`"}
                            ]
                        }

                        var dataToSend = [
                            {
                              MessageTo: "discordbot.js",
                              Type: "Embed",
                              Payload: {
                                  ServerToSendTo: "719673864111652936",
                                  ChannelToSendTo: "908390430863929404",
                                  Embed: newEmbed
                              },
                          }
                        ]

                        shareData(dataToSend)
                    break;
                }
            }
        }
        response.send(responseBody).status(200)
    }
); //listener for post requests (webhook)

app.post("/skynetwebhook", async(request, response) => {
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
        //console.log("Error: " + key + " is null, please send the correct value!")
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
      var gamename
      var mobilestatus
      
      if (game == "ACSGroundsV1") {
        channeltosend = "738407389669097492"
        gamename = "ACS Grounds v1.7.7"
      } else if (game == "ACSGroundsV2") {
        channeltosend = "738407389669097492"
        gamename = "ACS Grounds v2.0.1"
      } else if (game == "ACSFiringRange") {
        channeltosend = "738407354013581383"
        gamename = "ACS Firing Range"
      } else if (game == "ACSJungle") {
        channeltosend = "876525691150172161"
        gamename = "ACS Jungle"
      }
      
      if (onmobile == true) {
        mobilestatus = "Yes"
      } else {
        mobilestatus = "No"
      }
      
      var dataToSend = [
        {
          MessageTo: "discordbot.js",
          Type: "Embed",
          Payload: {
            ServerToSendTo: "719673864111652936",
            ChannelToSendTo: channeltosend,
            Embed: {
              ["title"]: "Game",
              ["author"]: displayname + " (" + username + ")",
              ["description"]: gamename,
              ["footer"]: defaultFooter,
              ["thumbnail"]: await getRobloxAvatarPic(userid, 150, "avatar-headshot"),
              ["fields"]: [
                {name: ":speech_balloon: Feedback", value: originalfeedbackmessage},
                //{name: ":globe_with_meridians: Translation", value: translatedText},
                {name: ":mobile_phone: On Mobile?", value: mobilestatus, inline: true},
                {name: ":pager: User ID", value: userid, inline: true},
                {name: ":link: Profile Link", value: "[" + username + "](https://www.roblox.com/users/" + userid + "/profile)", inline: true}
              ]
            }
          },
        },
      ]

      shareData(dataToSend)
    response.status(200).send({
      type: "success",
      message: "Successfully sent feedback!",
    })
  } else {
    response.status(403).send("Forbidden")
  }
  requestCorrect = true
}});

// listen for requests
var listener = app.listen(process.env.PORT, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});

async function openCloudFunction(requestType, requestPath, requestBody, callbackFunction) {
  var requestBodyString = JSON.stringify(requestBody); // Stringify here

  var options = {
    hostname: 'apis.roblox.com',
    port: 443,
    path: requestPath,
    method: requestType,
    headers: {
      'x-api-key': process.env.ROBLOXOPENCLOUD,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestBodyString)
    }
  }

  var req = https.request(options, res => {
    let data = '';

    //console.log('Status: ', res.statusCode);
    //console.log('Headers: ', JSON.stringify(res.headers));

    res.setEncoding('utf8');

    res.on('data', chunk => {
      data += chunk;
    });

    res.on('end', () => {
      var parsedData = null

      try {
        // Try to parse as JSON, but fall back to raw data if it fails
        data = data ? JSON.parse(data) : data;
        //console.log('Response:', parsedData);
      } catch (e) {
        //console.log('Raw Response:', data);
      }

      if (res.statusCode == 200) {
        callbackFunction(true, res.statusCode, data)
        return
      } else {
        //console.log(parsedData)
        callbackFunction(false, res.statusCode, data.code + "; " + data.message)
      return
      }
    });
  }).on('error', e => {
      console.error(e);
      callbackFunction(false, 0, e)
      return
  });
  
  req.write(requestBodyString);
  req.end();
}

async function performOpenCloudViewBan(userId, gameName, callbackFunction) {
  var requestPath = null

  switch(gameName) {
    case "phoenix":
      requestPath = "/cloud/v2/universes/1826628366/user-restrictions/" + userId
    break;

    case "firing":
      requestPath = "/cloud/v2/universes/1810450591/user-restrictions/" + userId
    break;

    case "jungle":
      requestPath = "/cloud/v2/universes/2756038974/user-restrictions/" + userId
    break;
  }

  if (requestPath == null) {
    //console.log("No request path was defined. Stopping request")
    callbackFunction(false, 0, "Code error or arguements weren't supplied. No request path was defined. Make sure you spelled the gameName correctly")
    return
  }

  openCloudFunction("GET", requestPath, {}, callbackFunction)
}

async function performOpenCloudBan(userId, gameName, banType, banReason, issuedBy, callbackFunction) {
  var requestPath = null
  var duration = null
  
  switch(gameName) {
    case "phoenix":
      requestPath = "/cloud/v2/universes/1826628366/user-restrictions/" + userId
    break;

    case "firing":
      requestPath = "/cloud/v2/universes/1810450591/user-restrictions/" + userId
    break;

    case "jungle":
      requestPath = "/cloud/v2/universes/2756038974/user-restrictions/" + userId
    break;
  }
  
  if (requestPath == null) {
    //console.log("No request path was defined. Stopping request")
    callbackFunction(false, 0, "Code error or arguements weren't supplied. No request path was defined.")
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
      "privateReason": "Performed on Open Cloud. Issued by: " + issuedBy,
      "displayReason": banReason,
      "excludeAltAccounts": false
    }
  }
  openCloudFunction("PATCH", requestPath, requestBody, callbackFunction)
}

// Receive messages
async function handleSharedData(data) {
  //console.log(data)
  //console.log(MessageListeners)
    if (!(MessageListeners[data.Type] == null || MessageListeners[data.Type] == undefined)) {
        MessageListeners[data.Type].forEach((value, index) => {
            //console.log(value)
            value(data)
        });
    }

    if (data.MessageTo == "webhook.js") {
      //console.log("Recieved something on webhook")
      var timestart = Date.now()
      switch(data.Type) {
        case "OpenCloudBan":
          var userId = data.Payload.Arguements[0]
          var gameName = data.Payload.Arguements[1]
          var banType = data.Payload.Arguements[2]
          var banReason = data.Payload.Arguements[3]
          var issuedBy = data.Payload.Arguements[4]
          var originalChannelId = data.Payload.OriginalChannelId

          await performOpenCloudBan(userId, gameName, banType, banReason, issuedBy, async(result, statusCode, errorMsg) => {
            //console.log(result, statusCode, errorMsg)

            var timeend = Date.now()
            //console.log(timestart, timeend)
            if (result) {
              //working
              var dataToSend = [
                {
                  MessageTo: "discordbot.js",
                  Type: "Embed",
                  Payload: {
                    ServerToSendTo: "719673864111652936",
                    ChannelToSendTo: "1291040473242271886",
                    Embed: {
                      ["title"]: ":hammer: Ban - `" + gameName + "`",
                      ["footer"]: defaultFooter + " • Took " + (timeend - timestart) + "ms",
                      ["thumbnail"]: await getRobloxAvatarPic(userId, 150, "avatar-headshot"),
                      ["color"]: 0x600000,
                      ["fields"]: [
                        {name: ":warning: Open Cloud Ban - Issued by " + issuedBy, value: "- Ban reason: `" + banReason + "`"},
                        {name: ":name_badge: Banned User", value: "**[" + userId + "](https://www.roblox.com/users/" + userId + "/profile)**", inline: true},
                        {name: ":pager: Duration", value: banType, inline: true},
                      ]
                    }
                  },
                },
                {
                  MessageTo: "discordbot.js",
                  Type: "Message",
                  Payload: {
                    ServerToSendTo: "719673864111652936",
                    ChannelToSendTo: originalChannelId,
                    Message: ":white_check_mark: Successfully sent Open Cloud Ban to ROBLOX!"
                  },
                },
              ]

              shareData(dataToSend)
            } else {
              //errored
              var dataToSend = [
                  {
                  MessageTo: "discordbot.js",
                  Type: "Embed",
                  Payload: {
                    ServerToSendTo: "719673864111652936",
                    ChannelToSendTo: originalChannelId,
                    Embed: {
                      ["title"]: ":no_entry: Error while performing Open Cloud Ban",
                      ["footer"]: defaultFooter + " • Took " + (timeend - timestart) + "ms",
                      ["color"]: 0x600000,
                      ["fields"]: [
                        {name: ":pager: Status Code:", value: statusCode},
                        {name: ":bangbang: Error Message:", value: "`" + errorMsg + "`"}
                      ]
                    }
                  },
                }
              ]

              shareData(dataToSend)
            }
          })
        break;

        case "OpenCloudViewBan":
          var userId = data.Payload.Arguements[0]
          var gameName = data.Payload.Arguements[1]
          var originalChannelId = data.Payload.OriginalChannelId

          await performOpenCloudViewBan(userId, gameName, async(result, statusCode, errorMsg) => {
            //console.log(errorMsg)
            //console.log(result, statusCode, errorMsg)
            var isBanned
            var privateBanReason
            var publicBanReason
            var areAltAccountsExcluded
            var isBanInherited
            var startTime
            var duration

            if (!(errorMsg.gameJoinRestriction == undefined || errorMsg.gameJoinRestriction == null)) {
              isBanned = errorMsg.gameJoinRestriction.active
              privateBanReason = errorMsg.gameJoinRestriction.privateReason
              publicBanReason = errorMsg.gameJoinRestriction.displayReason
              areAltAccountsExcluded = errorMsg.gameJoinRestriction.excludeAltAccounts
              isBanInherited = errorMsg.gameJoinRestriction.inherited
              startTime = errorMsg.gameJoinRestriction.startTime
              duration = errorMsg.gameJoinRestriction.duration
            } else {
              isBanned = false
            }

            if (duration == undefined || duration == null) {
              duration = "Permanent"
            }
            var timeend = Date.now()
            //console.log(timestart, timeend)
            if (result) {
              //working
              var embed = null

              //console.log(isBanned)

              if (isBanned == true) {
                embed = {
                  ["title"]: ":pager: View Ban - `" + gameName + "`",
                  ["footer"]: defaultFooter + " • Took " + (timeend - timestart) + "ms",
                  ["thumbnail"]: await getRobloxAvatarPic(userId, 150, "avatar-headshot"),
                  ["color"]: 0x600000,
                  ["fields"]: [
                    {name: ":identification_card: User", value: "**[" + userId + "](https://www.roblox.com/users/" + userId + "/profile)**", inline: true},
                    {name: ":name_badge: Currently banned?", value: isBanned, inline: true},
                    {name: ":clock3: Banned at:", value: "`" + startTime + "`", inline: true},
                    {name: ":clock3: Duration", value: duration, inline: true},
                    {name: ":pager: Alt accounts excluded from ban?", value: areAltAccountsExcluded, inline: true},
                    {name: ":pager: Is ban inherited?", value: isBanInherited + " (aka is this an alt ban?)", inline: true},
                    {name: ":hammer: Public Ban Reason", value: "`" + publicBanReason + "`"},
                    {name: ":hammer: Private Ban Reason", value: "||`" + privateBanReason + "`||"},
                  ]
                }
              } else {
                embed = {
                  ["title"]: ":pager: View Ban - `" + gameName + "`",
                  ["footer"]: defaultFooter + " • Took " + (timeend - timestart) + "ms",
                  ["thumbnail"]: await getRobloxAvatarPic(userId, 150, "avatar-headshot"),
                  ["color"]: 0x002060,
                  ["fields"]: [
                    {name: ":identification_card: User", value: "**[" + userId + "](https://www.roblox.com/users/" + userId + "/profile)**", inline: true},
                    {name: ":name_badge: Currently banned?", value: isBanned, inline: true},
                  ]
                }
              }

              var dataToSend = [
                {
                  MessageTo: "discordbot.js",
                  Type: "Embed",
                  Payload: {
                    ServerToSendTo: "719673864111652936",
                    ChannelToSendTo: originalChannelId,
                    Embed: embed
                  },
                }
              ]

              shareData(dataToSend)
            } else {
              //errored
              var dataToSend = [
                  {
                  MessageTo: "discordbot.js",
                  Type: "Embed",
                  Payload: {
                    ServerToSendTo: "719673864111652936",
                    ChannelToSendTo: originalChannelId,
                    Embed: {
                      ["title"]: ":no_entry: Error while performing Open Cloud Ban",
                      ["footer"]: defaultFooter + " • Took " + (timeend - timestart) + "ms",
                      ["color"]: 0x600000,
                      ["fields"]: [
                        {name: ":pager: Status Code:", value: statusCode},
                        {name: ":bangbang: Error Message:", value: "`" + errorMsg + "`"}
                      ]
                    }
                  },
                }
              ]

              shareData(dataToSend)
            }
          })
        break;

        case "Ping":
          var dataToSend = [
            {
              MessageTo: "discordbot.js",
              Type: "Pong",
            }
          ]

          shareData(dataToSend)
        break;
      }
    }
}

process.on('message', (data) => {
    //console.log("Received on Webhook")
    handleSharedData(data)
});