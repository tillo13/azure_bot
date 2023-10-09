const { Pool } = require('pg');

const pool = new Pool({
    user: process.env['2023oct9_AZURE_POSTGRES_USER'],
    host: process.env['2023oct9_AZURE_POSTGRES_HOST'],
    database: process.env['2023oct9_AZURE_POSTGRES_DATABASE'],
    password: process.env['2023oct9_AZURE_POSTGRES_PASSWORD'],
    port: process.env['2023oct9_AZURE_POSTGRES_PORT'],
});

pool.on('error', (err, client) => {
    console.error('\n*POSTGRES_UTILS.JS: Unexpected error on idle client', err)
    client.end();
})

async function saveDataToPostgres(data, channelId) {
    let preparedData = {};

    // Prepare data for different channels
    try {
        switch (channelId) {
            case 'webchat':
                preparedData = webchatIngressData(data);
                break;
            case 'slack':
                preparedData = slackIngressData(data);
                break;
            case 'msteams':
                preparedData = msteamsIngressData(data);
                break;
            default:
                preparedData = defaultIngressData(data);
                break;
        }
    } catch (error) {
        console.error('\n*POSTGRES_UTILS.JS: Error preparing data', error);
    }

    try {
        const query = `
            INSERT INTO bot_invoke_log (
                channel_id, message_type, message_id, timestamp_from_endpoint, local_timestamp_from_endpoint, 
                local_timezone_from_endpoint, service_url, from_id, from_name, 
                conversation_id, attachment_exists, recipient_id, recipient_name,
                channeldata_webchat_id, channeldata_slack_app_id, channeldata_slack_event_id, 
                channeldata_slack_event_time, channeldata_msteams_tenant_id
            ) 
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18 
            )`;

        await pool.query(query, [
            channelId, data.type, data.id, data.timestamp,
            data.localTimestamp, data.localTimezone, data.serviceUrl,
            data.from.id, data.from.name, data.conversation.id,
            data.attachments && data.attachments.length > 0, 
            data.recipient.id, data.recipient.name,
            preparedData.channeldata_webchat_id,
            preparedData.channeldata_slack_app_id, 
            preparedData.channeldata_slack_event_id, 
            preparedData.channeldata_slack_event_time, 
            preparedData.channeldata_msteams_tenant_id
        ]);
        console.log('\n*POSTGRES_UTILS.JS: Data saved to Postgres');
    } catch (err) {
        console.error('\n*POSTGRES_UTILS.JS: Failed to save data to Postgres', err);
    }
}

function webchatIngressData(data) {
    try {
        return {
            channeldata_webchat_id: data.channelData.clientActivityID
        };
    } catch (error) {
        console.error('\n*POSTGRES_UTILS.JS: Error accessing clientActivityID', error);
        return {
            channeldata_webchat_id: 'undetermined'
        };
    }
}

function slackIngressData(data) {
    try {
        const slackData = data.channelData.SlackMessage;
        return {
            channeldata_slack_app_id: slackData.api_app_id,
            channeldata_slack_event_id: slackData.event_id,
            channeldata_slack_event_time: slackData.event_time
        };
    } catch (error) {
        console.error('\n*POSTGRES_UTILS.JS: Error accessing Slack Data', error);
        return {
            channeldata_slack_app_id: 'undetermined',
            channeldata_slack_event_id: 'undetermined',
            channeldata_slack_event_time: 'undetermined'
        };
    }
}

function msteamsIngressData(data) {
    try {
        return {
            channeldata_msteams_tenant_id: data.channelData.tenant.id
        };
    } catch (error) {
        console.error('\n*POSTGRES_UTILS.JS: Error accessing MS Teams data', error);
        return {
            channeldata_msteams_tenant_id: 'undetermined'
        };
    }
}

function defaultIngressData() {
    return {};
}

module.exports = {
    saveDataToPostgres
};