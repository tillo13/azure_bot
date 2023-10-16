//2023oct12 update to save to db
const { botRouterSaveDataToPostgres } = require('./utilities/postgres_utils');

const PATH_CONFIGS = {
	'msteams': {
		personality: "You are thorough, polite, helpful and courteous.",
		welcomeMessage: "Howdy! Welcome to our Microsoft Teams chat!",
		messagePrefix: "teams_path"
	},
	'slack': {
		personality: "You are thorough, polite, helpful and courteous.",
		welcomeMessage: "Greetings earthling, welcome to our Slack channel!",
		messagePrefix: "slack_path"
	},
	'webchat': {
		personality: "You are thorough, polite, helpful and courteous.",
		welcomeMessage: "Ahoy! Welcome to our webchat channel!",
		messagePrefix: "default_path"
	}
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
const {
	postMessageToSlack
} = require('./bot_behaviors/slack_utils');
const specialCommands = require('./bot_behaviors/special_commands');

const WELCOMED_USER = 'welcomedUserProperty';
const CHAT_MESSAGES = 'chatMessagesProperty';
const THREAD_TS = 'thread_ts';
//const PERSONALITY_OF_BOT = "You talk like an old cowboy! You are a helpful chatbot from Teradata. As a crucial aspect of your function, ensure you always reference past user and assistant prompts in the thread for the best understanding in order to respond effectively.";

class EchoBot extends ActivityHandler {
	constructor(userState) {
		super();
		//DEBUG// console.log("\n\n**BOT_ROUTER.JS: EchoBot constructor has been called with userState: ", userState);

		this.welcomedUserProperty = userState.createProperty(WELCOMED_USER);
		this.chatMessagesProperty = userState.createProperty(CHAT_MESSAGES);
		this.threadproperty = userState.createProperty(THREAD_TS);
		this.botInvokedFlag = userState.createProperty('botInvokedFlag');
		this.userState = userState;
		// During bot initialization via msteams addition
		this.isFirstInteraction = userState.createProperty('isFirstInteraction');
		this.onReactionsAdded(this.handleMsTeamsReaction.bind(this));


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
			// save each payload to db regardless 2023oct12
			try {
				const filename_ingress = "bot_router.js";
				await botRouterSaveDataToPostgres(context.activity, context.activity.channelId, filename_ingress);
			} catch (err) {
				console.error('\n\n**BOT_ROUTER.JS: Failed to save data to Postgres at botRouter path: ', err);
			}
			try {
				const messageContent = context.activity.text.trim();
		
				console.log("\n\n**BOT_ROUTER.JS: Message content: ", context.activity.text);
		
				// Insert the following block here.
				if (specialCommands[messageContent]) {
					console.log("\n\n**BOT_ROUTER.JS: A special command has been detected.");
					console.log("\n\n**BOT_ROUTER.JS: Command content: ", context.activity.text);
		
					// If the command exists in our special commands, execute it.
					await specialCommands[messageContent](context, this.chatMessagesProperty);
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
		
					handled = await handleMessageFromMSTeams(context, chatMessagesUser, isFirstInteraction, this.isFirstInteraction, PATH_CONFIGS['msteams']) || handled;
		
					if (handled) {
						await this.chatMessagesProperty.set(context, chatMessagesUser);
						return;
					}
		
					handled = await handleMessageFromSlack(context, chatMessagesUser, this.threadproperty, this.botInvokedFlag, this.threadproperty, personality, PATH_CONFIGS['slack']);
		
					if (handled) {
						await this.chatMessagesProperty.set(context, chatMessagesUser);
						return;
					}
		
					handled = await handleDefault(context, chatMessagesUser, personality);
		
					if (handled) {
						await this.chatMessagesProperty.set(context, chatMessagesUser);
						await next();
						return;
					} 
		
					// After you save to postgres, call the next() function to continue to the next middleware in your pipeline.
					await next();
				}
			} catch (error) {
				console.error("\n\n**BOT_ROUTER.JS: An error occurred:", error);
				if (error.type === 'content_filter') {
					await context.sendActivity(error.message); // Send error message to user only for content_filter errors
				}
			}
		});
	}
	async handleMsTeamsReaction(context) {
		try {
			if (context.activity.channelId === 'msteams') {
				// Get the reaction added by the user
				const userReaction = context.activity.reactionsAdded[0];

				// Extract information from the reaction
				const userId = context.activity.from?.id;
				const emoji = userReaction?.type;
				const messageId = context.activity.replyToId;

				// Log the details to the console
				console.log(`\n\n**BOT_ROUTER.JS: Someone reacted to a MSteams post! Here are the details:
				\nThe userid is: ${userId}
				\nThe emoji is: ${emoji}
				\nThe messageID of the emoji is: ${messageId}`);
			}
		} catch (error) {
			console.error('\n\n**BOT_ROUTER.JS:Failed to handle reaction:', error);
		}
	}
	async run(context) {
		//DEBUG console.log('\n\n**BOT_ROUTER.JS: Running the bot with context: ', context);
		await super.run(context);
		await this.userState.saveChanges(context);
		//DEBUG console.log('\n\n**BOT_ROUTER.JS: Running the bot with context: ', context);
	}
}
module.exports.EchoBot = EchoBot;