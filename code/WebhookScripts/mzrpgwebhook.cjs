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
  TEST: [],
}

var pendingSyncingResponses = {
  MZRPG: [],
  MZRPGTEMP: [],
  TEST: [],
}

var pendingNewOutfits = []

var QueuedMessages = []
var AwaitingResponses = [] //keyed by UUIDs created here

function makeAwaitingResponse(discordStuff, functionToRun) {
  var id = crypto.randomUUID();
  AwaitingResponses[id] = functionToRun

  return id
}

function OutfitDeleteRequest(outfitId, discordStuff) {
  var id = makeAwaitingResponse(discordStuff, (returnedData) => {
    var textToSend

    if (returnedData.Success) {
      textToSend = "<@" + discordStuff[2] + ">; successfully deleted outfit `" + outfitId + "`!"
    } else {
      textToSend = "<@" + discordStuff[2] + ">; an error occured while deleting `" + outfitId + "`; `" + returnedData.Error.Message + "`"
    }

    var dataToSend = [
      {
        MessageTo: "discordbot.js",
        Type: "Message",
        Payload: {
          ServerToSendTo: discordStuff[0],
          ChannelToSendTo: discordStuff[1],
          Message: textToSend,
        },
      }
    ]

    shared.shareData(dataToSend)
  })

  QueuedMessages.push({
    gameId: "MZRPG",
    messageType: "outfitDeleteRequest",
    payload: { OutfitId: outfitId, ReturnID: id },
  })
}

async function OutfitsLookupRequest(user, discordStuff) {
  var userName
  var userId
  
  var origUsername = userName
  var origUserId = userId

  //console.log(user, discordStuff)

  if (shared.getUserType(user) == "userId") {
      userId = user
      userName = await shared.getRobloxUsername(user)
  } else {
      userName = user
      userId = await shared.getRobloxUserId(user)
  }

  //console.log(userName, userId)

  if (userId == null || userId === "#HTTPERROR" || userId === "#USERNOTFOUND" || userName == null || userName === "N/A") {
    //console.log(discordStuff[0], discordStuff[1])
    shared.shareData([{
      MessageTo: "discordbot.js",
      Type: "Message",
      Payload: {
        ServerToSendTo: discordStuff[0],
        ChannelToSendTo: discordStuff[1],
        Message: "<@" + discordStuff[2] + "> User `" + origUsername + "`/ `" + origUserId + "` does not exist! Please provide a UserId or double check the spelling. Values: `" + userId + " " + userName + "`",
      },
    }])
    return
  }

  var id = makeAwaitingResponse(discordStuff, (returnedData) => {
    var textToSend

    if (returnedData.Success) {
      var wentThroughOutfits = false

      returnedData.Outfits.forEach(outfit => {
        wentThroughOutfits = true
        outfit.LookedUp = true
        outfit.LookedUpOriginChannel = discordStuff[1]
        outfit.UserId = userId
        outfit.Username = userName

        pendingNewOutfits.push(outfit)
      });

      if (wentThroughOutfits) {
        textToSend = "<@" + discordStuff[2] + ">; outfits lookup for user `" + userName + "` finished! Please wait for the outfits to send here.."
      } else {
        textToSend = "<@" + discordStuff[2] + ">; " + userName + " has no favourited or created outfits saved."
      }
    } else {
      textToSend = "<@" + discordStuff[2] + ">; an error occured while looking up `" + userId + "`; `" + returnedData.Error.Message + "`"
    }

    var dataToSend = [
      {
        MessageTo: "discordbot.js",
        Type: "Message",
        Payload: {
          ServerToSendTo: discordStuff[0],
          ChannelToSendTo: discordStuff[1],
          Message: textToSend,
        },
      }
    ]

    shared.shareData(dataToSend)
  })

  QueuedMessages.push({
    gameId: "MZRPG",
    messageType: "outfitsLookupRequest",
    payload: { UserId: userId, ReturnID: id },
  })
}

function AssetBlockAdd(assetId, discordStuff) {
  var id = makeAwaitingResponse(discordStuff, "<@" + discordStuff[2] + ">; successfully added asset `" + assetId + "` to blocklist!")

  QueuedMessages.push({
    gameId: "MZRPG",
    messageType: "assetBlockAddRequest",
    payload: { AssetId: assetId, ReturnID: id },
  })
}

