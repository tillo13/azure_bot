const BOT_PERSONALITY = "You are thorough, polite, helpful and courteous.";

const INGRESS_CONFIGS = {
  'msteams': {
    personality: BOT_PERSONALITY,
    welcomeMessage: "Howdy! Welcome to our Microsoft Teams chat!",
    messagePrefix: "",
    messagePostfix: " |Powered by TeamsBot|",
  },
  'slack': {
    personality: BOT_PERSONALITY,
    welcomeMessage: "Greetings earthling, welcome to our Slack channel!",
    messagePrefix: "",
    messagePostfix: "",
    footer: [
      {
        "type": "divider",
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "```|Powered by SlackBot2|```"
        }
      },
    ]
  },
  'webchat': {
    personality: BOT_PERSONALITY,
    welcomeMessage: "Ahoy! Welcome to our webchat channel!",
    messagePrefix: "default>>",
    messagePostfix: " |Powered by WebChatBot|",
  }
};

const COSINE_SIMILARITY_THRESHOLD = 0.90;

module.exports = {
  dbRecreationOfGptPayload: true,
  BOT_PERSONALITY,
  INGRESS_CONFIGS,
  COSINE_SIMILARITY_THRESHOLD  
};