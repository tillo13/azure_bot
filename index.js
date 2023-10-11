// 2023oct9 8:39am --adding postgres_util
require('dotenv').config();

// declare the GOLDEN_MESSAGE_ID to be carried on to other arms of the platform to follow the path of the user
let GOLDEN_MESSAGE_ID;  

const { botIngressSaveDataToPostgres } = require('./utilities/postgres_utils'); 

const {
	UserState,
	MemoryStorage,
	CloudAdapter,
	ConfigurationServiceClientCredentialFactory,
	createBotFrameworkAuthenticationFromConfiguration
} = require('botbuilder');

const path = require('path');
const restify = require('restify');
const {
	EchoBot
} = require('./bot_router');

const server = restify.createServer();
server.use(restify.plugins.bodyParser());

const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
	MicrosoftAppId: process.env.MicrosoftAppId,
	MicrosoftAppPassword: process.env.MicrosoftAppPassword,
	MicrosoftAppType: process.env.MicrosoftAppType,
	MicrosoftAppTenantId: process.env.MicrosoftAppTenantId
});

const botFrameworkAuthentication = createBotFrameworkAuthenticationFromConfiguration(null, credentialsFactory);
// Azure storage imports
const {
	BlobServiceClient,
	StorageSharedKeyCredential,
	newPipeline
} = require('@azure/storage-blob');


// Azure Blob Storage configuration
const accountName = process.env['2023oct7_AZURE_STORAGE_ACCOUNT_NAME'];
const accountKey = process.env['2023oct7_AZURE_STORAGE_ACCOUNT_KEY'];
const containerName = process.env['2023oct7_AZURE_STORAGE_CONTAINER_NAME'];
const blobName = process.env['2023oct7_AZURE_STORAGE_BLOB_NAME'];

const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
const pipeline = newPipeline(sharedKeyCredential);

// Create blob service client using connection string
const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, pipeline);

// A function to append new user login info to Azure Blob storage
async function appendUserData(username, loginTimestamp, platform) {
    try {
        // Replacing any commas with underscores before storing
        username = username.replace(/,\s+/g, "_");
        // Get container client
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // Get blob client
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        // Download existing blob content
        const downloadResponse = await blockBlobClient.download(0);
        const existingBlobContent = (await streamToBuffer(downloadResponse.readableStreamBody)).toString();

        // Get the last id
        const lastLine = existingBlobContent.split('\n').filter(line => line.length > 1).pop();
        const lastId = lastLine ? parseInt(lastLine.split(',')[0]) : 0;
        const newId = lastId + 1;

        // Create CSV content to append
        const csvData = `${newId},${username},${loginTimestamp},${platform}\r\n`;

        // Print the log details
        console.log(`\n*INDEX.JS: Logging interaction: ${newId},${username},${loginTimestamp},${platform}`);

        // Create new blob content by appending new CSV data to the existing blob content
        const newBlobContent = existingBlobContent + csvData;

        // Upload new blob content
        const uploadBlobResponse = await blockBlobClient.upload(newBlobContent, Buffer.byteLength(newBlobContent));
        console.log(`\n*INDEX.JS: Upload block blob ${blobName} successfully`, uploadBlobResponse.requestId);
    } catch (error) {
        // Log the error
        console.error(`\n*INDEX.JS: Error logging user data: ${error.message}`);
    }
}

// Convert stream to buffer
function streamToBuffer(readableStream) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		readableStream.on("data", (data) => {
			chunks.push(data instanceof Buffer ? data : Buffer.from(data));
		});
		readableStream.on("end", () => {
			resolve(Buffer.concat(chunks));
		});
		readableStream.on("error", reject);
	});
}

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
	console.log("\n\n*INDEX.JS: Server is starting up...\n");
});

// EchoBot initialization
console.log("\n\n*INDEX.JS: Initializing the EchoBot with User State...\n");
const myBot = new EchoBot(userState);

// Listen for incoming requests.
server.post('/api/messages', async (req, res) => {
    if (req.body) {
        let userName = req.body.from ? req.body.from.name || 'undefined' : 'undefined';
        const platform = req.body.channelId || 'undefined';
        let userId = 'undefined';
        if (platform === 'msteams' && req.body.from.aadObjectId && userName !== 'undefined') {
            userId = userName + '|' + req.body.from.aadObjectId;
        } else if (platform === 'webchat') {
            userId = req.body.conversation.id;
        } else if (platform === 'slack' && userName !== 'undefined' && req.body.from.id) {
            userId = req.body.from.id + '|' + userName;
        } else if (req.body.from.id) {
            userId = req.body.from.id;
        }
        const currentTimestamp = Math.floor(Date.now() / 1000); // Timestamp in seconds
        console.log(`*INDEX.JS: Logging interaction: ${userId},${userName},${currentTimestamp},${platform}`);
        await appendUserData(userId, currentTimestamp, platform);
    }
	let msg_id = req.body.id; // retrieve the message id
	let GOLDEN_MESSAGE_OBJ = { id: null }; //Wrap GOLDEN_MESSAGE_ID in an object
	GOLDEN_MESSAGE_OBJ.id = req.body.id; // assign the id to GOLDEN_MESSAGE_ID to carry throughout the app
	GOLDEN_MESSAGE_ID = GOLDEN_MESSAGE_OBJ.id; // assign the id to GOLDEN_MESSAGE_ID to carry throughout the app
		console.log(`\n\n*INDEX.JS: This message GOLDEN_MESSAGE_ID will be: ${GOLDEN_MESSAGE_ID}\n`);


		req.body.filename_ingress = 'index.js'; // add the filename to the request body
		// Log the data to a Postgres database:
		botIngressSaveDataToPostgres(req.body, req.body.channelId);


	// if id doesn't exist, set it to an empty string
	if (typeof msg_id === 'undefined') {
		msg_id = '';
	} else {
		msg_id = ` Message ID: ${msg_id}`;
	}

	console.log(`\n\n*INDEX.JS: Incoming request to /api/messages endpoint.${msg_id}\n`);
	console.log("\n\n*INDEX.JS: Request payload: \n", req.body, "\n"); // logs the entire request payload
	//console.log("\n\n*INDEX.JS: Request source IP: \n", req.socket.remoteAddress, "\n"); // logs the origin IP address
	console.log("\n\n*INDEX.JS: Processing the request...\n");

	await adapter.process(req, res, (context) => myBot.run(context));
	console.log(`\n\n*INDEX.JS: Finished processing most recent api/messages request!${msg_id}\n`);
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

module.exports = { GOLDEN_MESSAGE_OBJ };  // export the GOLDEN_MESSAGE_OBJ so everyone else can use it