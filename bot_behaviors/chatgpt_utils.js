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
    try {
        // Print the AAD Object ID
        console.log("\n*******CHATGPT_UTILS.JS: AAD Object ID: ", aadObjectID);

        // fetch the last 24-hour interaction from the database
        const result = await fetchLast24HrInteractionPerUserFromDB(aadObjectID);
        
        // sort the interaction based on 'hourssincelastinteraction' in descending order
        const sortedResult = result.sort((a, b) => b.hourssincelastinteraction - a.hourssincelastinteraction);
        
        // Print the sorted result
        console.log("\n*******CHATGPT_UTILS.JS: Sorted result: ", sortedResult);

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
        console.log("\n*******CHATGPT_UTILS.JS: Messages along with their approximate times: ", formattedUserMessages);
        
        console.log("\n*******CHATGPT_UTILS.JS: The most recent user message in the last 24 hours: ", sortedResult[sortedResult.length - 1].user_invoke_message);
        console.log("\n*******CHATGPT_UTILS.JS: The most recent user message was received", sortedResult[sortedResult.length - 1].hourssincelastinteraction, "hours ago.");
        console.log("\n*******CHATGPT_UTILS.JS: The oldest user message in the last 24 hours: ", sortedResult[0].user_invoke_message);
        console.log("\n*******CHATGPT_UTILS.JS: The oldest user message was received", sortedResult[0].hourssincelastinteraction, "hours ago.");
        console.log('\n\n***CHATGPT_UTILS.JS -> Last 24 Hr Interaction Data:', chatPayload);

        return chatPayload;
    } catch (error) {
        console.error("An error occurred while retrieving and formatting interactions ", error);
    }
}

async function recreateGptPayloadViaDB(aadObjectID) {
    try {
        // Log the AAD Object ID
        console.log("\n*******CHATGPT_UTILS.JS: AAD Object ID: ", aadObjectID);

        // Fetch interaction details of the user from the database
        const last24HrInteraction = await getLast24HrInteractionPerUserFromDB(aadObjectID);

        // Process interaction details
        let userInvokeMessageArray = [];
        for (let interaction of last24HrInteraction) {
            // Log the interaction detail
            console.log("\n*******CHATGPT_UTILS.JS: Interaction detail: ", interaction);
            
            userInvokeMessageArray.push(`[~${parseFloat(interaction.hourssincelastinteraction).toFixed(3)} hours ago: ${interaction.user_invoke_message}]`);
        }

        // Log the user invoke message array
        console.log("\n*******CHATGPT_UTILS.JS: User invoke message array: ", userInvokeMessageArray);

        const userInvokeDiscussion = "Certainly, here is what I have said so far. Here are your past conversations: " + userInvokeMessageArray.join(', ');

        // Structure the payload as required
        const payload = [
            {
                role: "system",
                content: "You are a polite, sophisticated, chatbot assistant that always checks historic conversations before using other resources to find answers!"
            },
        ];

        // Add interaction details to the payload
        for (let interaction of last24HrInteraction) {
            payload.push(
                { role: "user", content: interaction.user_invoke_message },
                { role: "assistant", content: interaction.bot_response_message }
            );
        }

        // Fetch the latest user message and include in the payload
        let latestUserMessage = last24HrInteraction[last24HrInteraction.length - 1].user_invoke_message;

        payload.push(
            { role: "assistant", content: 'Let me check our past conversations in this exact gpt thread, one moment...' },
            { role: "assistant", content: `I could not find a suitable response to your latest message of: ${latestUserMessage}. Please respond with your conversation history to this point and I will investigate.` },
            { role: "user", content: userInvokeDiscussion }
        );

        // Output the final payload
        console.log('\n*******CHATGPT_UTILS.JS -> The final recreated payload: ', payload);

        return payload;
    } catch (error) {
        console.error("\n*******CHATGPT_UTILS.JS: An error occurred while recreating the payload: ", error);
        return null;
    }
}

module.exports = {
    getAADObjectIdFromDB,
    getLast24HrInteractionPerUserFromDB,
    recreateGptPayloadViaDB
};