var restify = require('restify');
var builder = require('botbuilder');
var moment = require('moment');

//model from LUIS api
var model = "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/1cfc40cb-8baf-425b-b199-5d4064adbab1?subscription-key=138e101b1c524ed2bbbcd05fd2ae56ba&verbose=true&timezoneOffset=0.0&q=";
var recognizer = new builder.LuisRecognizer(model);
var intents = new builder.IntentDialog({ recognizers: [recognizer] });


// Symptom storage
var symptomList = [];

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
var bot = new builder.UniversalBot(connector, {persistConversationData: true});
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/collectData', intents);

bot.dialog('/', [function(session) {
  builder.Prompts.text(session, "Good " + timeOfDay + "! I am Doc. What is your name?");
}, function(session, results) {
  session.conversationData.name = results.response;
  builder.Prompts.text(session, "Nice to meet you " + session.conversationData.name + "! How are you feeling this " + timeOfDay + "?");
  session.beginDialog('collectData');
}]);



//=========================================================
// Intent Handlers
//=========================================================
// dialog.matches('CollectSymptom', builder.DialogAction.send('Recognized symptom: '));
intents.onDefault(builder.DialogAction.send("I'm sorry I didn't understand."));

intents.matches('CollectSymptom', [
  function(session, args, next) {
    //resolve/store entities passed from LUIS
    var title = builder.EntityRecognizer.findEntity(args.entities, 'Symptom');
    builder.Prompts.text(session, "Recognized symptom: " + title.entity);
  }
]);

// bot.dialog('/introduction', function(session) {
//   builder.Prompts.text(session, "Good " + timeOfDay + "! I am Doc. What is your name?");
// })

bot.dialog('/queryPatient', function(session) {
  builder.Promps.text(session, "Have you any other problems?");
}, function(session, results) {
  var neg = results.match(/(^|\s+)no(\s+|$)/);
  neg = neg.filter(v=>v!=' ');
  if (neg.length > 0) {
    bot.dialog('makeDiagnosis');
    builder.Promps.text(session, "Diagnosing symptoms...");
  }
});


// intents.matches(/^No/i, [
//     function (session) {
//         session.beginDialog('/makeDiagnosis');
//     },
//     function (session, results) {
//         session.send('Ok... Let me see what is wrong with you. ');
//     }
// ]);
//
// intents.onDefault([
//     function (session) {
//       session.beginDialog('/ensureProfile', session.conversationData.profile);
//     },
//     function (session, results) {
//       session.conversationData.profile = results.response;
//       session.send("Hi %(name)s! ", session.conversationData.profile);
//     },
//     function (session) {
//       session.beginDialog('/symptomAnalysis', session.conversationData.profile);
//     }
// ]);
//
// bot.dialog('/ensureProfile', [
//     function (session, args, next) {
//       session.dialogData.profile = args || {};
//       if (!session.dialogData.profile.name) {
//           builder.Prompts.text(session, "Hi there! What&#39;s your name?");
//       } else {
//           next();
//       }
//     },
//     function (session, results, next) {
//       if (results.response) {
//           session.dialogData.profile.name = results.response;
//           session.send("Hi %(name)s! ", session.conversationData.profile);
//       }
//       session.endDialogWithResult(
//       { response: session.dialogData.profile });
//     }
// ]);
//
// bot.dialog('/symptomAnalysis', [
//     function (session, args, next) {
//       builder.Prompts.text(session, "How are you feeling?");
//     },
//     function (session, results, next) {
//       symptomList.push(results.response);
//       session.endDialogWithResult(
//       { response: session.dialogData.profile });
//     }
//
// ]);
