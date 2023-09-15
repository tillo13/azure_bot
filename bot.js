// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory } = require('botbuilder');
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

async function chatCompletion(chatText) {
  const endpoint = process.env.OPENAI_API_BASE_URL;
  const client = new OpenAIClient(endpoint, new AzureKeyCredential(process.env.OPENAI_API_KEY));

  const deploymentId = process.env.OPENAI_API_DEPLOYMENT;

  const messages = [
    { role: "system", content: "You are a helpful assistant. You will talk like a skeptic." },
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
        this.onMessage(async (context, next) => {
            try {
                const response = await chatCompletion(context.activity.text);
                
                if (context.activity.channelId  === 'slack') {
                    // Create the reply, copy the conversation and append for threading
                    const replyActivity = MessageFactory.text(`GPT 3.5: ${response}`);
                    replyActivity.conversation = context.activity.conversation;
                    replyActivity.conversation.id += ':' + context.activity.channelData.SlackMessage.ts;
                    
                    await context.sendActivity(replyActivity);
                } else {
                    await context.sendActivity(`GPT 3.5: ${response}`);
                }        
            } catch (error) {
                console.error(`Failed to send a threaded message: ${error}`);
            }
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
            await next();
        });
    }
}

module.exports.EchoBot = EchoBot;