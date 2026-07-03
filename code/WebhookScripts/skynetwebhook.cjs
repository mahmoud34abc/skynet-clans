//things to be imported via the init function
var shared

function init(sharedTable) {
  shared = sharedTable
}

var defaultFooter = "Skynet Clans • Version " + process.env.VERSION + " • Hosting on: " + process.env.HOSTING

async function webhook(body, response) {
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
                { name: ":speech_balloon: Feedback", value: originalfeedbackmessage },
                //{name: ":globe_with_meridians: Translation", value: translatedText},
                { name: ":mobile_phone: On Mobile?", value: mobilestatus, inline: true },
                { name: ":pager: User ID", value: userid, inline: true },
                { name: ":link: Profile Link", value: "[" + username + "](https://www.roblox.com/users/" + userid + "/profile)", inline: true }
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
  }
}

module.exports = {
  init: init,
  webhook: webhook
}