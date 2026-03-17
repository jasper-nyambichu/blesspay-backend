// src/utils/mpesa.js
import axios from 'axios'

const MPESA_BASE_URL =
    process.env.MPESA_ENV === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke'

// ── Token cache — avoids a Safaricom round trip on every payment ──────
// Safaricom tokens expire after 3600s. We refresh 5 minutes early.
let cachedToken = null
let tokenExpiresAt = 0

const getAccessToken = async () => {
    const now = Date.now()

    // return cached token if still valid
    if (cachedToken && now < tokenExpiresAt) {
        return cachedToken
    }

    const credentials = Buffer.from(
        `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString('base64')

    const response = await axios.get(
        `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
        {
            headers: { Authorization: `Basic ${credentials}` },
            timeout: 10000, // 10s timeout — fail fast if Safaricom is slow
        }
    )

    cachedToken = response.data.access_token
    // cache for 55 minutes (token lasts 60 min, refresh 5 min early)
    tokenExpiresAt = now + 55 * 60 * 1000

    return cachedToken
}

// ── Generate base64 password for STK push ────────────────────────────
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

// ── Format phone to 254XXXXXXXXX ─────────────────────────────────────
const formatPhone = (phone) => {
    const cleaned = phone
        .replace(/\s+/g, '')
        .replace(/^0/, '254')
        .replace(/^\+/, '')
    return cleaned
}

// ── Trigger STK push ──────────────────────────────────────────────────
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
            timeout: 15000, // 15s timeout — Safaricom STK can be slow
        }
    )

    return response.data
}

export { getAccessToken, stkPush, formatPhone }