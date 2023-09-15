// Import UserState class
const { UserState } = require('botbuilder');
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

server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`\n${ server.name } listening to ${ server.url }`);
    console.log('\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator');
    console.log('\nTo talk to your bot, open the emulator select "Open Bot"');
});

// Initialize the EchoBot with the UserState
const myBot = new EchoBot(userState);

// Listen for incoming requests.
server.post('/api/messages', async (req, res) => {
    console.log("Incoming request to /api/messages endpoint");
    await adapter.process(req, res, (context) => myBot.run(context));
    console.log("Finished processing request");
});

server.on('upgrade', async (req, socket, head) => {
    console.log("Handling upgrade request");
    const streamingAdapter = new CloudAdapter(botFrameworkAuthentication);
    streamingAdapter.onTurnError = onTurnErrorHandler;
    await streamingAdapter.process(req, socket, head, (context) => myBot.run(context));
    console.log("Finished handling upgrade request");
});