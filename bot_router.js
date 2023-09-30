const PATH_CONFIGS = {
    'msteams': {
        personality: "You talk like an old cowboy.",
        welcomeMessage: "Howdy partner, welcome to our Microsoft Teams chat!"
    },
    'slack': {
        personality: "You talk like a Space Merchant.",
        welcomeMessage: "Greetings earthling, welcome to our Slack channel!"
    },
	'webchat': {
        personality: "You talk like a salty pirate.",
        welcomeMessage: "Ahoy! , welcome to our webchat channel!"
    },
    // add more paths as required
};

const {
	ActivityHandler,
	MessageFactory
} = require('botbuilder');
const {
	handleMessageFromMSTeams,
	handleMessageFromSlack,
	handleDefault
} = require('./bot_behaviors/message_handler');
const { postMessageToSlack } = require('./bot_behaviors/slack_utils');
const specialCommands = require('./bot_behaviors/special_commands');

const WELCOMED_USER = 'welcomedUserProperty';
const CHAT_MESSAGES = 'chatMessagesProperty';
const THREAD_TS = 'thread_ts';
//const PERSONALITY_OF_BOT = "You talk like an old cowboy! You are a helpful chatbot from Teradata. As a crucial aspect of your function, ensure you always reference past user and assistant prompts in the thread for the best understanding in order to respond effectively.";

class EchoBot extends ActivityHandler {
	constructor(userState) {
		super();
		this.welcomedUserProperty = userState.createProperty(WELCOMED_USER);
		this.chatMessagesProperty = userState.createProperty(CHAT_MESSAGES);
		this.threadproperty = userState.createProperty(THREAD_TS);
		this.botInvokedFlag = userState.createProperty('botInvokedFlag');
		this.userState = userState;
		// During bot initialization via msteams addition
		this.isFirstInteraction = userState.createProperty('isFirstInteraction');

		this.onMembersAdded(async (context, next) => {
			console.log("\n\n**BOT_ROUTER.JS: A member(s) has been added to the chat");
			console.log("\n\n**BOT_ROUTER.JS: The ids of the added members are: ", context.activity.membersAdded.map(member => member.id));
			const membersAdded = context.activity.membersAdded;
		
			// Get the path specific config here
			const pathConfig = PATH_CONFIGS[context.activity.channelId];
			const welcomeText = pathConfig ? pathConfig.welcomeMessage : "Hello and welcome to our chat!";
		
			for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
				if (membersAdded[cnt].id !== context.activity.recipient.id) {
					await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
				}
			}
			await next();
		});

		this.onMessage(async (context, next) => {
			try {
                const messageContent = context.activity.text.trim();
				console.log('\n\n**BOT_ROUTER.JS: onMessage triggered!');
				console.log("\n\n**BOT_ROUTER.JS: Message content: ", context.activity.text);

				// Log interaction to Slack
				const slackApiToken = process.env.SLACK_BOT_TOKEN;
				const slackChannelId = 'C05UMRHSLR2';
				let username;
				let id;

				if (context.activity.channelId === 'webchat') {
				username = 'webchat';
				id = context.activity.id; 
				} else if (context.activity.channelId === 'slack') {
				username = context.activity.from.name;
				id = context.activity.from.id;
				} else if (context.activity.channelId === 'msteams') {
				username = context.activity.from.name; 
				id = context.activity.from.aadObjectId; 
				} else {
					// Default case
					username = 'unknown';
					id = 'unknown';
				}

				const slackBlocks = {
				"blocks": [
					{
					"type": "section",
					"text": {
						"type": "mrkdwn", 
						"text": `:information_source: *Incoming interaction:*\n*Source:* \`${context.activity.channelId}\`\n*User ID:* \`${id}\`\n*Username:* \`${username}\`\n*User Payload:* \`${context.activity.text}\``  
					}
					},
					{
					"type": "divider" 
					},
					{
					"type": "context",
					"elements": [
						{
						"type": "mrkdwn",
						"text": `:robot_face: _Message ID: ${context.activity.id}_` 
						}
					]
					}
				]
				};

				// Send message to Slack 
				await postMessageToSlack(slackChannelId, null, slackBlocks, slackApiToken);


                if (specialCommands[messageContent]) {
                    console.log("\n\n**BOT_ROUTER.JS: A special command has been detected.");
                    console.log("\n\n**BOT_ROUTER.JS: Command content: ", context.activity.text);
                    // If the command exists in our special commands, execute it
                    await specialCommands[messageContent](context);
                } else {
					const pathConfig = PATH_CONFIGS[context.activity.channelId];
					const personality = pathConfig ? pathConfig.personality : "Default personality";
					let chatMessagesUser = await this.chatMessagesProperty.get(context, []) || [];
					chatMessagesUser.push({
						role: "user",
						content: context.activity.text
					});

					let isFirstInteraction = await this.isFirstInteraction.get(context, true);
					let handled = false;
                    //handled = await handleMessageFromMSTeams(context, chatMessagesUser, isFirstInteraction, this.isFirstInteraction, personality) || handled;
					handled = await handleMessageFromMSTeams(context, chatMessagesUser, this.isFirstInteraction, pathConfig.personality) || handled;


                    if (handled) {
                          await this.chatMessagesProperty.set(context, chatMessagesUser);
                          return;
                    } 
                    
                    handled = await handleMessageFromSlack(context, chatMessagesUser, this.threadproperty, this.botInvokedFlag, this.threadproperty, personality);                    
					if (handled) {
						
                          await this.chatMessagesProperty.set(context, chatMessagesUser);
                          return;
                    } 
                                        
                    // If not handled by MSTeams or Slack, call the default handler
                    handled = await handleDefault(context, chatMessagesUser, personality);
                    if (handled) {
                          await this.chatMessagesProperty.set(context, chatMessagesUser);
                          await next();
                          return;
                    }
				}
			} catch (error) {
				console.error("**BOT_ROUTER.JS: An error occurred:", error);
			}
		});
	}

	async run(context) {
		console.log('\n\n**BOT_ROUTER.JS: Running the bot...');
		await super.run(context);
		await this.userState.saveChanges(context);
		console.log('\n\n**BOT_ROUTER.JS: State changes have been saved.');
	}
}
module.exports.EchoBot = EchoBot;