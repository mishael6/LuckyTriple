const axios = require('axios');
require('dotenv').config({ path: './.env' });

const testSMS = async () => {
    const PAYLOQA_CONFIG = {
        apiKey: process.env.PAYLOQA_API_KEY || 'pk_live_of502pjkel',
        platformId: process.env.PAYLOQA_PLATFORM_ID || 'plat_xvadsq3rx0f',
        smsBaseURL: 'https://sms.payloqa.com/api/v1',
    };

    const phone = '+233550000000'; // Dummy phone
    const message = 'Test message from LuckyTriple';

    try {
        console.log('Sending with config:', PAYLOQA_CONFIG);
        const response = await axios.post(
            `${PAYLOQA_CONFIG.smsBaseURL}/sms/send`,
            {
                recipient_number: phone,
                sender_id: 'LuckyTriple',
                message: message,
                usage_message_type: 'notification'
            },
            {
                headers: {
                    'X-API-Key': PAYLOQA_CONFIG.apiKey,
                    'X-Platform-Id': PAYLOQA_CONFIG.platformId,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('Success:', response.data);
    } catch (error) {
        console.error('API Error Response Status:', error.response?.status);
        console.error('API Error Response Data:', JSON.stringify(error.response?.data, null, 2));
        console.error('API Error Message:', error.message);
    }
};

testSMS();
