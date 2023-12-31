const {
	Pool
} = require('pg');

//make sure .env file as these as =, not : in defining them.
const pool = new Pool({
	user: process.env['2023oct9_AZURE_POSTGRES_USER'],
	host: process.env['2023oct9_AZURE_POSTGRES_HOST'],
	database: process.env['2023oct9_AZURE_POSTGRES_DATABASE'],
	password: process.env['2023oct9_AZURE_POSTGRES_PASSWORD'],
	port: process.env['2023oct9_AZURE_POSTGRES_PORT'],
	ssl: {
		rejectUnauthorized: false,
	},
});

pool.on('error', (err, client) => {
	console.error('\n*POSTGRES_UTILS.JS: Unexpected error on idle client', err)
	client.end();
})

async function getQAFromDatabase() {
    const query = `
        SELECT question, answer
        FROM ${process.env['2023oct15_AZURE_POSTGRES_DATABASE_RLHF_TD_QUESTIONS_AND_ANSWERS_TABLE']}
        ORDER BY RANDOM()
        LIMIT 1;
    `;
    const result = await pool.query(query);
    return result.rows[0];
}

async function botIngressSaveDataToPostgres(data, channelId) {
	let created_via = data.filename_ingress || null;
	let preparedData = {};
	let payload;

	// Prepare data for different channels
	try {
		switch (channelId) {
			case 'webchat':
				preparedData = webchatIngressData(data);
				try {
					payload = (data.text || "").substring(0, 2900); // truncate message text
				} catch(_) {
					payload = JSON.stringify(data).substring(0, 2900); // default to entire payload
				}
				break;
			case 'slack':
				preparedData = slackIngressData(data);
				try {
					payload = (data.channelData.SlackMessage.event.text || "").substring(0, 2900); // truncate message text
				} catch(_) {
					payload = JSON.stringify(data).substring(0, 2900); // default to entire payload
				}
				break;
			case 'msteams':
				preparedData = msteamsIngressData(data);
				try {
					payload = (data.text || "").substring(0, 2900); // truncate message text
				} catch(_) {
					payload = JSON.stringify(data).substring(0, 2900); // default to entire payload
				}
				break;
			default:
				preparedData = defaultIngressData(data);
				payload = JSON.stringify(data).substring(0, 2900); // truncate entire payload
				break;
		}
	} catch (error) {
		console.error('\n*POSTGRES_UTILS.JS: Error preparing data for botIngress path: ', error);
	}

	try {
		const query = `
		INSERT INTO ${process.env['2023oct9_AZURE_POSTGRES_DATABASE_INGRESS_TABLE']} (
			channel_id, message_type, message_id, timestamp_from_endpoint, 
			local_timestamp_from_endpoint, local_timezone_from_endpoint, 
			service_url, from_id, from_name, conversation_id, 
			attachment_exists, recipient_id, recipient_name, 
			channeldata_webchat_id, channeldata_slack_app_id, 
			channeldata_slack_event_id, channeldata_slack_event_time, 
			channeldata_msteams_tenant_id, message_payload, created_via
		) 
		VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
		) RETURNING pk_id, message_id`;

		let result = await pool.query(query, [
			channelId, data.type, data.id, data.timestamp, data.localTimestamp, 
			data.localTimezone, data.serviceUrl, data.from.id, data.from.name, 
			data.conversation.id, data.attachments && data.attachments.length > 0, 
			data.recipient.id, data.recipient.name, preparedData.channeldata_webchat_id, 
			preparedData.channeldata_slack_app_id, preparedData.channeldata_slack_event_id, 
			preparedData.channeldata_slack_event_time, 
			preparedData.channeldata_msteams_tenant_id, payload, created_via
		]);

		if (result.rows.length > 0) {
			console.log(`\n*POSTGRES_UTILS.JS: Data saved to bot_invoke_log with messageID for botIngress path:  = ${result.rows[0].message_id}, and pk_id = ${result.rows[0].pk_id}`);
		} else {
			console.log('\n*POSTGRES_UTILS.JS: No Data returned after insert operation for botIngress path: ');
		}
	} catch (err) {
		console.error('\n*POSTGRES_UTILS.JS: Failed to save data to Postgres for botIngress path: ', err);
	}
}