const gotExports = {
  OutfitDeleteRequest: OutfitDeleteRequest,
  OutfitsLookupRequest: OutfitsLookupRequest,
  AssetBlockAdd: AssetBlockAdd
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
      case "heartbeat": {
        makeResponse(true, "", value.id, {})
        break;
      }

      case "serverSyncRequest": {
        var newSyncRequest = {
          UserId: payload2.UserId,
          Outfits: payload2.Outfits,
          ToGame: payload2.ToGame,
        }

        const existingIndex = pendingSyncingRequests[payload2.ToGame].findIndex(response => response.UserId === newSyncRequest.UserId);

        if (existingIndex !== -1) {
          pendingSyncingRequests[payload2.ToGame].splice(existingIndex, 1);
        }

        //console.log(payload2)
        pendingSyncingRequests[payload2.ToGame].push(newSyncRequest)

        makeResponse(true, "", value.id, {})
        break;
      }

      case "serverSyncResponse": {
        var newSyncResponse = {
          UserId: payload2.UserId,
          Outfits: payload2.Outfits,
          ToGame: payload2.ToGame, //NOT equal to the same game
        }

        pendingSyncingResponses[payload2.ToGame].push(newSyncResponse)

        makeResponse(true, "", value.id, {})
        break;
      }

      case "newOutfitCreated": {
        var outfitId = payload2.OutfitId

        const existingIndex = pendingNewOutfits.findIndex(response => response.OutfitId === outfitId);

        if (existingIndex !== -1) {
          pendingNewOutfits.splice(existingIndex, 1);
        }

        //console.log(payload2)
        pendingNewOutfits.push(payload2)

        makeResponse(true, "", value.id, {})
        break;
      }

      case "outfitsLookupResponse": {
        //console.log("oi", payload2, QueuedMessages)
        if (AwaitingResponses[payload2.ReturnID]) {
          AwaitingResponses[payload2.ReturnID](payload2)
          AwaitingResponses[payload2.ReturnID] = undefined
        }
        break;
      };

      case "outfitDeleteResponse": {
        //console.log("oi", payload2, QueuedMessages)
        if (AwaitingResponses[payload2.ReturnID]) {
          AwaitingResponses[payload2.ReturnID](payload2)
          AwaitingResponses[payload2.ReturnID] = undefined
        }
        break;
      };

      case "moderation": {
        var requesttype = payload2.requestType
        switch (requesttype) {
          case "modcall": {
            //console.log(payload)       
            var modcallpayload = payload2.payload
            var reporteduser = modcallpayload.reporteduser //the user that as reported
            var reportinguser = modcallpayload.reportinguser //the user that reported
            var reportreason = modcallpayload.reportreason //the reason for reporting
            //var isFlagged = modcallpayload.isFlagged
            var game = modcallpayload.game //used to indicate the game
            var placeid = modcallpayload.placeid
            var jobid = modcallpayload.jobid
            //var suspicionpercent = modcallpayload.suspicionpercent
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

            shared.addToCacheUsernameByUserID(reporteduserid, reportedusername);
            shared.addToCacheUserIDByUsername(reportedusername, reporteduserid);

            shared.addToCacheUsernameByUserID(reportinguserid, reportingusername);
            shared.addToCacheUserIDByUsername(reportingusername, reportinguserid);

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
                  ServerToSendTo: "1540111553456504912",
                  ChannelToSendTo: "1515770408584872026",
                  Embed: newEmbed,
                  Text: "<@&1293245227376574686> " + reportedusername + " (" + reporteduserid + ")",
                },
              }
            ]
            shared.shareData(dataToSend)

            break;
          }

          case "logging": {
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
                  ServerToSendTo: "1540111553456504912",
                  ChannelToSendTo: "1546139284401168466",
                  Embed: newEmbed
                },
              }
            ]

            shared.shareData(dataToSend)
            break;
          }

          case "anticheatlogging": {
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

            shared.addToCacheUsernameByUserID(userId, username);
            shared.addToCacheUserIDByUsername(username, userId);

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
                  ServerToSendTo: "1540111553456504912",
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
        break;
      }
    }
  }

  if (!(body.Capabilities == undefined || body.Capabilities == null)) {
    const maximumAmount = 10
    let currentAmount = 0

    const responses = pendingSyncingResponses[body.FromGame] ?? []
    while (responses.length > 0 && currentAmount < maximumAmount) {
      makeResponse(true, "syncResponse", -1, responses.shift())
      currentAmount++
    }

    const requests = pendingSyncingRequests[body.FromGame] ?? []
    while (requests.length > 0 && currentAmount < maximumAmount) {
      makeResponse(true, "syncRequest", -1, requests.shift())
      currentAmount++
    }

    if (body.Capabilities["OutfitModerationTools"]) {
      var remaining = []
      for (const message of QueuedMessages) {
        if (message.gameId == body.FromGame) {
          makeResponse(true, message.messageType, -1, message.payload)
        } else {
          remaining.push(message)
        }
      }
      QueuedMessages.length = 0
      QueuedMessages.push(...remaining)
    }
  }  

  //console.log(body.FromGame)
  response.send(responseBody).status(200)
  responseBody = []
}

