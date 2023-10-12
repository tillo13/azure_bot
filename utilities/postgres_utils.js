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
		console.log('\n*POSTGRES_UTILS.JS: Webchat data logged to Postgres');
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
		console.log('\n*POSTGRES_UTILS.JS: executing function slackIngressData...');
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
		console.log('\n*POSTGRES_UTILS.JS: MS Teams data logged to Postgres');
		return {
			channeldata_msteams_tenant_id: data.channelData.tenant.id
		};
	} else {
		console.error('\n*POSTGRES_UTILS.JS: MS Teams data is undefined');
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
			console.log(`\n*POSTGRES_UTILS.JS: Data saved to Postgres with messageID for botIngress path:  = ${result.rows[0].message_id}, and pk_id = ${result.rows[0].pk_id}`);
		} else {
			console.log('\n*POSTGRES_UTILS.JS: No Data returned after insert operation for botIngress path: ');
		}
	} catch (err) {
		console.error('\n*POSTGRES_UTILS.JS: Failed to save data to Postgres for botIngress path: ', err);
	}
}

function webchatIngressData(data) {
	if (data.channelData && data.channelData.clientActivityID) {
		console.log('\n*POSTGRES_UTILS.JS: Webchat data logged to Postgres');
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
		console.log('\n*POSTGRES_UTILS.JS: Slack data logged to Postgres');
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
		console.log('\n*POSTGRES_UTILS.JS: MS Teams data logged to Postgres');
		return {
			channeldata_msteams_tenant_id: data.channelData.tenant.id
		};
	} else {
		console.error('\n*POSTGRES_UTILS.JS: MS Teams data is undefined');
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

  console.log('\n*POSTGRES_UTILS.JS: Saving data to Postgres for botRouter path:', data);
  console.log('\n*POSTGRES_UTILS.JS: Interaction Channel Data for botRouter path :', data.channelData);

  let preparedData = {};
  let payload;



  // Prepare data for different channels
  try {
    switch (channelId) {
      case 'webchat':
      	preparedData = webchatIngressData(data);
      	payload = getPayload(data, 'text');
      	break;
		  case 'slack':
			preparedData = slackIngressData(data);
			let slackPath = data.channelData?.SlackMessage?.event?.text ? 'channelData.SlackMessage.event.text' : 'text';
			payload = getPayload(data, slackPath);
	
			// extract channelId and threadTs from data
			let slackChannelId = data.conversation?.id || "UnlistedForDebug";
			let timestamp = data.timestamp || null;
			let threadTs = data.channelData?.SlackMessage?.event?.thread_ts || data.thread_ts || null;
	
			// Generate slackUrl
			slackUrl = generateSlackUrl(slackChannelId, timestamp, threadTs);
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
		webchat_activity_conversation_id, webchat_activity_text_format, webchat_activity_local_timezone,slack_url,
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
	let parsed_msteams_conversation_id = data.channelData?.msteams?.conversation?.id || "UnlistedForDebug";
	let parsed_aadObjectId = data.recipient?.aadObjectId || null;
	let parsed_localTimestamp = data.localTimestamp || null;
	let parsed_webchat_conversation_id = data.conversation?.id || null;
	let parsed_textFormat = data.textFormat || null;
	let parsed_localTimezone = data.localTimezone || null;
	
	console.log('\n*POSTGRES_UTILS.JS: [DEBUG] Now see the parsed list of values',
	{parsed_responded_ref_responded, 
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
	parsed_payload, parsed_filename_ingress, 
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
	slackUrl }
  )	

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
	  slackUrl
	]);
		//DEBUG console.log('\n*POSTGRES_UTILS.JS: [DEBUG] Query result:', result); // Log result of query


    if (result.rows.length > 0) {
      console.log(`\n*POSTGRES_UTILS.JS: Data saved to bot_router_log with messageID = ${result.rows[0].message_id}, and pk_id = ${result.rows[0].pk_id}`);
    } else {
      console.log('\n*POSTGRES_UTILS.JS: No data returned after INSERT operation');
    }
  } catch (error) {
    console.error('\n*POSTGRES_UTILS.JS: Failed to save data to Postgres', error);
  }
  console.log('\n*POSTGRES_UTILS.JS:[DEBUG] Exiting botRouterSaveDataToPostgres');  // Log end of function

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
    const [wholeTs, fractionalTs] = timestamp.split('.');
    const reformattedTs = `${wholeTs}${fractionalTs.padEnd(6, '0')}`; // pad to 6 digits if fractionalTs is less than 6
   
    let url = `https://teradata.slack.com/archives/${channelId}/p${reformattedTs}`;
  
    if (threadTs) {
        url += `?thread_ts=${threadTs}&cid=${channelId}`;
    }
   
    return url;
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

module.exports = {
	botIngressSaveDataToPostgres,
	botRouterSaveDataToPostgres
};