function webchatIngressData(data) {
	if (data.channelData && data.channelData.clientActivityID) {
		console.log('\n*POSTGRES_UTILS.JS: WEBCHAT ingress data saving to bot_invoke_log...');
		return {
			channeldata_webchat_id: data.channelData.clientActivityID
		};
	} else {
		console.error('\n*POSTGRES_UTILS.JS: clientActivityID is undefined for bot_invoke_log...');
		return {
			channeldata_webchat_id: 'undetermined'
		};
	}
}

function slackIngressData(data) {
	if (data.channelData && data.channelData.SlackMessage) {
		console.log('\n*POSTGRES_UTILS.JS: SLACK ingress data saving to bot_invoke_log...');
		return {
			channeldata_slack_app_id: data.channelData.SlackMessage.api_app_id,
			channeldata_slack_event_id: data.channelData.SlackMessage.event_id,
			channeldata_slack_event_time: data.channelData.SlackMessage.event_time
		};
	} else {
		console.error('\n*POSTGRES_UTILS.JS: SlackData is undefined for bot_invoke_log...');
		return {
			channeldata_slack_app_id: 'undetermined',
			channeldata_slack_event_id: 'undetermined',
			channeldata_slack_event_time: 'undetermined'
		};
	}
}

function msteamsIngressData(data) {
	if (data.channelData && data.channelData.tenant) {
		console.log('\n*POSTGRES_UTILS.JS: MSTEAMS ingress data saving to bot_invoke_log...');
		return {
			channeldata_msteams_tenant_id: data.channelData.tenant.id
		};
	} else {
		console.error('\n*POSTGRES_UTILS.JS: MSTEAMS data is undefined for bot_invoke_log...');
		return {
			channeldata_msteams_tenant_id: 'undetermined'
		};
	}
}

function defaultIngressData() {
	return {};
}

async function botIngressSaveDataToPostgres(data, channelId) {
	let created_via = data.filename_ingress || null;
	let preparedData = {};
	let payload;

	// Prepare data for different channels
	try {
		switch (channelId) {
			case 'webchat':
				preparedData = webchatIngressData(data);
				try {
					payload = (data.text || "").substring(0, 2900); // truncate message text
				} catch(_) {
					payload = JSON.stringify(data).substring(0, 2900); // default to entire payload
				}
				break;
			case 'slack':
				preparedData = slackIngressData(data);
				try {
					payload = (data.channelData.SlackMessage.event.text || "").substring(0, 2900); // truncate message text
				} catch(_) {
					payload = JSON.stringify(data).substring(0, 2900); // default to entire payload
				}
				break;
			case 'msteams':
				preparedData = msteamsIngressData(data);
				try {
					payload = (data.text || "").substring(0, 2900); // truncate message text
				} catch(_) {
					payload = JSON.stringify(data).substring(0, 2900); // default to entire payload
				}
				break;
			default:
				preparedData = defaultIngressData(data);
				payload = JSON.stringify(data).substring(0, 2900); // truncate entire payload
				break;
		}
	} catch (error) {
		console.error('\n*POSTGRES_UTILS.JS: Error preparing data for botIngress path: ', error);
	}

	try {
		const query = `
		INSERT INTO ${process.env['2023oct9_AZURE_POSTGRES_DATABASE_INGRESS_TABLE']} (
			channel_id, message_type, message_id, timestamp_from_endpoint, 
			local_timestamp_from_endpoint, local_timezone_from_endpoint, 
			service_url, from_id, from_name, conversation_id, 
			attachment_exists, recipient_id, recipient_name, 
			channeldata_webchat_id, channeldata_slack_app_id, 
			channeldata_slack_event_id, channeldata_slack_event_time, 
			channeldata_msteams_tenant_id, message_payload, created_via
		) 
		VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
		) RETURNING pk_id, message_id`;

		let result = await pool.query(query, [
			channelId, data.type, data.id, data.timestamp, data.localTimestamp, 
			data.localTimezone, data.serviceUrl, data.from.id, data.from.name, 
			data.conversation.id, data.attachments && data.attachments.length > 0, 
			data.recipient.id, data.recipient.name, preparedData.channeldata_webchat_id, 
			preparedData.channeldata_slack_app_id, preparedData.channeldata_slack_event_id, 
			preparedData.channeldata_slack_event_time, 
			preparedData.channeldata_msteams_tenant_id, payload, created_via
		]);

		if (result.rows.length > 0) {
			console.log(`\n*POSTGRES_UTILS.JS: Data saved to postgres bot_router_log with messageID for botIngress path:  = ${result.rows[0].message_id}, and pk_id = ${result.rows[0].pk_id}`);
		} else {
			console.log('\n*POSTGRES_UTILS.JS: No Data returned after insert operation for botIngress path: ');
		}
	} catch (err) {
		console.error('\n*POSTGRES_UTILS.JS: Failed to save data to Postgres for botIngress path: ', err);
		console.error('\n*POSTGRES_UTILS.JS: Payload:', payload);
	}
}

