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
		console.error('\n*POSTGRES_UTILS.JS:: Error preparing data', error);
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
			channeldata_msteams_tenant_id, message_payload
		) 
		VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
		) RETURNING pk_id, message_id`;

		let result = await pool.query(query, [
			channelId, data.type, data.id, data.timestamp, data.localTimestamp, 
			data.localTimezone, data.serviceUrl, data.from.id, data.from.name, 
			data.conversation.id, data.attachments && data.attachments.length > 0, 
			data.recipient.id, data.recipient.name, preparedData.channeldata_webchat_id, 
			preparedData.channeldata_slack_app_id, preparedData.channeldata_slack_event_id, 
			preparedData.channeldata_slack_event_time, 
			preparedData.channeldata_msteams_tenant_id, payload
		]);

		if (result.rows.length > 0) {
			console.log(`\n*POSTGRES_UTILS.JS: Data saved to Postgres with messageID from ingress = ${result.rows[0].message_id}, and pk_id = ${result.rows[0].pk_id}`);
		} else {
			console.log('\n*POSTGRES_UTILS.JS: No Data returned after insert operation');
		}
	} catch (err) {
		console.error('\n*POSTGRES_UTILS.JS: Failed to save data to Postgres', err);
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

async function botInteractionSaveDataToPostgres(data, channelId) {
    console.log('\n*POSTGRES_UTILS.JS: iSaving data to Postgres:', data);  
    try {
        const query = `
        INSERT INTO public.bot_invoke_log (
            channel_id, message_type, message_id, timestamp_from_endpoint, local_timestamp_from_endpoint, 
            local_timezone_from_endpoint, service_url, from_id, from_name, conversation_id, 
            attachment_exists, recipient_id, recipient_name, message_payload,
            bot_response_id, conversation_turn, bot_response_payload,
            interacting_user_id, channeldata_slack_thread_ts,
            channeldata_msteams_conversation_id, channeldata_webchat_conversation_id
        ) 
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
            $15, $16, $17, $18, $19, $20, $21
        ) RETURNING pk_id, message_id`;

        console.log('\n*POSTGRES_UTILS.JS: iRunning Query:', query); 
        
        let values = [
            channelId, 
            data.type, 
            data.id, 
            data.timestamp, 
            data.localTimestamp, 
            data.localTimezone, 
            data.serviceUrl, 
            data.from ? data.from.id : null,
            data.from ? data.from.name : null,
            data.conversation ? data.conversation.id : null,
            data.hasAttachments ? data.hasAttachments() : false,
            data.recipient ? data.recipient.id : null,
            data.recipient ? data.recipient.name : null,
            JSON.stringify(data),
            data.botResponse ? data.botResponse.id : null,
            data.conversationTurn || null,
            data.botResponse ? JSON.stringify(data.botResponse) : null,
            data.interactingUser ? data.interactingUser.id : null,
            data.channelData && data.channelData.slack ? data.channelData.slack.threadTimestamp : null,
            data.channelData && data.channelData.msteams ? data.channelData.msteams.conversation.id : null,
            data.channelData && data.channelData.webchat ? data.channelData.webchat.conversation.id : null
        ];
        
        console.log('\n*POSTGRES_UTILS.JS: iQuery Values:', values);  
        
        let result = await pool.query(query, values);
        if (result.rows.length > 0) {
            console.log(`\n*POSTGRES_UTILS.JS: iData saved with messageID = ${result.rows[0].message_id}, and pk_id = ${result.rows[0].pk_id}`);
        } else {
            console.log('\n*POSTGRES_UTILS.JS: iNo data returned after INSERT operation');
        }
    } catch (error) {
        console.error('\n*POSTGRES_UTILS.JS: iFailed to save data to Postgres', error);
    }
}

module.exports = {
	botIngressSaveDataToPostgres,
	botInteractionSaveDataToPostgres
};