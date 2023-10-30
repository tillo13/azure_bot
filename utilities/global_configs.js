//2023oct29 moving global things here that can be publicly used for github
const BOT_PERSONALITY = "You are thorough, polite, helpful and courteous.";

const INGRESS_CONFIGS = {
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

module.exports = {
    dbRecreationOfGptPayload: true,
    BOT_PERSONALITY,
    INGRESS_CONFIGS
};