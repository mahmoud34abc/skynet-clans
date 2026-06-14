//webhook handling for roblox
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const https = require("https")
const express = require("express");
const bodyParser = require("body-parser");
const querystring = require('querystring');
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


var defaultFooter = "Skynet Clans • Version " + process.env.VERSION + " • Hosting on: " + process.env.HOSTING


app.use(express.static("website/public")); //put anything in the public/ folder accessible (for website) (like css, js, etc.)

const commonOpenCloudHeaders = {
  'x-api-key': process.env.ROBLOXOPENCLOUD,
  'Content-Type': 'application/json',
}

var commonWebRequestOptions = {
  hostname: "apis.roblox.com",
  port: 443,
  path: "",
  method: "GET",
  headers: commonOpenCloudHeaders
}

async function webRequest(options, requestBodyString) {
  return new Promise((resolve) => {
    if (requestBodyString) {
      options.headers = {...options.headers, 'Content-Length': Buffer.byteLength(requestBodyString)}
    }

    var req = https.request(options, res => {
      let data = '';

      res.setEncoding('utf8');

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {

        try {
          // Try to parse as JSON, but fall back to raw data if it fails
          data = data ? JSON.parse(data) : data;
          //console.log('Response:', parsedData);
        } catch (e) {
          //console.log('Raw Response:', data);
        }

        if (res.statusCode == 200) {
          //console.log(options.path, res.statusCode, data)
          resolve({ success: true, statusCode: res.statusCode, data })
          return
        } else {
          //console.log(parsedData)
          console.warn(options.path, res.statusCode, data)
          resolve({ success: false, statusCode: res.statusCode, data: data.code + "; " + data.message })
          return
        }
      });
    }).on('error', e => {
        console.warn(options.path, e);
        resolve({ success: false, statusCode: 0, data: e })
        return
    });
    
    //console.log(requestBodyString)
    if (requestBodyString) {
      req.write(requestBodyString);
    }
    req.end();
  })
}

var robloxAvatarPicCache = {}
var robloxAvatarPicCacheTimeTable = {}
var robloxAvatarPicCacheTimeout = 1000 * 60 * 60 * 0.5
var userIdCache = {}
var userNameCache = {}

async function getRobloxAvatarPic(userid, size, type) {
  var cacheName = userid.toString() + type + size.toString()
  //console.log(cacheName)

  if (robloxAvatarPicCacheTimeTable[cacheName] && Date.now() - robloxAvatarPicCacheTimeTable[cacheName] > robloxAvatarPicCacheTimeout) {
    delete robloxAvatarPicCache[cacheName];
    delete robloxAvatarPicCacheTimeTable[cacheName];
  }

  if (robloxAvatarPicCache[cacheName]) {
    return robloxAvatarPicCache[cacheName]
  }

  return new Promise(async (resolve) => {
    var queryString = querystring.stringify({
      userIds: userid,
      size: size + "x" + size,
      format: "Png",
      isCircular: false
    })

    var options = {...commonWebRequestOptions}
    options.hostname = "thumbnails.roblox.com"
    options.path = "/v1/users/" + type + "?" + queryString

    var {success, statusCode, data} = await webRequest(options, null)

    if (success && statusCode == 200 && ((data !== undefined && data !== null) && data.data !== undefined)) {
      var imageUrl1 = data.data[0].imageUrl
      robloxAvatarPicCache[cacheName] = imageUrl1
      robloxAvatarPicCacheTimeTable[cacheName] = Date.now()
      resolve(imageUrl1)
    } else {
      resolve("https://media.discordapp.net/attachments/846381103349628938/1424126341112008754/image.png")
    }
  })
}

async function pingWebsite(url) {
    try {
      var options = {...commonWebRequestOptions}
      options.hostname = url
      options.path = "/"
      options.method = "HEAD"

      var start = Date.now();
      var {success, statusCode, data} = await webRequest(options, "")
      var latency = Date.now() - start;

      if (success == true) {
        return { message: `${latency}ms`, success: true };
      } else if (statusCode == 0) {
        return { message: `Failed; ${statusCode} : ${data.code}`, success: false };
      }

      return { message: `${latency}ms`, success: true };
    } catch (err) {
        if (err.name === 'TimeoutError') {
            return { message: 'Timed out', success: false };
        }
        console.error(`Error pinging ${url}:`, err.message);
        return { message: 'Error', success: false };
    }
}

function getUserType(userIdOrName) {
  if (/^\d+$/.test(userIdOrName) == true) {
    return "userId"
  } else {
    return "userName"
  }
}

