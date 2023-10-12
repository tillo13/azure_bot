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
			payload = getSlackPayloadFromContextObj(data, 'text');
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
		webchat_activity_conversation_id, webchat_activity_text_format, webchat_activity_local_timezone
	)
	VALUES (
		NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, 
		$10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 
		$20, $21, $22, $23, $24, $25, NOW(), $26, $27, $28, 
		$29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39
	) RETURNING pk_id, message_id`;
	//DEBUG console.log('\n*POSTGRES_UTILS.JS: [DEBUG] Running query:', query); // Log your query


    let result = await pool.query(query, [
			// Assuming some fields from your data
			data.responded_ref_responded, data.turn_context_state_collection, data.bot_identity_claims_identity_authentication_type,
			data.connector_client_with_credentials, data.connector_client_http_client, 
			data.user_token_client_app_id, data.connector_factory_app_id, data.connector_factory_validate_authority,
			data.turn_locale, data.locale, 
			data.type, data.id, data.timestamp,
			data.serviceUrl, channelId, 
			data.from?.id, 
			data.from?.name, data.recipient?.id, data.recipient?.name, 
			payload || null, filename_ingress || null, 
			data.activity_raw_timestamp, data.activity_caller_id, stateHashJSON, 
			data.isFirstInteraction || false, 
			data.channelData?.slack?.conversation?.is_group || null,
			data.channelData?.slack?.conversation?.id || null,
			data.channelData?.slack?.conversation?.name || null,
			data.channelData?.SlackMessage?.event?.thread_ts || data.thread_ts || null,
			data.stateHash?.bot_invoked_flag || null,
			data.channelData && data.channelData.slack ? data.channelData.slack.api_token : null,
			data.channelData?.msteams?.conversation?.conversationType,
			data.channelData?.msteams?.conversation?.tenantId,
			data.channelData?.msteams?.conversation?.id, 
			data.recipient?.aadObjectId || null, 
			data.localTimestamp || null,
			data.conversation?.id || null,
			data.textFormat || null,
			data.localTimezone || null,
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

function getSlackPayloadFromContextObj(data, path) {
	try {
		let payload = data.channelData?.SlackMessage?.event?.text ? data.channelData.SlackMessage.event.text : data.text;
		return (payload || "").substring(0, 2900); // truncate message text
	} catch(_) {
		return JSON.stringify(data).substring(0, 2900); // default to entire payload
	}
}
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