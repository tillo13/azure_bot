// Load environment variables at the top-most level
require('dotenv').config();

const { UserState, MemoryStorage, CloudAdapter, ConfigurationServiceClientCredentialFactory, createBotFrameworkAuthenticationFromConfiguration } = require('botbuilder');

const path = require('path');
const restify = require('restify');
const { EchoBot } = require('./bot_router');

const server = restify.createServer();
server.use(restify.plugins.bodyParser());

const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
    MicrosoftAppId: process.env.MicrosoftAppId,
    MicrosoftAppPassword: process.env.MicrosoftAppPassword,
    MicrosoftAppType: process.env.MicrosoftAppType,
    MicrosoftAppTenantId: process.env.MicrosoftAppTenantId
});

const botFrameworkAuthentication = createBotFrameworkAuthenticationFromConfiguration(null, credentialsFactory);

// Create adapter.
const adapter = new CloudAdapter(botFrameworkAuthentication);

// Create User State
let userState = new UserState(new MemoryStorage());


// Approved user IDs
const approvedUsers = {
  msteams: ['no_62ac1db2-f244-4609-b7ac-54bfd504d430'], // Your aadObjectId in msteams
  webchat: ['582d61fc-24bd-4a3e-b79c-d138ac474db3'], // Your id in webchat
  slack: ['U05SPUT1WQ0:T3PKF164B'], // Your id in slack
};

// Catch-all for errors.
const onTurnErrorHandler = async (context, error) => {
    console.error("\n[onTurnError]", error);
    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${ error }`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );
    await context.sendActivity(`The bot encountered an error or bug. Error Details: ${ error.message}`);
};

adapter.onTurnError = onTurnErrorHandler;

// Server start
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log("\n\n*INDEX.JS: Server is starting up...\n");
});

// EchoBot initialization
console.log("\n\n*INDEX.JS: Initializing the EchoBot with User State...\n");
const myBot = new EchoBot(userState);

// Listen for incoming requests.
server.post('/api/messages', async (req, res) => {
    console.log("\n\n*INDEX.JS: Incoming request to /api/messages endpoint\n");
    console.log("\n\n*INDEX.JS: Request payload: \n", req.body, "\n"); // Logs the entire request payload
    console.log("\n\n*INDEX.JS: Request source IP: \n", req.socket.remoteAddress, "\n");// Logs the origin IP address
    
    const channelId = req.body.channelId;
    const userId = req.body.from.id;

    // Check if the user is in the approved list
    if (approvedUsers[channelId].includes(userId)) {
        console.log("\n\n*INDEX.JS: Processing the request...\n");
        await adapter.process(req, res, (context) => myBot.run(context));
        console.log("\n\n*INDEX.JS: Finished processing most recent api/messages request!\n");
    } else {
        console.log("\n\n*INDEX.JS: User not in the approved list...\n");
        res.send(403, 'Permission Denied - Contact Andy Tillo if you think this is incorrect.');
    }
});

// Add a GET endpoint to receive the Azure Function health check created in Azure portal to keepalive.
server.get('/ping', async (req, res) => {
  res.send(200, 'Tell KeepAzureBotAlive function that I am alive!');
  console.log("\n\n*INDEX.JS: Received Azure KeepAzureBotAlive request...\n");
});

// Listen for SIGTERM and SIGINT signals
process.on('SIGTERM', () => {
    console.log('\n*INDEX.JS: Received SIGTERM, shutting down gracefully...');
    server.close(() => {
      console.log('\n*INDEX.JS: Closed out remaining connections');
      // Here you can do other cleanup actions before your app is actually terminated, if needed
      process.exit(0);
    });
});
  
process.on('SIGINT', () => {
    console.log('\n*INDEX.JS: Received SIGINT, shutting down gracefully...');
    server.close(() => {
      console.log('\n*INDEX.JS: Closed out remaining connections');
      // Here you can do other cleanup actions before your app is actually terminated, if needed
      process.exit(0);
    });
});

// Upgrade request handling
server.on('upgrade', async (req, socket, head) => {
    console.log("\n\n*INDEX.JS: Handling upgrade request\n");
    console.log("*\n\n*INDEX.JS: Initializing CloudAdapter for upgrade request...\n");
    const streamingAdapter = new CloudAdapter(botFrameworkAuthentication);
    console.log("\n\n*INDEX.JS: Setting turn error handler for the streaming adapter...\n");
    streamingAdapter.onTurnError = onTurnErrorHandler;
    console.log("\n\n*INDEX.JS: Processing upgrade request...\n");
    await streamingAdapter.process(req, socket, head, (context) => myBot.run(context));
    console.log("\n\n*INDEX.JS: Finished handling upgrade request\n");

});