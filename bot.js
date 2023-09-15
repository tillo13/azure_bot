// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory } = require('botbuilder');
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

async function chatCompletion(chatText){
  const endpoint = process.env.OPENAI_API_BASE_URL;
  const client = new OpenAIClient(endpoint, new AzureKeyCredential(process.env.OPENAI_API_KEY));

  const deploymentId = process.env.OPENAI_API_DEPLOYMENT;

  const messages = [
    { role: "system", content: "You are a helpful assistant. You will talk like a mouse." },
    { role: "user", content: chatText }
  ];

  console.log(`Sending request to OpenAI API with the following parameters:
    Endpoint: ${endpoint}
    Deployment Id: ${deploymentId}
    Messages: ${JSON.stringify(messages)}
  `);

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
    constructor() {
        super();
        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            const response = await chatCompletion(context.activity.text);
            const replyText = `GPT 3.5: ${response}`;
            await context.sendActivity(MessageFactory.text(replyText, replyText));
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