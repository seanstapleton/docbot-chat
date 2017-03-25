var restify = require('restify');
var builder = require('botbuilder');

// Symptom storage
var symptomList = [];
var symptomIndex = 0;
var newSymptom = function(symptom) {
  symptomList[symptomIndex] = symptom;
  symptomIndex++;
};

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

var intents = new builder.IntentDialog();
//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/', intents);
intents.matches(/^No/i, [
    function (session) {
        session.beginDialog('/makeDiagnosis');
    },
    function (session, results) {
        session.send('Ok... Let me see what is wrong with you. ');
    }
]);

intents.onDefault([
    function (session) {
      session.beginDialog('/ensureProfile', session.userData.profile);
    },
    function (session, results) {
      session.userData.profile = results.response;
      session.send("Hi %(name)s! ", session.userData.profile);
    },
    function (session) {
      session.beginDialog('/symptomAnalysis', session.userData.profile);
    }
]);

bot.dialog('/ensureProfile', [
    function (session, args, next) {
      session.dialogData.profile = args || {};
      if (!session.dialogData.profile.name) {
          builder.Prompts.text(session, "Hi there! What's your name?");
      } else {
          next();
      }
    },
    function (session, results, next) {
      if (results.response) {
          session.dialogData.profile.name = results.response;
          session.send("Hi %(name)s! ", session.userData.profile);
      }
      session.endDialogWithResult(
      { response: session.dialogData.profile });
    }
]);

bot.dialog('/symptomAnalysis', [
    function (session, args, next) {
      builder.Prompts.text(session, "How are you feeling?");
    },
    function (session, results, next) {
      newSymptom(results.response);
      session.endDialogWithResult(
      { response: session.dialogData.profile });
    }

]);