async function getRobloxUsername(userId) {
  if (userNameCache[userId]) {
    return userNameCache[userId]
  }

  var options = {...commonWebRequestOptions}
  options.hostname = "users.roblox.com"
  options.path = "/v1/users/" + userId
  options.method = "GET"

  var {success, statusCode, data} = await webRequest(options, null)
  if (!success || statusCode != 200) {
    console.error(`HTTP ${statusCode}`)
    return "N/A"
  };

  userNameCache[userId] = data.name
  userIdCache[data.name] = userId

  return data.name
}

async function getRobloxUserId(userName) {
  if (userIdCache[userName]) {
    return userIdCache[userName]
  }

  var responseBodyString = JSON.stringify({ usernames: [userName], excludeBannedUsers: false })

  var options = {...commonWebRequestOptions}
  options.hostname = "users.roblox.com"
  options.path = "/v1/usernames/users"
  options.method = "POST"

  var {success, statusCode, data} = await webRequest(options, responseBodyString)

  if (!success) {
      console.error(`HTTP ${statusCode}`);
      return "#HTTPERROR";
  }

  if (!data || data.data.length === 0) return "#USERNOTFOUND";

  userIdCache[userName] = data.data[0].id
  userNameCache[data.data[0].id] = userName

  return data.data[0].id; // { id, name, displayName }
}


var responseBody = []

