// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory } = require('botbuilder');
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

const CONVERSATION_STATE = 'conversationStateProperty';

async function chatCompletion(chatText) {
    const endpoint = process.env.OPENAI_API_BASE_URL;
    const client = new OpenAIClient(endpoint, new AzureKeyCredential(process.env.OPENAI_API_KEY));

    const deploymentId = process.env.OPENAI_API_DEPLOYMENT;

    const messages = chatText;

    console.log(`Sending request to OpenAI API with the following parameters: Endpoint: ${endpoint} Deployment Id: ${deploymentId} Messages: ${JSON.stringify(messages)}`);

    try {
        const result = await client.getChatCompletions(deploymentId, messages, { maxTokens: 128 });

        console.log(`Received response from OpenAI API: ${JSON.stringify(result)}`);

        return result.choices[0].message.content;
    } catch (error) {
        console.error("An error occurred while interacting with OpenAI API", error);
        throw error;
    }
}

class EchoBot extends ActivityHandler {
    constructor(userState) {
        super();
        // Create a new state property accessor.
        this.conversationStateProperty = userState.createProperty(CONVERSATION_STATE);

        this.userState = userState;

        this.onMessage(async (context, next) => {
            let conversationState = await this.conversationStateProperty.get(context, []);
            if (context.activity.channelId === "slack") {
                conversationState.push({ role: "user", content: context.activity.text });
                const response = await chatCompletion(conversationState);
                conversationState.push({ role: "bot", content: response });

                // Create the reply
                const replyActivity = MessageFactory.text(`GPT 3.5: ${response}`);

                // Try to send as thread reply if message comes from Slack
                try {
                    // Copy the conversation object from original message
                    replyActivity.conversation = context.activity.conversation;

                    // Append the ID of the parent message to post our message as reply. This makes the reply appear
                    // as a thread reply in Slack, but only has effect in a Slack environment.
                    replyActivity.conversation.id += ":" + context.activity.channelData.SlackMessage.event.ts;
                } catch (error) {
                    console.error("An error occurred while trying to reply in thread", error);
                }

                await context.sendActivity(replyActivity);
            } else {
                const response = await chatCompletion([{ role: "system", content: "You are a helpful assistant."}, { role: "user", content: context.activity.text }]);
                await context.sendActivity(MessageFactory.text(`GPT 3.5: ${response}`, `GPT 3.5: ${response}`));
            }

            await this.conversationStateProperty.set(context, conversationState);
            await this.userState.saveChanges(context);

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Hello and welcome to the at>ESS Chat bot!';
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}

module.exports.EchoBot = EchoBot;