const { botRouterSaveDataToPostgres } = require('./utilities/postgres_utils');
const { handleMessageFromMSTeams, handleMessageFromSlack, handleDefault } = require('./bot_behaviors/message_handler');
const { ActivityHandler, MessageFactory } = require('botbuilder');
const specialCommands = require('./bot_behaviors/special_commands');
const { postMessageToSlack } = require('./bot_behaviors/slack_utils');

const BOT_PERSONALITY = "You are thorough, polite, helpful and courteous.";

const PATH_CONFIGS = {
  'msteams': {
    personality: BOT_PERSONALITY,
    welcomeMessage: "Howdy! Welcome to our Microsoft Teams chat!",
    messagePrefix: "teams_path"
  },
  'slack': {
    personality: BOT_PERSONALITY,
    welcomeMessage: "Greetings earthling, welcome to our Slack channel!",
    messagePrefix: "slack_path"
  },
  'webchat': {
    personality: BOT_PERSONALITY,
    welcomeMessage: "Ahoy! Welcome to our webchat channel!",
    messagePrefix: "default_path"
  }
};

const MEMBERS_ADDED = 'membersAddedProperty';
const USER_MESSAGES = 'userMessagesProperty';
const THREAD_TS = 'thread_ts';

class EchoBot extends ActivityHandler {
	constructor(userState) {
	  super();
	  this.userState = userState;
	  this.botInvokedFlag = userState.createProperty('botInvokedFlag');
	  this.isFirstInteraction = userState.createProperty('isFirstInteraction');
	  this.userMessagesProperty = userState.createProperty(USER_MESSAGES);
	  this.membersAddedProperty = userState.createProperty(MEMBERS_ADDED);
	  this.threadproperty = userState.createProperty(THREAD_TS); 
	  this.onReactionsAdded(this.handleReactionForTeams.bind(this));
	  this.onMembersAdded(this.welcomeMembers.bind(this));
	  this.onMessage(this.processMessage.bind(this));
	}

  async handleReactionForTeams(context) {
    if (context.activity.channelId === 'msteams') {
      const { reactionsAdded: [{ type: emoji }], from: { id: userId }, replyToId: messageId } = context.activity;
      console.log(`User reacted to MS Teams post. UserId: ${userId}, Emoji: ${emoji}, MessageId: ${messageId}`);
    }
  }

  async welcomeMembers(context, next) {
    const pathConfig = PATH_CONFIGS[context.activity.channelId] || {};
    const welcomeText = pathConfig.welcomeMessage || "Welcome!";

    const membersToAdd = context.activity.membersAdded;
    for (let member of membersToAdd) {
      if (member.id !== context.activity.recipient.id) {
        await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
      }
    }
    await next();
  }

  async processMessage(context, next) {
    try {
      const filename_ingress = "bot_router.js";
      await botRouterSaveDataToPostgres(context.activity, context.activity.channelId, filename_ingress);

      const messageContent = context.activity.text.trim();
      if (specialCommands[messageContent]) {
        await specialCommands[messageContent](context, this.userMessagesProperty);
      } else {

        const pathConfig = PATH_CONFIGS[context.activity.channelId] || {};
        const personality = pathConfig.personality || "Default personality";

        let userMessages = await this.userMessagesProperty.get(context, []) || [];
        userMessages.push({
          role: "user",
          content: context.activity.text
        });

        let isFirstInteraction = await this.isFirstInteraction.get(context, true);
		const handled = await handleMessageFromMSTeams(context, userMessages, isFirstInteraction, this.isFirstInteraction, PATH_CONFIGS['msteams'])
        || await handleMessageFromSlack(context, userMessages, this.threadproperty, this.botInvokedFlag, this.threadproperty, personality, PATH_CONFIGS['slack'])
        || await handleDefault(context, userMessages, personality);

        if (handled) {
          await this.userMessagesProperty.set(context, userMessages);
        }
      }
    } catch (error) {
      if (error.type === 'content_filter') {
        await context.sendActivity(error.message);
      } else {
        console.error("Error occurred:", error);
      }
    }

    // Proceed to the next middleware
    await next();
  }

  async run(context) {
    await super.run(context);
    await this.userState.saveChanges(context);
  }
}
module.exports.EchoBot = EchoBot;