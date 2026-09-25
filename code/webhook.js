/* eslint-disable no-redeclare */
//webhook handling for roblox
import { createRequire } from 'module';
import { LRUCache } from 'lru-cache'

const require = createRequire(import.meta.url);
const express = require("express");
const querystring = require('querystring');
const compression = require('compression');
const app = express();

const path = require('path');

const { doesFolderOrFileExist, getFileSize, removeFile, makeFolder, openWriteStream, removeFolder } = require('./Modules/fileHelper.cjs');
const { httpGet, httpRequest, setDefaultRequestOptions } = require('./Modules/webHelper.cjs');

var tempPath = path.resolve(".temp")

//console.log(tempPath)

if (doesFolderOrFileExist(tempPath)) {
  removeFolder(tempPath);
}
makeFolder(tempPath, { recursive: true });

var cacheOptions = {
  max: 10240,

  // for use with tracking overall storage size
  maxSize: 1024 * 1024 * 1024 * 1024,
  sizeCalculation: (value) => {
    if (doesFolderOrFileExist(path.join(value))) {
      return getFileSize(path.join(value));
    }
    return 1
  },

  // for use when you need to clean up something when objects
  // are evicted from the cache
  dispose: (value) => {
    if (doesFolderOrFileExist(path.join(value))) {
      removeFile(path.join(value));
    }
  },

  // for use when you need to know that an item is being inserted
  // note that this does NOT allow you to prevent the insertion,
  // it just allows you to know about it.
  //onInsert: (value, key, reason) => {
  //  logInsertionOrWhatever(key, value)
  //},

  // how long to live in ms
  ttl: 1000 * 60 * 60 * 24,

  // return stale items before removing from cache?
  allowStale: false,

  updateAgeOnGet: true,
  updateAgeOnHas: false,

  // async method to use for cache.fetch(), for
  // stale-while-revalidate type of behavior
  //fetchMethod: async (key, staleValue, { options, signal, context }) => {},
}

const catalogItemImageCache = new LRUCache(cacheOptions)

cacheOptions.maxSize = 1024
cacheOptions.sizeCalculation = () => {
  return 1;
}
cacheOptions.dispose = undefined
cacheOptions.ttl = 1000 * 60 * 60
cacheOptions.updateAgeOnGet = false

const robloxUserIDByUsernameCache = new LRUCache(cacheOptions)
const robloxUsernameByUserIDCache = new LRUCache(cacheOptions)
const robloxProfileImageCache = new LRUCache(cacheOptions)

app.disable('x-powered-by'); //safety
app.use(compression());
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '256kb' }));

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

setDefaultRequestOptions(commonWebRequestOptions)