function webchatIngressData(data) {
	if (data.channelData && data.channelData.clientActivityID) {
		console.log('\n*POSTGRES_UTILS.JS: WEBCHAT ingress data logged to bot_router_log..');
		return {
			channeldata_webchat_id: data.channelData.clientActivityID
		};
	} else {
		console.error('\n*POSTGRES_UTILS.JS: clientActivityID is undefined');
		return {
			channeldata_webchat_id: 'undetermined'
		};
	}
}

function slackIngressData(data) {
	if (data.channelData && data.channelData.SlackMessage) {
		console.log('\n*POSTGRES_UTILS.JS: Slack data logged to bot_router_log..');
		return {
			channeldata_slack_app_id: data.channelData.SlackMessage.api_app_id,
			channeldata_slack_event_id: data.channelData.SlackMessage.event_id,
			channeldata_slack_event_time: data.channelData.SlackMessage.event_time
		};
	} else {
		console.error('\n*POSTGRES_UTILS.JS: SlackData is undefined');
		return {
			channeldata_slack_app_id: 'undetermined',
			channeldata_slack_event_id: 'undetermined',
			channeldata_slack_event_time: 'undetermined'
		};
	}
}

function msteamsIngressData(data) {
	if (data.channelData && data.channelData.tenant) {
		console.log('\n*POSTGRES_UTILS.JS: MSTEAMS data logged to bot_router_log..');
		return {
			channeldata_msteams_tenant_id: data.channelData.tenant.id
		};
	} else {
		console.error('\n*POSTGRES_UTILS.JS: MSTEAMS data is undefined');
		return {
			channeldata_msteams_tenant_id: 'undetermined'
		};
	}
}

function defaultIngressData() {
	return {};
}

