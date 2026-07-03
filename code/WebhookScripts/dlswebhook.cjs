//things to be imported via the init function
var shared

function init(sharedTable) {
  shared = sharedTable
}

var defaultFooter = "Skynet Clans • Version " + process.env.VERSION + " • Hosting on: " + process.env.HOSTING

var responseBody = []

var pendingSyncingRequests = {
  MZRPG: [],
  MZRPGTEMP: [],
}

var pendingSyncingResponses = {
  MZRPG: [],
  MZRPGTEMP: [],
}

function makeResponse(bool, message, id, payload) {
  var theResponse = {
    id: id,
    status: bool ? 200 : 400,
    responseStatus: bool ? 'OK' : 'BAD REQUEST',
    message: message,
    payload: payload,
  }

  //var arraylength = responseBody.length
  //var newResponse = { ...theResponse }
  //newResponse.message = message
  //newResponse.id = id
  //newResponse.payload = { ...payload }
  responseBody.push(theResponse)
  //responseBody[arraylength + 1] = newResponse
}

async function webhook(body, response) {
  var payload = body.payload //requests will be sent every 2 seconds, so they'll be in a dictionary called payload

  for (var [, value] of Object.entries(payload)) {
    var payload2 = value.payload
    switch (value.requestType) {
      case "heartbeat":
        makeResponse(true, "", value.id, {})
        break;

      case "serverSyncRequest":
        var newSyncRequest = {
          UserId: payload2.UserId,
          Outfits: payload2.Outfits,
          FromGame: payload2.FromGame,
        }

        pendingSyncingRequests[payload2.FromGame].push(newSyncRequest)

        makeResponse(true, "", value.id, {})
        break;

      case "serverSyncResponse":
        var newSyncResponse = {
          UserId: payload2.UserId,
          Outfits: payload2.Outfits,
          ToGame: payload2.ToGame, //NOT equal to the same game
        }

        pendingSyncingResponses[payload2.FromGame].push(newSyncResponse)

        makeResponse(true, "", value.id, {})
        break;

      case "moderation":
        var requesttype = payload2.requestType
        switch (requesttype) {
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

            switch (gamekeyname) {
              case "MZRPG":
                gameid = "70998903613713"
                break;
            }

            var newEmbed = {
              ["title"]: ":loudspeaker: Modcall",
              ["footer"]: defaultFooter,
              ["image"]: await shared.getRobloxAvatarPic(reporteduserid, 420, "avatar"),
              ["thumbnail"]: await shared.getRobloxAvatarPic(reportinguserid, 150, "avatar-headshot"),
              ["color"]: 0x990000,
              ["description"]: "From: " + gamename,
              ["fields"]: [
                { name: ":name_badge: Reported User", value: "**[" + reportedusername + "](https://www.roblox.com/users/" + reporteduserid + "/profile)** (" + reporteduserid + ")", inline: true },
                //{name: ":pencil: `group`", value: groupid, inline: true},
                { name: ":shield: Reporting User", value: "||[" + reportingusername + "](https://www.roblox.com/users/" + reportinguserid + "/profile) (" + reportinguserid + ") ||", inline: true },
                //{name: ":warning: EASI / ~~TASE~~ Flagged", value: isFlagged},
                { name: ":pager: Report Reason", value: reportreason },
                //{name: ":triangular_flag_on_post: Suspicion Meter", value: "**" + suspicionpercent + "%**", inline: true},
                //{name: ":globe_with_meridians: Translation", value: translatedText},
                { name: ":link: Join Link 1", value: "[Launch & autojoin (1)](https://www.roblox.com/games/start?placeId=" + placeid + '&launchData={"ReportJobId":"' + jobid + '"})', inline: true },
                { name: ":link: Join Link 2", value: "[Launch & autojoin (2)](https://www.roblox.com/games/" + placeid + "/MZRPG?serverJobId=" + jobid + ")", inline: true },
                { name: ":postbox: Server's JobId", value: "`" + jobid + "`" }
              ]
            }

            var dataToSend = [
              {
                MessageTo: "discordbot.js",
                Type: "Embed",
                Payload: {
                  ServerToSendTo: "1278787772122927226",
                  ChannelToSendTo: "1515770408584872026",
                  Embed: newEmbed,
                  Text: "" + reportedusername + " (" + reporteduserid + ")",
                },
              }
            ]
            shared.shareData(dataToSend)

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
              var tempText = text + "**[" + value[0] + "]** " + value[1] + "\n"
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
                { name: ":floppy_disk: Commands", value: text },
                { name: ":postbox: Server's JobId", value: "`" + jobid + "`" },
              ]
            }

            if (brokenLoop != -1) {
              newEmbed.fields = [
                { name: ":floppy_disk: Commands", value: text },
                { name: ":postbox: Server's JobId", value: "`" + jobid + "`" },
                { name: ":warning: Warning", value: "Not enough embed space for entire command list." }
              ]
            }

            var dataToSend = [
              {
                MessageTo: "discordbot.js",
                Type: "Embed",
                Payload: {
                  ServerToSendTo: "1278787772122927226",
                  ChannelToSendTo: "1516374354299195492",
                  Embed: newEmbed
                },
              }
            ]

            shared.shareData(dataToSend)
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
              ["thumbnail"]: await shared.getRobloxAvatarPic(userId, 150, "avatar-headshot"),
              ["footer"]: defaultFooter,
              ["color"]: 0x600080,
              ["description"]: "From: " + gamename,
              ["fields"]: [
                { name: ":name_badge: User", value: "**[" + username + "](https://www.roblox.com/users/" + userId + "/profile)** (" + userId + ")" },
                { name: ":pager: Case", value: "`" + caseNum + "`", inline: true },
                { name: ":notepad_spiral: Reason", value: reason, inline: true },
              ]
            }

            var dataToSend = [
              {
                MessageTo: "discordbot.js",
                Type: "Embed",
                Payload: {
                  ServerToSendTo: "719673864111652936",
                  ChannelToSendTo: "1291040473242271886",
                  Text: username + " (" + userId + ")",
                  Embed: newEmbed
                },
              }
            ]

            shared.shareData(dataToSend)
            break;
        }
    }
  }

  if (pendingSyncingRequests[body.FromGame] !== undefined && pendingSyncingRequests[body.FromGame] !== null) {
    for (i=0; i < pendingSyncingRequests[body.FromGame].length; i++) {
      makeResponse(true, "syncRequest", -1, pendingSyncingRequests[body.FromGame][i])
    }

    for (i=0; i < pendingSyncingResponses[body.FromGame].length; i++) {
      makeResponse(true, "syncResponse", -1, pendingSyncingResponses[body.FromGame][i])
    }

    pendingSyncingRequests[body.FromGame] = []
    pendingSyncingResponses[body.FromGame] = []
  }

  response.send(responseBody).status(200)
  responseBody = []
}

module.exports = {
  init: init,
  webhook: webhook
}