async function webRequest(options, requestBodyString) {
  return new Promise((resolve) => {
    if (requestBodyString) {
      options.headers = { ...options.headers, 'Content-Length': Buffer.byteLength(requestBodyString) }
    }

    var req = httpRequest(options, res => {
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
          resolve({ success: false, statusCode: res.statusCode, data: data.code + "; " + data.message, response: res })
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

async function downloadFileTo(url, assetId) {
  return new Promise((resolve, reject) => {
    var filePath = path.join(tempPath, `${assetId}`);
    makeFolder(path.dirname(filePath), { recursive: true });

    httpGet(url, (res) => {
      if (res.statusCode !== 200) {
        res.resume(); // drain
        reject(new Error(`Failed to download, status ${res.statusCode}`));
        return;
      }

      const fileStream = openWriteStream(filePath);
      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close(() => resolve(filePath));
      });

      fileStream.on('error', (err) => {
        removeFile(filePath, () => reject(err));
      });
    }).on('error', reject);
  });
}

async function getRobloxAvatarPic(userid, size, type) {
  if (userid == undefined || size == undefined || type == undefined) {
    return new Promise((resolve) => {
      resolve("https://media.discordapp.net/attachments/846381103349628938/1424126341112008754/image.png")
    })
  }

  var cacheName = userid.toString() + type + size.toString()
  //console.log(cacheName)

  if (robloxProfileImageCache.has(cacheName)) {
    return robloxProfileImageCache.get(cacheName)
  }

  return new Promise(async (resolve) => {
    var queryString = querystring.stringify({
      userIds: userid,
      size: size + "x" + size,
      format: "Png",
      isCircular: false
    })

    var options = { ...commonWebRequestOptions }
    options.hostname = "thumbnails.roblox.com"
    options.path = "/v1/users/" + type + "?" + queryString

    var { success, statusCode, data } = await webRequest(options, null)

    if (success && statusCode == 200 && ((data !== undefined && data !== null) && data.data !== undefined)) {
      var imageUrl1 = data.data[0].imageUrl
      robloxProfileImageCache.set(cacheName, imageUrl1)
      resolve(imageUrl1)
    } else {
      resolve("https://media.discordapp.net/attachments/846381103349628938/1424126341112008754/image.png")
    }
  })
}

async function pingWebsite(url) {
  try {
    var options = { ...commonWebRequestOptions }
    options.hostname = url
    options.path = "/"
    options.method = "HEAD"

    var start = Date.now();
    var { success, statusCode, data } = await webRequest(options, "")
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
  if (robloxUsernameByUserIDCache.has(toString(userId))) {
    return robloxUsernameByUserIDCache.get(toString(userId))
  }

  var options = { ...commonWebRequestOptions }
  options.hostname = "users.roblox.com"
  options.path = "/v1/users/" + userId
  options.method = "GET"

  var { success, statusCode, data } = await webRequest(options, null)
  if (!success || statusCode != 200) {
    console.error(`HTTP ${statusCode}`)
    return "N/A"
  };
  if (!data || typeof data.name === "undefined") {
    console.error("Unexpected payload for userId", userId, JSON.stringify(data))
    return "N/A"
  }

  robloxUsernameByUserIDCache.set(toString(userId), toString(data.name))
  robloxUserIDByUsernameCache.set(toString(data.name), userId)

  return toString(data.name)
}

async function getRobloxUserId(userName) {
  if (robloxUserIDByUsernameCache.has(toString(userName))) {
    return robloxUserIDByUsernameCache.get(toString(userName))
  }

  var responseBodyString = JSON.stringify({ usernames: [userName], excludeBannedUsers: false })

  var options = { ...commonWebRequestOptions }
  options.hostname = "users.roblox.com"
  options.path = "/v1/usernames/users"
  options.method = "POST"

  var { success, statusCode, data } = await webRequest(options, responseBodyString)

  if (!success || statusCode != 200) {
    console.error(`HTTP ${statusCode}`);
    return "#HTTPERROR";
  }
  if (!data || data.data.length === 0) return "#USERNOTFOUND";

  robloxUserIDByUsernameCache.set(toString(userName), data.data[0].id)
  robloxUsernameByUserIDCache.set(toString(data.data[0].id), toString(userName))

  return data.data[0].id; // { id, name, displayName }
}


async function openCloudFunction(requestType, requestPath, requestBody, callbackFunction) {
  //console.log(requestBody)
  var requestBodyString = null
  if (requestBody) {
    requestBodyString = JSON.stringify(requestBody); // Stringify here
  }

  var options = { ...commonWebRequestOptions }
  options.hostname = "apis.roblox.com"
  options.path = requestPath
  options.method = requestType

  var { success, statusCode, data } = await webRequest(options, requestBodyString)
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

  switch (gameName) {
    case "phoenix": {
      requestPath = "/cloud/v2/universes/1826628366/user-restrictions/" + userId
      break;
    }

    case "firing": {
      requestPath = "/cloud/v2/universes/1810450591/user-restrictions/" + userId
      break;
    }

    case "jungle": {
      requestPath = "/cloud/v2/universes/2756038974/user-restrictions/" + userId
      break;
    }
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

  switch (gameName) {
    case "phoenix": {
      requestPath = "/cloud/v2/universes/1826628366/user-restrictions/" + userId
      break;
    }

    case "firing": {
      requestPath = "/cloud/v2/universes/1810450591/user-restrictions/" + userId
      break;
    }

    case "jungle": {
      requestPath = "/cloud/v2/universes/2756038974/user-restrictions/" + userId
      break;
    }
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

async function loadRobloxImageOfAsset(assetId) { //return success, pathToFile
  if (catalogItemImageCache.has(assetId)) {
    return { success: true, pathToFile: catalogItemImageCache.get(assetId), cached: true };
  }

  var options = { ...commonWebRequestOptions }
  options.hostname = "thumbnails.roblox.com"
  options.path = "/v1/assets?assetIds=" + assetId + "&size=420x420&format=png&isCircular=false"

  var { success, statusCode, data, response } = await webRequest(options, null)

  if (!success || statusCode != 200 || !data || !data.data || data.data.length === 0) {
    if (statusCode == 429) {
      return await setTimeout(loadRobloxImageOfAsset, 1000 + (response.headers['retry-after']*1000), assetId);
    }
    return { success: false, pathToFile: null, cached: false }
  }

  const imageUrl = data.data[0].imageUrl;

  try {
    const filePath = await downloadFileTo(imageUrl, assetId + ".png");
    catalogItemImageCache.set(assetId, filePath)
    return { success: true, pathToFile: filePath, cached: false };
  } catch (err) {
    console.warn('Failed to download image:', err);
    return { success: false, pathToFile: null, cached: false };
  }
}

const sharedTable = {
  shareData: shareData,
  getRobloxUserId: getRobloxUserId,
  getRobloxUsername: getRobloxUsername,
  getRobloxAvatarPic: getRobloxAvatarPic,
  getUserType: getUserType,
  pingWebsite: pingWebsite,
  webRequest: webRequest,
  openCloudFunction: openCloudFunction,
  performOpenCloudBan: performOpenCloudBan,
  performOpenCloudViewBan: performOpenCloudViewBan,
  loadRobloxImageOfAsset: loadRobloxImageOfAsset,
  addToCacheUsernameByUserID: (userId, userName) => {
    robloxUsernameByUserIDCache.set(toString(userId), toString(userName))
    robloxUserIDByUsernameCache.set(toString(userName), userId)
  },
  addToCacheUserIDByUsername: (userName, userId) => {
    robloxUserIDByUsernameCache.set(toString(userName), userId)
    robloxUsernameByUserIDCache.set(toString(userId), toString(userName))
  }
}

const mzrpgwebhook = require('./WebhookScripts/mzrpgwebhook.cjs')
const skynetwebhook = require('./WebhookScripts/skynetwebhook.cjs')
const webhook = require('./WebhookScripts/webhook.cjs')

const gotExports = {
  mzrpgwebhook: mzrpgwebhook.exports,
  skynetwebhook: skynetwebhook.exports,
  webhook: webhook.exports
}

mzrpgwebhook.init(sharedTable);
skynetwebhook.init(sharedTable);
webhook.init(sharedTable);

app.post("/webhook", async (request, response) => {  //since I'm planning this to be semi-public, it'll require authkeys
  //to make clans and make changes to them and give them credit
  //authkeys will only be given to trusted ones, and exploiting them
  //will cause deactivation to their authkey
  var body = request.body
  webhook.webhook(body, response)
}); //listener for post requests (webhook)

app.post("/skynetwebhook", async (request, response) => {
  var body = request.body
  skynetwebhook.webhook(body, response)
});

app.post("/mzrpgwebhook", async (request, response) => {
  var body = request.body
  //do the payload here
  mzrpgwebhook.webhook(body, response)
})

// listen for requests
var listener = app.listen(process.env.PORT, () => {
  console.log(`Your app is listening on port ${process.env.PORT}`);
});

listener.timeout = 0;
listener.headersTimeout = 0;
listener.requestTimeout = 0;

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
    switch (data.Type) {
      case "OpenCloudBan": {
        var userId = data.Payload.Arguements[0]
        var gameName = data.Payload.Arguements[1]
        var banType = data.Payload.Arguements[2]
        var banReason = data.Payload.Arguements[3]
        var issuedBy = data.Payload.Arguements[4]
        var originalChannelId = data.Payload.OriginalChannelId

        performOpenCloudBan(userId, gameName, banType, banReason, issuedBy, async (result, statusCode, data) => {
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
                      { name: ":warning: Open Cloud Ban - Issued by " + issuedBy, value: "- Ban reason: `" + banReason + "`" },
                      { name: ":name_badge: Banned User", value: "**[" + userName + "](https://www.roblox.com/users/" + userId + "/profile)** (" + userId + ")", inline: true },
                      { name: ":pager: Duration", value: banType, inline: true },
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
                      { name: ":pager: Status Code:", value: statusCode },
                      { name: ":bangbang: Error Message:", value: "`" + data + "`" }
                    ]
                  }
                },
              }
            ]

            shareData(dataToSend)
          }
        })
        break;
      }

      case "OpenCloudViewBan": {
        var userId = data.Payload.Arguements[0]
        var gameName = data.Payload.Arguements[1]
        var originalChannelId = data.Payload.OriginalChannelId

        performOpenCloudViewBan(userId, gameName, async (result, statusCode, data) => {
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
                  { name: ":identification_card: User", value: "**[" + userName + "](https://www.roblox.com/users/" + userId + "/profile)** (" + userId + ")", inline: true },
                  { name: ":name_badge: Currently banned?", value: isBanned, inline: true },
                  { name: ":clock3: Banned at:", value: "`" + startTime + "`", inline: true },
                  { name: ":clock3: Duration", value: duration, inline: true },
                  { name: ":pager: Alt accounts excluded from ban?", value: areAltAccountsExcluded, inline: true },
                  { name: ":pager: Is ban inherited?", value: isBanInherited + " (aka is this an alt ban?)", inline: true },
                  { name: ":hammer: Public Ban Reason", value: "`" + publicBanReason + "`" },
                  { name: ":hammer: Private Ban Reason", value: "||`" + privateBanReason + "`||" },
                ]
              }
            } else {
              embed = {
                ["title"]: ":pager: View Ban - `" + gameName + "`",
                ["footer"]: defaultFooter + " • Took " + (timeend - timestart) + "ms",
                ["thumbnail"]: await getRobloxAvatarPic(userId, 150, "avatar-headshot"),
                ["color"]: 0x002060,
                ["fields"]: [
                  { name: ":identification_card: User", value: "**[" + userName + "](https://www.roblox.com/users/" + userId + "/profile)** (" + userId + ")", inline: true },
                  { name: ":name_badge: Currently banned?", value: isBanned, inline: true },
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
                  Text: userName + " (" + userId + ")",
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
                      { name: ":pager: Status Code:", value: statusCode },
                      { name: ":bangbang: Error Message:", value: "`" + data + "`" }
                    ]
                  }
                },
              }
            ]

            shareData(dataToSend)
          }
        })
        break;
      }

      case "Ping": {
        var dataToSend = [
          {
            MessageTo: "discordbot.js",
            Type: "Pong",
          }
        ]

        shareData(dataToSend)
        break;
      }

      case "RobloxAPIPing": {
        var { message, success } = await pingWebsite("apis.roblox.com")
        //console.log(robloxPing, isSuccess)

        var dataToSend = [
          {
            MessageTo: "discordbot.js",
            Type: "RobloxAPIPong",
            Payload: { Success: success, Ping: message }
          }
        ]

        shareData(dataToSend)
        break;
      }

      case "MZRPGOutfitDelete": {
        var outfitId = data.Payload.Arguements[0]
        var serverId = data.Payload.ServerToSendTo
        var channelId = data.Payload.OriginalChannelId
        var userId = data.Payload.Arguements[1]

        gotExports.mzrpgwebhook.OutfitDeleteRequest(outfitId, [serverId, channelId, userId])
        break;
      }

      case "MZRPGOutfitsLookup": {
        var userId = data.Payload.Arguements[0]
        var serverId = data.Payload.ServerToSendTo
        var channelId = data.Payload.OriginalChannelId
        var discordUserId = data.Payload.Arguements[1]

        gotExports.mzrpgwebhook.OutfitsLookupRequest(userId, [serverId, channelId, discordUserId])
        break;
      }

      case "MZRPGAsseBlockAdd": {
        var assetId = data.Payload.Arguements[0]
        var serverId = data.Payload.ServerToSendTo
        var channelId = data.Payload.OriginalChannelId
        var userId = data.Payload.Arguements[1]

        gotExports.mzrpgwebhook.AssetBlockAdd(assetId, [serverId, channelId, userId])
        break;
      }
    }
  }
}

process.on('message', (data) => {
  //console.log("Received on Webhook")
  handleSharedData(data)
});