async function botRouterSaveDataToPostgres(data, channelId, filename_ingress) {
	//DEBUG console.log('[DEBUG] Inside botRouterSaveDataToPostgres function', data, channelId, filename_ingress); // Log start of function

  //DEBUG // console.log('\n*POSTGRES_UTILS.JS: entering the botRouter path:', data);
  //DEBUG // console.log('\n*POSTGRES_UTILS.JS: Interaction slack Channel Data for botRouter path :', data.channelData);

  let preparedData = {};
  let payload;
  let slackUrl = null; // Initialize slackUrl to a default value

  // Prepare data for different channels
  try {
    switch (channelId) {
      case 'webchat':
      	preparedData = webchatIngressData(data);
      	payload = getPayload(data, 'text');
      	break;
		  case 'slack':
            preparedData = slackIngressData(data);
            payload = getPayload(data, 'text');
            let slackChannelIdString = data.conversation?.id || "UnlistedForDebug";
            let threadTsString = data.channelData?.SlackMessage?.event?.thread_ts || data.thread_ts || null;

            // Log the variables to verify the values
            //DEBUG console.log('\n*POSTGRES_UTILS.JS: slackChannelId:', slackChannelIdString);
            //DEBUG console.log('\n*POSTGRES_UTILS.JS: threadTs:', threadTsString);

            let original_ts = data.channelData?.SlackMessage?.event?.ts; // Getting the ts value from payload 
			let parsed_timestamp = original_ts.replace('.', '').padEnd(original_ts.indexOf('.') + 7, '0'); // Padding additional zeroes to make decimals to 6 digits
			
            let slackChannelIdParts = slackChannelIdString.split(':');
            let actualSlackChannelId = slackChannelIdParts[2]; // Now this will hold something like C05USME0X35
            
            let actualThreadTs = null;  // default value
            if (threadTsString) {  // if threadTsString is not null or undefined
                let threadTsParts = threadTsString.split(':');
                actualThreadTs = threadTsParts[threadTsParts.length - 1]; // Now this will hold something like 1697146691.533689
            }

            // Generate slackUrl when required values are not default ones
            if (actualSlackChannelId !== "UnlistedForDebug" && parsed_timestamp) {
               
				slackUrl = generateSlackUrl(actualSlackChannelId, parsed_timestamp, actualThreadTs);
            } else {
                slackUrl = "Test Slack URL in switch statement";
            }
            break;
      case 'msteams':
      	preparedData = msteamsIngressData(data);
      	payload = getPayload(data, 'text');
      	break;
      default:
      	preparedData = defaultIngressData(data);
      	payload = JSON.stringify(data).substring(0, 2900); // truncate entire payload
      	break;
    }
  } catch (error) {
    console.error('\n*POSTGRES_UTILS.JS: Error preparing data for botRouter path: ', error);
  }

  // Convert stateHash to JSON string if it's an object
  const stateHashJSON = data.stateHash ? JSON.stringify(data.stateHash) : null;

  // Make sure we are inserting into the correct table
  const tableName = process.env['2023oct12_AZURE_POSTGRES_DATABASE_ROUTER_LOG_TABLE'];


  // Execute query
  try {
    const query = `
	INSERT INTO ${tableName} (
		payload_creation_timestamp, responded_ref_responded,
		turn_context_state_collection, bot_identity_claims_identity_authentication_type,
		connector_client_with_credentials, connector_client_http_client,
		user_token_client_app_id, connector_factory_app_id,
		connector_factory_validate_authority, turn_locale, locale,
		activity_type, activity_id, activity_timestamp, activity_service_url,
		activity_channel_id, activity_from_id, activity_from_name,
		activity_recipient_id, activity_recipient_name, activity_text, filename_ingress,
		activity_raw_timestamp, activity_caller_id, state_hash_conversation_thread, state_hash_is_first_interaction,
		row_created_on, slack_activity_conversation_is_group, slack_activity_conversation_id,
        slack_activity_conversation_name, slack_state_hash_thread_timestamp, slack_state_hash_bot_invoked_flag,
		slack_channeldata_api_token, msteams_activity_conversation_conversation_type,
		msteams_activity_conversation_tenant_id, msteams_activity_conversation_id,
		msteams_activity_recipient_aad_object_id, webchat_activity_local_timestamp,
		webchat_activity_conversation_id, webchat_activity_text_format, webchat_activity_local_timezone, slack_url
	)
	VALUES (
		NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, 
		$10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 
		$20, $21, $22, $23, $24, $25, NOW(), $26, $27, $28, 
		$29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40
	) RETURNING pk_id, message_id`;
	//DEBUG console.log('\n*POSTGRES_UTILS.JS: [DEBUG] Running query:', query); // Log your query


	//align data in variables beforehand to be able to see in console for test: 
	let parsed_responded_ref_responded = data.responded_ref_responded || false;
	let parsed_turn_context_state_collection = data.turn_context_state_collection || null;
	let parsed_bot_identity_claims_identity_authentication_type = data.bot_identity_claims_identity_authentication_type !== undefined ? data.bot_identity_claims_identity_authentication_type : null;
	let parsed_connector_client_with_credentials = data.connector_client_with_credentials !== undefined ? data.connector_client_with_credentials : null;
	let parsed_connector_client_http_client = data.connector_client_http_client || "UnlistedForDebug";
	let parsed_user_token_client_app_id = data.user_token_client_app_id || "UnlistedForDebug";
	let parsed_connector_factory_app_id = data.connector_factory_app_id || "UnlistedForDebug";
	let parsed_connector_factory_validate_authority = data.connector_factory_validate_authority || false;
	let parsed_turn_locale = data.turn_locale || "UnlistedForDebug";
	let parsed_locale = data.locale || "UnlistedForDebug";
	let parsed_type = data.type || "UnlistedForDebug";
	let parsed_id = data.id || "UnlistedForDebug";
	let parsed_timestamp = data.timestamp || null;
	let parsed_serviceUrl = data.serviceUrl || "UnlistedForDebug";
	let parsed_from_id = data.from?.id || "UnlistedForDebug";
	let parsed_from_name = data.from?.name || "UnlistedForDebug";
	let parsed_recipient_id = data.recipient?.id || "UnlistedForDebug";
	let parsed_recipient_name = data.recipient?.name || "UnlistedForDebug";
	let parsed_payload = payload || null;
	let parsed_filename_ingress = filename_ingress || null;
	let parsed_activity_raw_timestamp = data.activity_raw_timestamp || null;
	let parsed_activity_caller_id = data.activity_caller_id || "UnlistedForDebug";
	let parsed_stateHashJSON = stateHashJSON || "{\"key\": \"UnlistedForDebug\"}";
	let parsed_isFirstInteraction = data.isFirstInteraction || false;
	let parsed_is_group = data.conversation?.isGroup || false;
	let parsed_conversation_id = data.conversation?.id || "UnlistedForDebug";
	let parsed_conversation_name = data.conversation?.name || "UnlistedForDebug";
	let parsed_slack_state_hash_thread_timestamp = data.channelData?.SlackMessage?.event?.thread_ts || data.thread_ts || "UnlistedForDebug";
	let parsed_bot_invoked_flag = data.stateHash?.bot_invoked_flag || false;
	let parsed_api_token = data.channelData?.SlackMessage?.api_token || "UnlistedForDebug";
	let parsed_conversation_conversationType = data.channelData?.msteams?.conversation?.conversationType || "UnlistedForDebug";
	let parsed_conversation_tenantId = data.channelData?.msteams?.conversation?.tenantId || "UnlistedForDebug";
	//not this one let parsed_msteams_conversation_id = data.channelData?.msteams?.conversation?.id || "UnlistedForDebug";
	let parsed_msteams_conversation_id = data.conversation?.id || null;
	//let parsed_aadObjectId2 = data.recipient?.aadObjectId || null;
	let parsed_aadObjectId = data.from?.aadObjectId || null;
	let parsed_localTimestamp = data.localTimestamp || null;
	let parsed_webchat_conversation_id = data.conversation?.id || null;
	let parsed_textFormat = data.textFormat || null;
	let parsed_localTimezone = data.localTimezone || null;


	result = await pool.query(query, [
	  parsed_responded_ref_responded, 
	  parsed_turn_context_state_collection, 
	  parsed_bot_identity_claims_identity_authentication_type,
	  parsed_connector_client_with_credentials,
	  parsed_connector_client_http_client, 
	  parsed_user_token_client_app_id, 
	  parsed_connector_factory_app_id, 
	  parsed_connector_factory_validate_authority,
	  parsed_turn_locale, parsed_locale, 
	  parsed_type, parsed_id, parsed_timestamp,
	  parsed_serviceUrl, channelId, 
	  parsed_from_id, 
	  parsed_from_name, parsed_recipient_id, parsed_recipient_name, 
	  parsed_payload || null, parsed_filename_ingress || null, 
	  parsed_activity_raw_timestamp, parsed_activity_caller_id, parsed_stateHashJSON, 
	  parsed_isFirstInteraction,
	  parsed_is_group,
	  parsed_conversation_id, 
	  parsed_conversation_name, 
	  parsed_slack_state_hash_thread_timestamp,
	  parsed_bot_invoked_flag,
	  parsed_api_token,
	  parsed_conversation_conversationType,
	  parsed_conversation_tenantId,
	  parsed_msteams_conversation_id, 
	  parsed_aadObjectId, 
	  parsed_localTimestamp,
	  parsed_webchat_conversation_id,
	  parsed_textFormat,
	  parsed_localTimezone,
	  slackUrl || "Test Slack URL in await path" 
	]);
		//DEBUG console.log('\n*POSTGRES_UTILS.JS: [DEBUG] Query result:', result); // Log result of query


    if (result.rows.length > 0) {
      console.log(`\n\n*POSTGRES_UTILS.JS: Data saved to bot_router_log with messageID = ${result.rows[0].message_id}, and pk_id = ${result.rows[0].pk_id}`);
    } else {
      console.log('\n*POSTGRES_UTILS.JS: No data returned after INSERT operation');
    }
  } catch (error) {
    console.error('\n*POSTGRES_UTILS.JS: Failed to save data to Postgres', error);
  }
  //DEBUG console.log('\n*POSTGRES_UTILS.JS:[DEBUG] Exiting botRouterSaveDataToPostgres');  // Log end of function

}