setInterval(() => {
  var syncRequests = pendingSyncingRequests.MZRPG.length + pendingSyncingRequests.MZRPGTEMP.length
  var syncResponses = pendingSyncingResponses.MZRPG.length + pendingSyncingResponses.MZRPGTEMP.length

  if (syncRequests > 0 || syncResponses > 0) {
    const now = new Date();

    // Extract values with zero‑padding
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    console.log(hours + ":" + minutes + ":" + seconds + " - Pending - Sync Requests: " + syncRequests + " | Sync Responses: " + syncResponses)
  }
}, 1000 * 60 * 10);

var isActivelySendingOutfits = false
var loopIsBusy = false

var poolOfOutfitChannels = ["1545359563744616510", "1550483057868406784", "1550483094287556698"];
var currentOutfitChannel = -1;

setInterval(async () => {
  if (pendingNewOutfits.length <= 0) {
    if (isActivelySendingOutfits && !loopIsBusy) {
      isActivelySendingOutfits = false;
      console.log("Finished notifying about new outfits");
    }
    return; // nothing to do, don't fall through to the busy check pointlessly
  }

  if (loopIsBusy) {
    return;
  }
  loopIsBusy = true;

  try {
    if (!isActivelySendingOutfits) {
      isActivelySendingOutfits = true;
      console.log("Notifying new outfits");
    }

    while (pendingNewOutfits.length > 0) {
      var timeStart = Date.now();
      var payload2 = pendingNewOutfits.shift();

      var outfitName = payload2.OutfitName;
      var outfitId = payload2.OutfitId;
      var assets = payload2.OutfitAssets;

      var isOutfitPrivate = payload2.IsOutfitPrivate ? "Yes" : "No";
      var userId = payload2.UserId;
      var username = payload2.Username;

      var isLookedUpOutfit = payload2.LookedUp
      var lookedUpOriginChannel = payload2.LookedUpOriginChannel

      var text = "";
      var brokenLoop = false;

      var imageFiles = [];
      var appendedImages = 0;
      var imageLoadingFailed = false;

      shared.addToCacheUsernameByUserID(userId, username);
      shared.addToCacheUserIDByUsername(username, userId);

      for (var [key, value] of Object.entries(assets)) {
        var { success, pathToFile, cached } = await shared.loadRobloxImageOfAsset(value[1], ".temp/");
        if (success) {
          imageFiles.push(pathToFile);
          appendedImages += 1;
          if (appendedImages >= 10) break;
        } else {
          imageLoadingFailed = true;
        }

        if (!cached) {
          await sleep(1000);
        }
      }

      for (var [key, value] of Object.entries(assets)) {
        var tempText = text + "- [" + value[0] + "](https://www.roblox.com/catalog/" + value[1] + "/)\n";
        if (tempText.length > 1024) {
          brokenLoop = true;
          break;
        } else {
          text = tempText;
        }
      }

      var timeEnd = Date.now();

      var chosenChannel

      if (!isLookedUpOutfit) {
        currentOutfitChannel += 1;
        
        if (poolOfOutfitChannels[currentOutfitChannel] === undefined) {
          currentOutfitChannel = 0;
        }
        
        chosenChannel = poolOfOutfitChannels[currentOutfitChannel]
      } else {
        chosenChannel = lookedUpOriginChannel
      }

      var newEmbed = {
        title: ":shirt: New Outfit",
        footer: defaultFooter + " • Took " + (timeEnd - timeStart) + "ms",
        thumbnail: await shared.getRobloxAvatarPic(userId, 150, "avatar-headshot"),
        color: 0xBF5C00,
        description: ":pencil: Name: `" + outfitName + "`\n:pager: OutfitId: `" + outfitId + "`",
        fields: [
          { name: ":closed_lock_with_key: Is outfit private?", value: isOutfitPrivate },
          { name: ":billed_cap: Attachments list", value: text }
        ]
      };

      if (brokenLoop) {
        newEmbed.fields.push({ name: ":warning: Warning", value: "Not enough embed space for entire attachment list." });
      }
      if (imageLoadingFailed) {
        newEmbed.fields.push({ name: ":warning: Warning", value: "Failed to load one or more images." });
      }


      var dataToSend = [
        {
          MessageTo: "discordbot.js",
          Type: "Embed",
          Payload: {
            ServerToSendTo: "1540111553456504912",
            ChannelToSendTo: chosenChannel,
            Embed: newEmbed,
            Images: imageFiles,
            DeleteImagesAfterSending: false,
            Text: "`" + outfitName + "` by [" + username + "](https://www.roblox.com/users/" + userId + "/profile) (" + userId + ")",
          },
        }
      ];

      try {
        await shared.shareData(dataToSend);
      } catch (err) {
        console.warn(`Failed to send outfit ${outfitId}:`, err);
        // decide: continue to next outfit, or re-queue payload2, your call
      }
    }
  } finally {
    loopIsBusy = false;
  }
}, 1000 * 1);

module.exports = {
  init: init,
  webhook: webhook,
  exports: gotExports
}