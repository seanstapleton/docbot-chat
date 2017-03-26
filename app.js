var restify = require('restify');
var builder = require('botbuilder');
var moment = require('moment');

//model from LUIS api
var model = "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/1cfc40cb-8baf-425b-b199-5d4064adbab1?subscription-key=138e101b1c524ed2bbbcd05fd2ae56ba&verbose=true&timezoneOffset=0.0&q=";
var recognizer = new builder.LuisRecognizer(model);
var intents = new builder.IntentDialog({ recognizers: [recognizer] });


// Symptom storage
var symptomList = [""];

var m = moment();
var timeOfDay = (m.hour() < 12) ? "morning" : (m.hour() < 5) ? "afternoon" : "evening";

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/collectData', intents);

bot.dialog('/', [
  function(session, args, next) {
    builder.Prompts.text(session, "Good " + timeOfDay + "! I am Doc. What is your name?");
  },
  function(session, results) {
    session.userData.name = results.response;
    session.send("Nice to meet you " + session.userData.name + "! How are you feeling this " + timeOfDay + "?");
    session.beginDialog('/collectData');
  }
]);

// bot.dialog('/', [
//   function(session, args, next) {
//     session.beginDialog("/makeDiagnosis");
//   }
// ]);

// bot.dialog('/', [
//     function (session, args, next) {
//         if (session.userData.name) {
//             session.beginDialog('/profile');
//         } else {
//             next();
//         }
//     },
//     function (session, results) {
//         session.send('Hello %s!', session.userData.name);
//     }
// ]);

//=========================================================
// Intent Handlers
//=========================================================
// dialog.matches('CollectSymptom', builder.DialogAction.send('Recognized symptom: '));
intents.onDefault([function(session) {
  builder.DialogAction.send("I'm sorry I didn't understand. Could you try to rephrase it?");
  session.beginDialog("/collectData");
}]);

intents.matches('CollectSymptom', [
  function(session, args, next) {
    //resolve/store entities passed from LUIS
    var title = builder.EntityRecognizer.findEntity(args.entities, 'Symptom');
    if (title == null) title = {entity: "unknown"};
    session.send("Recognized symptom: " + title.entity);
    symptomList.push(title.entity);
    session.beginDialog('/queryPatient');
  }
]);

// bot.dialog('/introduction', function(session) {
//   builder.Prompts.text(session, "Good " + timeOfDay + "! I am Doc. What is your name?");
// })

bot.dialog('/queryPatient', [function(session, args, next) {
  builder.Prompts.confirm(session, "Have you any other problems?");
}, function(session, results) {
  var neg = results.response.toLowerCase().search("no");
  if (neg != -1) {
    session.send("Diagnosing symptoms...");
    session.beginDialog('/makeDiagnosis');
  } else {
    session.send("What else is wrong?");
    session.beginDialog('/collectData');
  }
}]);

bot.dialog('/makeDiagnosis', [function(session, args, next) {
  console.log(symptomList);
  PostCode(symptomList, function(diagnosis) {
    session.send(diagnosis);
  });

}]);

var querystring = require('querystring');
var http = require('http');
var fs = require('fs');

function PostCode(codestring, callback) {
  // Build the post string from an object
  var post_data = querystring.stringify({
      'compilation_level' : 'ADVANCED_OPTIMIZATIONS',
      'output_format': 'json',
      'output_info': 'compiled_code',
        'warning_level' : 'QUIET',
        'js_code' : codestring
  });

  // An object of options to indicate where to post to
  var post_options = {
      host: 'hidocbot.herokuapp.com',
      port: '80',
      path: '/diagnose',
      method: 'POST',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(post_data)

      }
  };

  var str;
  // Set up the request
  var post_req = http.request(post_options, function(res) {
    let rawData = "";
      res.setEncoding('utf8');
      res.on('data', (chunk) => rawData += chunk);
      res.on('end', () => {
        try {
          console.log(rawData);
          callback(rawData);
        } catch (e) {
          console.log("error ", e.message);
        }
      });
  });


  // post the data
  post_req.write(post_data);
  post_req.end();


}
