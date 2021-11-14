function website() {
  const express = require("express");
  const bodyParser = require("body-parser");
  const app = express();
  
  app.disable('x-powered-by');
  app.use(bodyParser.urlencoded({ extended: true })); //to be able to parse the requests' bodies
  app.use(bodyParser.json());

  app.use(express.static("public")); //put anything in the public/ folder accessible (for website) (like css, js, etc.)

  //make a test json and put it in the clans saves
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
  // Create a Configstore instance.
  const Conf = require("conf");
  const config = new Conf();

  //if (config.has("clantest") === false) {
  //   config.set(testJson.clanid, testJson);
  //   config.set("123456",testJson.clanid)
  //} else {
  //  config.set(testJson.clanid, testJson);
  //  config.set("123456",testJson.clanid)
  //  console.log(config.size - 1, "saved data"); // the - 1 is because there is an already set test clan thing
  //}

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
           for (const [key2, value2] of Object.entries(clanowner)) {
             newclan.clanowner[key2] = value2
             var ownerid = key2
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
       }
     }
    response.send(responseBody).status(200)
  }); //listener for post requests (webhook)
  
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
  
  function makeClanID(str) {
    var name = cleanseString(str);
    var randomnumber = Math.floor(Math.random() * 8999 + 1000);
    return name + "-" + randomnumber;
  }
  
  function isDict(o) {
    var string = JSON.stringify(o);
    return string.startsWith("{") && string.endsWith("}")
  }
  
  function routineCheck() {
    var currentTime = Date.now()
    
    var clansstore = config.store
    for (const [key, value] of Object.entries(clansstore)) {
      if (isDict(value) && ("type" in value) && value.type === "clan") {
        if ((value.lastonline + 60*4000) < currentTime) {
          value.clanactivity = "offline"
        }
      }
    }
    config.store = clansstore
  }
  routineCheck();
  setInterval(routineCheck, 60*4000);
  
  // listen for requests :)
  var listener = app.listen(process.env.PORT, () => {
    console.log(`Your app is listening on port ${listener.address().port}`);
  });
}

module.exports = website;