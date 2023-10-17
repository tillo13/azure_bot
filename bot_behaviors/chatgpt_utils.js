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
        console.log("\n*******CHATGPT_UTILS.JS: Messages along with their approximate times: ", formattedUserMessages);
        
        // Print the most recent user message in the last 24 hours and time it was received
        if (sortedResult.length > 0) {
            console.log("\n*******CHATGPT_UTILS.JS: The most recent user message in the last 24 hours: ", sortedResult[sortedResult.length - 1].user_invoke_message);
            console.log("\n*******CHATGPT_UTILS.JS: The most recent user message was received", sortedResult[sortedResult.length - 1].hourssincelastinteraction, "hours ago.");
        } else {
            console.error("\n*******CHATGPT_UTILS.JS: No recent user message found in the last 24 hours");
        }

        // Print the oldest user message in the last 24 hours and time it was received
        if (sortedResult.length > 0) {
            console.log("\n*******CHATGPT_UTILS.JS: The oldest user message in the last 24 hours: ", sortedResult[0].user_invoke_message);
            console.log("\n*******CHATGPT_UTILS.JS: The oldest user message was received", sortedResult[0].hourssincelastinteraction, "hours ago.");
        } else {
            console.error("\n*******CHATGPT_UTILS.JS: No oldest user message found in the last 24 hours.");
        }

        console.log('\n\n***CHATGPT_UTILS.JS -> Last 24 Hr Interaction Data:', chatPayload);

        return chatPayload;
    } catch (error) {
        console.error("An error occurred while retrieving and formatting interactions ", error);
    }
}

async function recreateGptPayloadViaDB(aadObjectID) {
    try {
        console.log("\n*******CHATGPT_UTILS.JS: AAD Object ID: ", aadObjectID);

        // Fetch interaction details of the user from the database
        const last24HrInteraction = await getLast24HrInteractionPerUserFromDB(aadObjectID);

        if (!last24HrInteraction || last24HrInteraction.length === 0) {
            console.log("\n*******CHATGPT_UTILS.JS: No interactions found in the last 24 hours for the provided AAD Object ID.");
            return [];
        }
        
        if (!Array.isArray(last24HrInteraction) || last24HrInteraction.length === 0) {
            console.log("\n*******CHATGPT_UTILS.JS: last24HrInteraction is not an array or is empty.");
            return [];
        }

        let userInvokeDiscussion;

        // Process interaction details
        if(last24HrInteraction.length > 0){
            let userInvokeMessageArray = [];
            for(let index = 0 ; index < last24HrInteraction.length ; index++){
                const interaction = last24HrInteraction[index];
                console.log("\n*******CHATGPT_UTILS.JS: Interaction detail: ", interaction);
                // assuming that each 'interaction' also contains the 'hourssincelastinteraction' property:
                userInvokeMessageArray.push(`[~${parseFloat(interaction.hourssincelastinteraction).toFixed(3)} hours ago: ${interaction.content}]`);
            }
            console.log("\n*******CHATGPT_UTILS.JS: User invoke message array: ", userInvokeMessageArray);
            userInvokeDiscussion = "Certainly, here is what I have said so far. Here are your past conversations: "+userInvokeMessageArray.join(', ');

        } else {
            userInvokeDiscussion = "Certainly, there are no past conversations in the last 24 hours.";
        }


        // Structure the payload as required
        const payload = [
            {
                role: "system",
                content: "You are a polite, sophisticated, chatbot assistant that always checks historic conversations before using other resources to find answers!"
            },
        ];

        // Add interaction details to the payload
        for(let interaction of last24HrInteraction){
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