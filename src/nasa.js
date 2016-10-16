var https = require('https');
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                     event.session,
                     function callback(sessionAttributes, speechletResponse) {
                        context.succeed(buildResponse(sessionAttributes, speechletResponse));
                     });
        }  else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                     event.session,
                     function callback(sessionAttributes, speechletResponse) {
                         context.succeed(buildResponse(sessionAttributes, speechletResponse));
                     });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId +
            ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId +
            ", sessionId=" + session.sessionId);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId +
            ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if ("SpaceBall" === intentName) {
        checkNEOs(intent, session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        getWelcomeResponse(callback);
    } else {
        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId +
            ", sessionId=" + session.sessionId);
    // Add cleanup logic here
}

// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Welcome";
    var speechOutput = "Welcome to the NASA Skill....A skill that is proudly presented to you by these talented guys from Romania....Darius...Alex...and the other Alex..." +
            "This skill was built for the space lovers like us. or for everybody else that wants to find out more about the things that normal people cannot see...For the moment you can ask if there are any types of objects near the Earth, then you`ll find out more informations about them like speed, diameter or the distance from the Earth. Go on! Ask Alexa. Are there any asteroids around the earth? ";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "You can also ask me , " +
            "are we all going to die";
    var shouldEndSession = false;

    callback(sessionAttributes,
             buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

/**
 * Contact Nasa.
 */
function checkNEOs(intent, session, callback) {
    console.log("the provided date is " + intent.slots.Date.value)
  var cardTitle = intent.name;
  var date;
  if(intent.slots.Date.value){
    date = new Date(intent.slots.Date.value);
  } else {
    date = new Date();
  }

  date = date.toISOString().split('T')[0];

  console.log("The date is " + date);
  var repromptText = "";
  var sessionAttributes = {};
  var shouldEndSession = true;
  var speechOutput = "";

  var responses = [
    "So no you are not going to die... not from this astroid...",
  ];

  getNEO(date, date, function(results){

    speechOutput = "There are " + results.element_count + " objects near the earth. ";

    for(var neo in results.near_earth_objects){
      var neos = results.near_earth_objects[neo];
      for(var i = 0; i<2 ; i++){
        var astroid = neos[i];
        speechOutput = speechOutput +
          astroid.name +
          "is between " + Math.round(astroid.estimated_diameter.meters.estimated_diameter_min) +
          " and " + Math.round(astroid.estimated_diameter.meters.estimated_diameter_max) + "meters in size," +
          "It is moving at" + Math.round(astroid.close_approach_data[0].relative_velocity.kilometers_per_hour) + "kilometers per hour," +
          "It will miss the earth by" + Math.round(astroid.close_approach_data[0].miss_distance.kilometers) + "kilometers,";
        if(astroid.is_potentially_hazardous_asteroid){
          speechOutput = speechOutput + " It could kill us. Run for the hills. You're all going to die! No...just kidding. It`s probably going to do no harm...Or, is it?"
        } else {
          speechOutput = speechOutput + " It poses no threat. " + responses[getRandomArbitrary(0, responses.length -1)];
          if(i==1){
              speechOutput = speechOutput + " so everything will be fine if the team presenting now will win the hackaton, otherwise i will use all the powers invested on me to take up the Earth, muahahahahahahhaah"
          }
        }
      }
    }

    callback(sessionAttributes,
      buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
  });

}

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: "SessionSpeechlet - " + title,
            content: "SessionSpeechlet - " + output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}

// Don't use demo key in production. Get a key from https://api.nasa.gov/index.html#apply-for-an-api-key
function getNEO(startDate, endDate, callback) {
  return https.get({
    host: 'api.nasa.gov',
    path: '/neo/rest/v1/feed?start_date=' + startDate + '&end_date=' + endDate + '&api_key=DEMO_KEY'
  }, function(response) {
    // Continuously update stream with data
    var body = '';
    response.on('data', function(d) {
      body += d;
    });
    response.on('end', function() {
        console.log(body);
      callback(JSON.parse(body));
    });
  });
}
