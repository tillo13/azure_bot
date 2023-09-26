const { UserState } = require('botbuilder');
const { MemoryStorage } = require('botbuilder');
const path = require('path');
const restify = require('restify');
const dotenv = require('dotenv');
const ENV_FILE = path.join(__dirname, '.env');
dotenv.config({ path: ENV_FILE });

const {
    CloudAdapter,
    ConfigurationServiceClientCredentialFactory,
    createBotFrameworkAuthenticationFromConfiguration
} = require('botbuilder');

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
    console.log("***\nINDEX.JS: Server is starting up...\n");
    console.log("***\nINDEX.JS: Server is now listening to " + server.url + "\n");
    console.log("***\nINDEX.JS: Get Bot Framework Emulator at https://aka.ms/botframework-emulator \n");
    console.log("***\nINDEX.JS: To talk to your bot, open the emulator and select 'Open Bot'\n");
});

// EchoBot initialization
console.log("***\nINDEX.JS: Initializing the EchoBot with User State...\n");
const myBot = new EchoBot(userState);

// Listen for incoming requests.
server.post('/api/messages', async (req, res) => {
    console.log("***\nINDEX.JS: Incoming request to /api/messages endpoint\n");
    console.log("***\nINDEX.JS: Request payload: \n", req.body, "\n"); // Logs the entire request payload
    console.log("***\nINDEX.JS: Request source IP: \n", req.socket.remoteAddress, "\n");// Logs the origin IP address
    console.log("***\nINDEX.JS: Processing the request...\n");
    await adapter.process(req, res, (context) => myBot.run(context));
    console.log("***\nINDEX.JS: Finished processing request\n");
});


// Upgrade request handling
server.on('upgrade', async (req, socket, head) => {
    console.log("***\nINDEX.JS: Handling upgrade request\n");
    console.log("***\nINDEX.JS: Initializing CloudAdapter for upgrade request...\n");
    const streamingAdapter = new CloudAdapter(botFrameworkAuthentication);
    console.log("***\nINDEX.JS: Setting turn error handler for the streaming adapter...\n");
    streamingAdapter.onTurnError = onTurnErrorHandler;
    console.log("***\nINDEX.JS: Processing upgrade request...\n");
    await streamingAdapter.process(req, socket, head, (context) => myBot.run(context));
    console.log("***\nINDEX.JS: Finished handling upgrade request\n");
});