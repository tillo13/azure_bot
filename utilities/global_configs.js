//2023oct30 add in cosine similarity score

const BOT_PERSONALITY = "You are thorough, polite, helpful and courteous.";

const INGRESS_CONFIGS = {
  'msteams': {
    personality: BOT_PERSONALITY,
    welcomeMessage: "Howdy! Welcome to our Microsoft Teams chat!",
    messagePrefix: "msteams>>"
  },
  'slack': {
    personality: BOT_PERSONALITY,
    welcomeMessage: "Greetings earthling, welcome to our Slack channel!",
    messagePrefix: "slack>>"
  },
  'webchat': {
    personality: BOT_PERSONALITY,
    welcomeMessage: "Ahoy! Welcome to our webchat channel!",
    messagePrefix: "default>>"
  }
};

//set an overall value for what the threshold is for weaviate to return a result
const COSINE_SIMILARITY_THRESHOLD = 0.90;  

module.exports = {
    dbRecreationOfGptPayload: true,
    BOT_PERSONALITY,
    INGRESS_CONFIGS,
    COSINE_SIMILARITY_THRESHOLD  
};