function getSlackPayload(data, path) {
	try {
		let payload = data.channelData?.SlackMessage?.event?.text ? data.channelData.SlackMessage.event.text : data.text;
		return (payload || "").substring(0, 2900); // truncate message text
	} catch(_) {
		return JSON.stringify(data).substring(0, 2900); // default to entire payload
	}
}
function generateSlackUrl(channelId, timestamp, threadTs) {
    let parsedTimestamp = timestamp.replace('.', '').substring(0, 16);  // preserve only 16 digits.
  
    let baseSlackUrl = `https://teradata.slack.com/archives/${channelId}/p${parsedTimestamp}`;
  
    if (threadTs !== null) {
        baseSlackUrl += `?thread_ts=${threadTs}&cid=${channelId}`;
    }
  
    return baseSlackUrl;
}

//default for msteams and webchat
function getPayload(data, path) {
	try {
		// Split path into array and reduce the path while checking at each level if the value is defined.
		// If at any level the value is not defined, it will return undefined which will be caught by the fallback in the catch block.
		let payload = path.split('.').reduce((acc, currVal) => acc[currVal] !== undefined ? acc[currVal] : undefined, data);
		return (payload || "").substring(0, 2900); // truncate message text
	} catch(_) {
		return JSON.stringify(data).substring(0, 2900); // default to entire payload
	}
}
async function chatHelperSaveDataToPostgres(data) {
    try {
        const query = `
        INSERT INTO bot_chat_interactions (
            creation_timestamp, chat_id, timestamp,
            user_message, assistant_response, is_active_thread,
            incoming_channel_source, frustration_count, let_me_check_flag,
            requery, total_tokens, payload_source,
            cleaned_duplicates_count, total_tokens_in_chat,
            chat_gpt3_5turbo_cost_estimate, chat_gpt4_cost_estimate
        ) 
        VALUES (
            NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        ) RETURNING pk_id, chat_id`;

        let result = await pool.query(query, [
            data.chat_id, data.timestamp,
            data.user_message, data.assistant_response, data.is_active_thread,
            data.incoming_channel_source, data.frustration_count, data.let_me_check_flag,
            data.requery, data.total_tokens, data.payload_source,
            data.cleaned_duplicates_count, data.total_tokens_in_chat,
            data.chat_gpt3_5turbo_cost_estimate, data.chat_gpt4_cost_estimate
        ]);

        if (result.rows.length > 0) {
            console.log(`\n*POSTGRES_UTILS.JS: Data saved to bot_chat_interactions with chat_id = ${data.chat_id}`);
        } else {
            console.log('\n*POSTGRES_UTILS.JS: No Data returned after insert operation');
        }
    } catch (error) {
        console.error(`\n*POSTGRES_UTILS.JS: Failed to save data to bot_chat_interactions for chat_id = ${data.chat_id}`, error);
    }
}

async function fetchAADObjectIdFromDB(chatID) {
    const query = `SELECT msteam_recipient_aad_object_id FROM vw_msteams_conversation_threads WHERE chat_id = $1`;
    const result = await pool.query(query, [chatID]);
    return result.rows;
}

async function fetchLast24HrInteractionPerUserFromDB(aadObjectID) {
    const query = `SELECT user_interacting, hourssincelastinteraction, user_invoke_message, bot_response_message
	FROM vw_msteams_conversation_threads
	WHERE msteam_recipient_aad_object_id = $1
	AND inlast24hrs =true
	ORDER BY bci_pk_id DESC
	LIMIT 5`;
    const result = await pool.query(query, [aadObjectID]);
    return result.rows;
}
	
module.exports = {
	botIngressSaveDataToPostgres,
	botRouterSaveDataToPostgres,
	chatHelperSaveDataToPostgres,
	getQAFromDatabase,
    fetchAADObjectIdFromDB,
    fetchLast24HrInteractionPerUserFromDB
};