function makeResponse(bool,message,id,payload) {
  var theResponse = {
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

app.post("/webhook", async(request, response) => {  //since I'm planning this to be semi-public, it'll require authkeys
                                               //to make clans and make changes to them and give them credit
                                               //authkeys will only be given to trusted ones, and exploiting them
                                               //will cause deactivation to their authkey
  
    
  var body = request.body
  var payload = body.payload //requests will be sent every 2 seconds, so they'll be in a dictionary called payload
  for (var [, value] of Object.entries(payload)) {
      //if (key == "requestType") {
      //    console.log(value)
      //}
      var payload2 = value.payload
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
              var isFlagged = modcallpayload.isFlagged
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
                        
              for (var [key, value] of Object.entries(reportinguser)) {
                reportingusername = value
                reportinguserid = key
              }
                        
              for (var [key, value] of Object.entries(reporteduser)) {
                reportedusername = value
                reporteduserid = key
              }
                    
              for (var [key, value] of Object.entries(game)) {
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
                  {name: ":name_badge: Reported User", value: "**[" + reportedusername + "](https://www.roblox.com/users/" + reporteduserid + "/profile)** (" + reporteduserid + ")", inline: true},
                  //{name: ":pencil: `group`", value: groupid, inline: true},
                  {name: ":shield: Reporting User", value: "||[" + reportingusername + "](https://www.roblox.com/users/" + reportinguserid + "/profile) (" + reportinguserid + ") ||", inline: true},
                  {name: ":warning: EASI / ~~TASE~~ Flagged", value: isFlagged},
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
                    Embed: newEmbed,
                    Text: "<@&941348501151961108> " + reportedusername + " (" + reporteduserid + ")",
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
                        
                        var text = ""
                        var gamename
                        var gameid
                        
                        for (var [, value] of Object.entries(game)) {
                          gamename = value
                        }
                        
                        var brokenLoop = -1
                        for (var [key, value] of Object.entries(commands)) {
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
                    case "anticheatlogging":
                        var timestart = Date.now()
                        var modcallpayload = payload2.payload
                        var game = modcallpayload.game //used to indicate the game
                        var userId = modcallpayload.userId
                        var username = modcallpayload.username
                        var caseNum = modcallpayload.case
                        var reason = modcallpayload.reason
                        //var reportdetails = modcallpayload.reportdetails //which mod joined
                        
                        var gamename
                        var gameid
                        
                        for (var [, value] of Object.entries(game)) {
                          gamename = value
                        }

                        var newEmbed = {
                            ["title"]: ":hammer: Anticheat Ban",
                            ["thumbnail"]: await getRobloxAvatarPic(userId, 150, "avatar-headshot"),
                            ["footer"]: defaultFooter,
                            ["color"]: 0x600080,
                            ["description"]: "From: " + gamename,
                            ["fields"]: [
                                {name: ":name_badge: User", value: "**[" + username + "](https://www.roblox.com/users/" + userId + "/profile)** (" + userId + ")"},
                                {name: ":pager: Case", value: "`" + caseNum + "`", inline: true},
                                {name: ":notepad_spiral: Reason", value: reason, inline: true},
                            ]
                        }

                        var dataToSend = [
                            {
                              MessageTo: "discordbot.js",
                              Type: "Embed",
                              Payload: {
                                  ServerToSendTo: "719673864111652936",
                                  ChannelToSendTo: "1291040473242271886",
                                  Text:  username + " (" + userId + ")",
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
                        var gameid
                        
                        
                        for (var [key, value] of Object.entries(reporteduser)) {
                        reportedusername = value
                        reporteduserid = key
                        }
                        
                        for (var [key, value] of Object.entries(game)) {
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
                                 {name: ":name_badge: Suspicious User", value: "**[" + reportedusername + "](https://www.roblox.com/users/" + reporteduserid + "/profile)** (" + reporteduserid + ")", inline: true},
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
                                  Embed: newEmbed,
                                  Text: "<@&941348501151961108>" + reportedusername + " (" + reporteduserid + ")",
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
  if (body.requesttype.toLowerCase() == "feedback") {
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
            },
            Text: username + " (" + userid + ")"
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

app.post("/dlswebhook", async(request, response) => {
  var body = request.body
  var payload = body.payload //requests will be sent every 2 seconds, so they'll be in a dictionary called payload
  for (var [, value] of Object.entries(payload)) {
      //if (key == "requestType") {
      //    console.log(value)
      //}
      var payload2 = value.payload
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
              var isFlagged = modcallpayload.isFlagged
              var game = modcallpayload.game //used to indicate the game
              var placeid = modcallpayload.placeid
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
                        
              for (var [key, value] of Object.entries(reportinguser)) {
                reportingusername = value
                reportinguserid = key
              }
                        
              for (var [key, value] of Object.entries(reporteduser)) {
                reportedusername = value
                reporteduserid = key
              }
                    
              for (var [key, value] of Object.entries(game)) {
                gamename = value
                gamekeyname = key
              }
              
              switch(gamekeyname) {
                case "MZRPG":
                  gameid = "70998903613713"
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
                  {name: ":name_badge: Reported User", value: "**[" + reportedusername + "](https://www.roblox.com/users/" + reporteduserid + "/profile)** (" + reporteduserid + ")", inline: true},
                  //{name: ":pencil: `group`", value: groupid, inline: true},
                  {name: ":shield: Reporting User", value: "||[" + reportingusername + "](https://www.roblox.com/users/" + reportinguserid + "/profile) (" + reportinguserid + ") ||", inline: true},
                  //{name: ":warning: EASI / ~~TASE~~ Flagged", value: isFlagged},
                  {name: ":pager: Report Reason", value: reportreason},
                  //{name: ":triangular_flag_on_post: Suspicion Meter", value: "**" + suspicionpercent + "%**", inline: true},
                  //{name: ":globe_with_meridians: Translation", value: translatedText},
                  {name: ":link: Join Link 1", value: "[Launch & autojoin (1)](https://www.roblox.com/games/start?placeId=" + placeid + '&launchData={"ReportJobId":"' + jobid + '"})', inline: true},
                  {name: ":link: Join Link 2", value: "[Launch & autojoin (2)](https://www.roblox.com/games/" + placeid + "/MZRPG?serverJobId=" + jobid + ")", inline: true},
                  {name: ":postbox: Server's JobId", value: "`" + jobid + "`"}
                ]
              }
                        
              var dataToSend = [
                  {
                  MessageTo: "discordbot.js",
                  Type: "Embed",
                  Payload: {
                    ServerToSendTo: "1278787772122927226",
                    ChannelToSendTo: "1307624332800819261",
                    Embed: newEmbed,
                    Text: "" + reportedusername + " (" + reporteduserid + ")",
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
                        
                        var text = ""
                        var gamename
                        var gameid
                        
                        for (var [, value] of Object.entries(game)) {
                          gamename = value
                        }
                        
                        var brokenLoop = -1
                        for (var [key, value] of Object.entries(commands)) {
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
                    case "anticheatlogging":
                        var timestart = Date.now()
                        var modcallpayload = payload2.payload
                        var game = modcallpayload.game //used to indicate the game
                        var userId = modcallpayload.userId
                        var username = modcallpayload.username
                        var caseNum = modcallpayload.case
                        var reason = modcallpayload.reason
                        //var reportdetails = modcallpayload.reportdetails //which mod joined
                        
                        var gamename
                        var gameid
                        
                        for (var [, value] of Object.entries(game)) {
                          gamename = value
                        }

                        var newEmbed = {
                            ["title"]: ":hammer: Anticheat Ban",
                            ["thumbnail"]: await getRobloxAvatarPic(userId, 150, "avatar-headshot"),
                            ["footer"]: defaultFooter,
                            ["color"]: 0x600080,
                            ["description"]: "From: " + gamename,
                            ["fields"]: [
                                {name: ":name_badge: User", value: "**[" + username + "](https://www.roblox.com/users/" + userId + "/profile)** (" + userId + ")"},
                                {name: ":pager: Case", value: "`" + caseNum + "`", inline: true},
                                {name: ":notepad_spiral: Reason", value: reason, inline: true},
                            ]
                        }

                        var dataToSend = [
                            {
                              MessageTo: "discordbot.js",
                              Type: "Embed",
                              Payload: {
                                  ServerToSendTo: "719673864111652936",
                                  ChannelToSendTo: "1291040473242271886",
                                  Text:  username + " (" + userId + ")",
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
                        var gameid
                        
                        
                        for (var [key, value] of Object.entries(reporteduser)) {
                        reportedusername = value
                        reporteduserid = key
                        }
                        
                        for (var [key, value] of Object.entries(game)) {
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
                                 {name: ":name_badge: Suspicious User", value: "**[" + reportedusername + "](https://www.roblox.com/users/" + reporteduserid + "/profile)** (" + reporteduserid + ")", inline: true},
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
                                  Embed: newEmbed,
                                  Text: "<@&941348501151961108>" + reportedusername + " (" + reporteduserid + ")",
                              },
                          }
                        ]

                        shareData(dataToSend)
                    break;
                }
            }
        }
        response.send(responseBody).status(200)
})

// listen for requests
var listener = app.listen(process.env.PORT, () => {
  console.log(`Your app is listening on port ${process.env.PORT}`);
});

async function openCloudFunction(requestType, requestPath, requestBody, callbackFunction) {
  //console.log(requestBody)
  var requestBodyString = null
  if (requestBody) {
    requestBodyString = JSON.stringify(requestBody); // Stringify here
  }

  var options = {...commonWebRequestOptions}
  options.hostname = "apis.roblox.com"
  options.path = requestPath
  options.method = requestType

  var {success, statusCode, data} = await webRequest(options, requestBodyString)
  callbackFunction(success, statusCode, data)
}

async function performOpenCloudViewBan(userId, gameName, callbackFunction) {
  var requestPath = null

  if (getUserType(userId) == "userName") {
    userId = await getRobloxUserId(userId)

    if (userId == "#USERNOTFOUND") {
      //user not found, quit
      callbackFunction(false, 0, "Could not find the user with the provided Username.")
      return
    } else if (userId == "#HTTPERROR") { 
      callbackFunction(false, 0, "HTTP error occured while fetching userId of the provided Username. Please use UserIDs instead for now.")
      return
    }
  }

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
    callbackFunction(false, 0, "Request path was not defined. Did you write the correct gameName? [c!viewban <userId> <gameName>]")
    return
  }

  //console.log(requestPath)
  openCloudFunction("GET", requestPath, null, callbackFunction)
}

async function performOpenCloudBan(userId, gameName, banType, banReason, issuedBy, callbackFunction) {
  var requestPath = null
  var duration = null
  
  if (getUserType(userId) == "userName") {
    userId = await getRobloxUserId(userId)

    if (userId == "#USERNOTFOUND") {
      //user not found, quit
      callbackFunction(false, 0, "Could not find the user with the provided Username.")
      return
    } else if (userId == "#HTTPERROR") { 
      callbackFunction(false, 0, "HTTP error occured while fetching userId of the provided Username. Please use UserIDs instead for now.")
      return
    }
  }

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
    callbackFunction(false, 0, "Request path was not defined. Did you write the correct gameName? [c!gameban <userId> <gameName> <banDuration> <reason>]")
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
      MessageListeners[data.Type].forEach((value) => {
        //console.log(value)
        value(data)
      });
      MessageListeners[data.Type] = []
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

          performOpenCloudBan(userId, gameName, banType, banReason, issuedBy, async(result, statusCode, data) => {
            //console.log(result, statusCode, data)
            //console.log(timestart, timeend)

            if (result) {
              //working
              var userName

              if (getUserType(userId) == "userName") {
                userName = userId
                userId = await getRobloxUserId(userId)

                if (userId == "#USERNOTFOUND") {
                  //user not found, quit
                  callbackFunction(false, 0, "Could not find the user with the provided Username.")
                  return
                } else if (userId == "#HTTPERROR") { 
                  callbackFunction(false, 0, "HTTP error occured while fetching userId of the provided Username. Please use UserIDs instead for now.")
                  return
                }
              } else {
                userName = await getRobloxUsername(userId)
                if (userName == "#USERNOTFOUND") {
                  userName = "N/A"
                  //user not found, quit
                  //callbackFunction(false, 0, "Could not find the user with the provided Username.")
                  //return
                } else if (userName == "#HTTPERROR") {
                  userName = "N/A" 
                  //callbackFunction(false, 0, "HTTP error occured while fetching userId of the provided Username. Please use UserIDs instead for now.")
                  //return
                }
              }

              var timeend = Date.now()
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
                        {name: ":name_badge: Banned User", value: "**[" + userName + "](https://www.roblox.com/users/" + userId + "/profile)** (" + userId + ")", inline: true},
                        {name: ":pager: Duration", value: banType, inline: true},
                      ]
                    },
                    Text: userName + " (" + userId + ")"
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
              var timeend = Date.now()

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
                        {name: ":bangbang: Error Message:", value: "`" + data + "`"}
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

          performOpenCloudViewBan(userId, gameName, async(result, statusCode, data) => {
            //console.log(data)
            //console.log(result, statusCode, data)
            var isBanned
            var privateBanReason
            var publicBanReason
            var areAltAccountsExcluded
            var isBanInherited
            var startTime
            var duration

            //console.log(timestart, timeend)
            if (result) {
              //working
              if (!(data.gameJoinRestriction == undefined || data.gameJoinRestriction == null)) {
                isBanned = data.gameJoinRestriction.active
                privateBanReason = data.gameJoinRestriction.privateReason
                publicBanReason = data.gameJoinRestriction.displayReason
                areAltAccountsExcluded = data.gameJoinRestriction.excludeAltAccounts
                isBanInherited = data.gameJoinRestriction.inherited
                startTime = data.gameJoinRestriction.startTime
                duration = data.gameJoinRestriction.duration
              } else {
                isBanned = false
              }

              if (duration == undefined || duration == null) {
                duration = "Permanent"
              }

              var embed = null

              //console.log(isBanned)
              var userName

              if (getUserType(userId) == "userName") {
                userName = userId
                userId = await getRobloxUserId(userId)

                if (userId == "#USERNOTFOUND") {
                  //user not found, quit
                  callbackFunction(false, 0, "Could not find the user with the provided Username.")
                  return
                } else if (userId == "#HTTPERROR") { 
                  callbackFunction(false, 0, "HTTP error occured while fetching userId of the provided Username. Please use UserIDs instead for now.")
                  return
                }
              } else {
                userName = await getRobloxUsername(userId)
                if (userName == "#USERNOTFOUND") {
                  userName = "N/A"
                  //user not found, quit
                  //callbackFunction(false, 0, "Could not find the user with the provided Username.")
                  //return
                } else if (userName == "#HTTPERROR") {
                  userName = "N/A" 
                  //callbackFunction(false, 0, "HTTP error occured while fetching userId of the provided Username. Please use UserIDs instead for now.")
                  //return
                }
              }

              var timeend = Date.now()

              if (isBanned == true) {
                embed = {
                  ["title"]: ":pager: View Ban - `" + gameName + "`",
                  ["footer"]: defaultFooter + " • Took " + (timeend - timestart) + "ms",
                  ["thumbnail"]: await getRobloxAvatarPic(userId, 150, "avatar-headshot"),
                  ["color"]: 0x600000,
                  ["fields"]: [
                    {name: ":identification_card: User", value: "**[" + userName + "](https://www.roblox.com/users/" + userId + "/profile)** (" + userId + ")", inline: true},
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
                    {name: ":identification_card: User", value: "**[" + userName + "](https://www.roblox.com/users/" + userId + "/profile)** (" + userId + ")", inline: true},
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
                    Text:  userName + " (" + userId + ")",
                    Embed: embed
                  },
                }
              ]

              shareData(dataToSend)
            } else {
              var timeend = Date.now()
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
                        {name: ":bangbang: Error Message:", value: "`" + data + "`"}
                      ]
                    }
                  },
                }
              ]

              shareData(dataToSend)
            }
          })
        break;

        case "SendToRoblox":
          var gameName = data.Payload.GameName
          var payload = data.Payload.DataToSend
    
          makeResponse(true, "CustomMessage", null, payload)
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

        case "RobloxAPIPing":
          var {message, success} = await pingWebsite("apis.roblox.com")
          //console.log(robloxPing, isSuccess)

          var dataToSend = [
            {
              MessageTo: "discordbot.js",
              Type: "RobloxAPIPong",
              Payload: {Success: success, Ping: message}
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