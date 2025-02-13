const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
require('dotenv').config();
async function _getToken(clientId, clientSecret, technicalAccountId, orgId, privateKey) {
    const tokenEndpoint = 'https://ims-na1.adobelogin.com/ims/exchange/jwt';

    const payload = {
        exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiration
        iss: orgId,
        sub: technicalAccountId,
        aud: `https://ims-na1.adobelogin.com/c/${clientId}`,
        'https://ims-na1.adobelogin.com/s/ent_aem_cloud_api': true
    };

    const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

    const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            jwt_token: token
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
}

module.exports = {
    tokenize () {
        const clientId = process.env.AEM_CLIENT_ID;
        const clientSecret = process.env.AEM_CLIENT_SECRET;
        const technicalAccountId = process.env.AEM_TECHNICAL_ACCOUNT_ID;
        const orgId = process.env.AEM_ORG_ID;
        const privateKey = process.env.AEM_PRIVATE_KEY.replace(/\\r\\n/g, '\n');
        return _getToken(clientId, clientSecret, technicalAccountId, orgId, privateKey);
    }
}
