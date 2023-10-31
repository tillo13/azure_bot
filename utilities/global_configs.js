//2023oct31 updating more global defaults for chat_helper.js

//openai specific values
const BOT_PERSONALITY = "You are thorough, polite, helpful and courteous.";
const MAX_OPENAI_TOKENS = 2048;

//weaviate specific values
const COSINE_SIMILARITY_THRESHOLD = 0.90;
const FOOTER_NO_MATCH_MESSAGE = " |No Weaviate matches: ¯\\_(ツ)_/¯, be more specific?|";
const FOOTER_HIGHEST_MATCH_MESSAGE = " |Highest Weaviate match: ";
const FOOTER_GENERAL_POSTFIX = "|Powered by TeradataBot|";
const FOOTER_GPT4_PLUS_WEAVIATE_MESSAGE = " |Response enhanced with RAG via Weaviate and provided by GPT-4.";

//other config variables
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

module.exports = {
  DB_RECREATION_OF_GPT_PAYLOAD,
  BOT_PERSONALITY,
  INGRESS_CONFIGS,
  COSINE_SIMILARITY_THRESHOLD,
  MAX_OPENAI_TOKENS,
  FOOTER_NO_MATCH_MESSAGE,
  FOOTER_HIGHEST_MATCH_MESSAGE,
  FOOTER_GENERAL_POSTFIX,
  FOOTER_GPT4_PLUS_WEAVIATE_MESSAGE
};