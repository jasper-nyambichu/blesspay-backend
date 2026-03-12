import axios from 'axios'

const MPESA_BASE_URL =
    process.env.MPESA_ENV === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke'

// get OAuth access token from Safaricom
const getAccessToken = async () => {
    const credentials = Buffer.from(
        `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString('base64')

    const response = await axios.get(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${credentials}` },
    })

    return response.data.access_token
}

// generate base64 encoded password for STK push
const generatePassword = () => {
    const timestamp = new Date()
        .toISOString()
        .replace(/[-T:.Z]/g, '')
        .slice(0, 14)

    const password = Buffer.from(
        `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64')

    return { password, timestamp }
}

// format phone number to 254XXXXXXXXX
const formatPhone = (phone) => {
    const cleaned = phone.replace(/\s+/g, '').replace(/^0/, '254').replace(/^\+/, '')
    return cleaned
}

// trigger STK push to user's phone
const stkPush = async ({ accessToken, phone, amount }) => {
    const { password, timestamp } = generatePassword()

    const response = await axios.post(
        `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
        {
            BusinessShortCode: process.env.MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.ceil(amount),
            PartyA: formatPhone(phone),
            PartyB: process.env.MPESA_SHORTCODE,
            PhoneNumber: formatPhone(phone),
            CallBackURL: process.env.MPESA_CALLBACK_URL,
            AccountReference: 'BlessPay',
            TransactionDesc: 'Tithe and Offering Payment',
        },
        {
            headers: { Authorization: `Bearer ${accessToken}` },
        }
    )

    return response.data
}

export { getAccessToken, stkPush }