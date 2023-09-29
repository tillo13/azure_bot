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
const PERSONALITY_OF_BOT = "You talk like an old cowboy! You are a helpful chatbot from Teradata. As a crucial aspect of your function, ensure you always reference past user and assistant prompts in the thread for the best understanding in order to respond effectively.";

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
			const welcomeText = 'Hello and welcome to the memoried ATT-ESS Chat bot!';
			for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
				if (membersAdded[cnt].id !== context.activity.recipient.id) {
					await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
				}
			}
			await next();
		});

		this.onMessage(async (context, next) => {
			try {
                //log interaction to slack
             
                    const slack_channel_id = 'C05UMRHSLR2';  
                    const apiToken = process.env.SLACK_BOT_TOKEN;  
            
                    // Prepare the log message
                    const logMessage = `**BOT_ROUTER.JS: User ID: ${context.activity.from.id} \
                                        \n**BOT_ROUTER.JS: Channel ID (Location): ${context.activity.conversation.id} \
                                        \n**BOT_ROUTER.JS: Timestamp: ${context.activity.timestamp} \
                                        \n**BOT_ROUTER.JS: User Message: ${context.activity.text}`
            
                    // Log the user interaction to the specific Slack channel
                    await postMessageToSlack(slack_channel_id, null, logMessage, apiToken);






				const messageContent = context.activity.text.trim();
				console.log('\n\n**BOT_ROUTER.JS: onMessage triggered');
				console.log("\n\n**BOT_ROUTER.JS: Message content: ", context.activity.text);

                if (specialCommands[messageContent]) {
                    console.log("\n\n**BOT_ROUTER.JS: A special command has been detected.");
                    console.log("\n\n**BOT_ROUTER.JS: Command content: ", context.activity.text);
                    // If the command exists in our special commands, execute it
                    await specialCommands[messageContent](context);
                } else {
					let chatMessagesUser = await this.chatMessagesProperty.get(context, []) || [];
					chatMessagesUser.push({
						role: "user",
						content: context.activity.text
					});

					let isFirstInteraction = await this.isFirstInteraction.get(context, true);
					let handled = false;
                    handled = await handleMessageFromMSTeams(context, chatMessagesUser, isFirstInteraction, this.isFirstInteraction) || handled;
                    if (handled) {
                          await this.chatMessagesProperty.set(context, chatMessagesUser);
                          return;
                    } 
                    
                    handled = await handleMessageFromSlack(context, chatMessagesUser, this.threadproperty, this.botInvokedFlag, this.threadproperty, PERSONALITY_OF_BOT);                    if (handled) {
                          await this.chatMessagesProperty.set(context, chatMessagesUser);
                          return;
                    } 
                                        
                    // If not handled by MSTeams or Slack, call the default handler
                    handled = await handleDefault(context, chatMessagesUser, PERSONALITY_OF_BOT);
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