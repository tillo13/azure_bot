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

async function botInteractionSaveDataToPostgres(data, channelId, filename_ingress) {
	console.log('\n*POSTGRES_UTILS.JS: Saving data to Postgres for botInteraction path:', data);
	console.log('\n*POSTGRES_UTILS.JS: Interaction Channel Data for botInteraction path :', data.channelData);

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
			payload = getPayload(data, 'channelData.SlackMessage.event.text');
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
		console.error('\n*POSTGRES_UTILS.JS: Error preparing data for botInteraction path: ', error);
	}

	// Execute query
	try {
		const query = `
		INSERT INTO public.bot_router_log (
			channel_id, message_type, message_id, timestamp_from_endpoint, local_timestamp_from_endpoint, 
			local_timezone_from_endpoint, service_url, from_id, from_name, conversation_id, 
			attachment_exists, recipient_id, recipient_name, message_payload,
			state_hash_conversation_thread, state_hash_is_first_interaction,
			interacting_user_id, channeldata_slack_thread_ts,
			channeldata_msteams_conversation_id, channeldata_webchat_conversation_id, 
			filename_ingress
		)
		VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
			$15::json, $16, $17, $18, $19, $20, $21
		) RETURNING pk_id, message_id`;

		let values = [
			channelId,
			data.type || null, 
			data.id || null, 
			data.timestamp || null, 
			data.localTimestamp || null,
			data.localTimezone || null,
			data.serviceUrl || null,
			data.from ? data.from.id : null,
			data.from ? data.from.name : null,
			data.conversation_id ? data.conversation_id : null,
			data.hasAttachments ? data.hasAttachments() : false,
			data.recipient ? data.recipient.id : null,
			data.recipient ? data.recipient.name : null,
			payload || null,
			JSON.stringify(data.stateHash) || null, // assuming state hash as an object
			data.isFirstInteraction || false, // assuming isFirstInteraction as a boolean
			data.interactingUser ? data.interactingUser.id : null,
			data.channelData && data.channelData.slack ? data.channelData.slack.threadTimestamp : null,
			data.channelData && data.channelData.msteams ? data.channelData.msteams.conversation.id : null,
			data.channelData && data.channelData.webchat ? data.channelData.webchat.conversation.id : null,
			filename_ingress || null
		];

		console.log('\n*POSTGRES_UTILS.JS: Query Values:', values);

		let result = await pool.query(query, values);
		if (result.rows.length > 0) {
			console.log(`\n*POSTGRES_UTILS.JS: Data saved with messageID = ${result.rows[0].message_id}, and pk_id = ${result.rows[0].pk_id}`);
		} else {
			console.log('\n*POSTGRES_UTILS.JS: No data returned after INSERT operation');
		}
	} catch (error) {
		console.error('\n*POSTGRES_UTILS.JS: Failed to save data to Postgres', error);
	}
}

function getPayload(data, path) {
	try {
		let fields = path.split('.');
		let payload = fields.reduce((prev, curr) => prev ? prev[curr] : undefined, data);
		return (payload || "").substring(0, 2900); // truncate message text
	} catch(_) {
		return JSON.stringify(data).substring(0, 2900); // default to entire payload
	}
}

module.exports = {
	botIngressSaveDataToPostgres,
	botInteractionSaveDataToPostgres
};