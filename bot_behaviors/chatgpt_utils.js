const global_configs = require('../utilities//global_configs.js');

const {
    fetchAADObjectIdFromDB,
    fetchLast24HrInteractionPerUserFromDB
} = require('../utilities/postgres_utils');

async function getAADObjectIdFromDB(chatID) {
    if (Array.isArray(chatID)) {
      console.log("\n*******CHATGPT_UTILS.JS: Detected an array of chatIDs");
      for (const id of chatID) {
        const result = await fetchAADObjectIdFromDB(id);
        if (result && result.length > 0) {
          console.log(`\n*******CHATGPT_UTILS.JS: Found a match in the database for chatID: ${id}`);
          return result;
        }
      }
      console.log("\n*******CHATGPT_UTILS.JS: No match found in the database for any chatIDs in the given array");
      return [];
    } else {
      console.log("\n*******CHATGPT_UTILS.JS: Detected a single chatID");
      const result = await fetchAADObjectIdFromDB(chatID);
  
      if(result && result.length > 0){
          console.log(`\n*******CHATGPT_UTILS.JS: Found a match in the database for chatID: ${chatID}`);
      }else{
          console.log("\n*******CHATGPT_UTILS.JS:: No match found in the database for the given chatID");
      }
  
      return result;
    }
  }

  async function getLast24HrInteractionPerUserFromDB(aadObjectID) {
    if (!global_configs.dbRecreationOfGptPayload) {
        console.log("\n*******CHATGPT_UTILS.JS: getLast24HrInteractionPerUserFromDB func Skipping DB Recreation of GPT Payload as the global config is set to true.");
        return;
    }
    try {
        // fetch the last 24-hour interaction from the database
        const result = await fetchLast24HrInteractionPerUserFromDB(aadObjectID);
        
        // If no records were found, handle gracefully
        if (result.length === 0) {
            console.error("\n*******CHATGPT_UTILS.JS: No interactions found in last 24 hours for the user.");
            return [];
        }

        // sort the interaction based on 'hourssincelastinteraction' in descending order
        const sortedResult = result.sort((a, b) => b.hourssincelastinteraction - a.hourssincelastinteraction);
        
        // Define the initial system message
        const chatPayload = [
            {
                role: "system",
                content: "You are a polite, sophisticated, chatbot assistant that always checks historic conversations before using other resources to find answers."
            }
        ];

        // start a new array to hold each user message
        const userMessagesArray = [];

        // mapping the sorted results to the required format and pushing into the chat payload
        sortedResult.forEach(message => {
            chatPayload.push(
                {
                    role: "user",
                    content: message.user_invoke_message,
                },
                {
                    role: "assistant",
                    content: message.bot_response_message,
                }
            );
            userMessagesArray.push(`[~${parseFloat(message.hourssincelastinteraction).toFixed(3)} hours ago: ${message.user_invoke_message}]`);
        });

        // Join each message and interaction time with ', ' to create the final string
        const userMessagesinLast24hrswithapproximateTimessortedChronologically = userMessagesArray.join(', ');
        const formattedUserMessages = "In the last 24 hours, I have said the following with the approximate times they were mentioned: " + userMessagesinLast24hrswithapproximateTimessortedChronologically;
        
        // Print messages along with their approximate times
        console.log("\n*******CHATGPT_UTILS.JS: last24 Messages along with their approximate times: ", formattedUserMessages);
        
        // Print the most recent user message in the last 24 hours and time it was received
        if (sortedResult.length > 0) {
            console.log("\n*******CHATGPT_UTILS.JS: last24 The most recent user message in the last 24 hours: ", sortedResult[sortedResult.length - 1].user_invoke_message);
            console.log("\n*******CHATGPT_UTILS.JS: last24 The most recent user message was received", sortedResult[sortedResult.length - 1].hourssincelastinteraction, "hours ago.");
        } else {
            console.error("\n*******CHATGPT_UTILS.JS: last 24No recent user message found in the last 24 hours");
        }

        // Print the oldest user message in the last 24 hours and time it was received
        if (sortedResult.length > 0) {
            console.log("\n*******CHATGPT_UTILS.JS: last24 The oldest user message in the last 24 hours: ", sortedResult[0].user_invoke_message);
            console.log("\n*******CHATGPT_UTILS.JS: last24 The oldest user message was received", sortedResult[0].hourssincelastinteraction, "hours ago.");
        } else {
            console.error("\n*******CHATGPT_UTILS.JS: last24 No oldest user message found in the last 24 hours.");
        }

        console.log('\n\n***CHATGPT_UTILS.JS -> last24 Last 24 Hr Interaction Data:', chatPayload);

        return chatPayload;
    } catch (error) {
        console.error("last24: An error occurred while retrieving and formatting interactions ", error);
    }
}

async function recreateGptPayloadViaDB(aadObjectID) {
    if (!global_configs.dbRecreationOfGptPayload) {
        console.log("\n*******CHATGPT_UTILS.JS: recreateGptPayload func Skipping DB Recreation of GPT Payload as the global config is set to true.");
        return;
    }
    try {
        console.log("\n*******CHATGPT_UTILS.JS: AAD Object ID for recreateGptPayloadViaDB: ", aadObjectID);

        // Fetch interaction details of the user from the database
        const result = await fetchLast24HrInteractionPerUserFromDB(aadObjectID);

        // If no records were found, handle gracefully
        if (result.length === 0) {
            console.error("\n*******CHATGPT_UTILS.JS: recreateGptPayloadViaDB No interactions found in last 24 hours for the user.");
            return [];
        }

        // Sort the interaction based on 'hourssincelastinteraction' in descending order
        const sortedResult = result.sort((a, b) => b.hourssincelastinteraction - a.hourssincelastinteraction);

        // Define the initial system message
        const chatPayload = [
            {
                role: "system",
                content: "You are a polite, sophisticated, chatbot assistant that always checks historic conversations before using other resources to find answers."
            }
        ];

        // Start a new array to hold each user message
        const userMessagesArray = [];

        // Mapping the sorted results to the required format and pushing into the chat payload
        sortedResult.forEach(message => {
            chatPayload.push(
                {
                    role: "user",
                    content: message.user_invoke_message,
                },
                {
                    role: "assistant",
                    content: message.bot_response_message,
                }
            );
            userMessagesArray.push(`[~${parseFloat(message.hourssincelastinteraction).toFixed(3)} hours ago: ${message.user_invoke_message}]`);
        });

        const latestUserMessage = sortedResult[sortedResult.length - 1].user_invoke_message;
        
        chatPayload.push(
            { 
                role: "assistant", 
                content: 'Let\'s check our past conversations in this exact gpt thread, one moment...' 
            },
            { 
                role: "assistant", 
                content: `I could not find a suitable response to your latest message of: ${latestUserMessage}. Please respond with your conversation history up to this point and I will investigate.` 
            },
            { 
                role: "user", 
                content: `Certainly, here's what I've said so far along with the timestamps. In the last 24 hours, I have mentioned the following with approximate times: ${userMessagesArray.join(", ")}.`
            }
        );

        console.log('\n*******CHATGPT_UTILS.JS -> recreateGptPayloadViaDB updated payload: ', chatPayload);
        return chatPayload;

    } catch (error) {
        console.error("\n*******CHATGPT_UTILS.JS: recreateGptPayloadViaDB -->an error occurred while recreating the payload: ", error);
        return null;
    }
}

module.exports = {
    getAADObjectIdFromDB,
    getLast24HrInteractionPerUserFromDB,
    recreateGptPayloadViaDB
};