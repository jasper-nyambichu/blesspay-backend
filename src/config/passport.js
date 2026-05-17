import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { User } from '../models/user.model.js'
import { Notification } from '../models/notification.model.js'

passport.use(new GoogleStrategy(
    {
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            const email     = profile.emails?.[0]?.value
            const firstName = profile.name?.givenName  || profile.displayName?.split(' ')[0] || ''
            const lastName  = profile.name?.familyName || profile.displayName?.split(' ')[1] || ''
            const avatarUrl = profile.photos?.[0]?.value || null

            if (!email) {
                return done(null, false, { message: 'No email found in Google profile' })
            }

            const user = await User.upsertGoogle({
                googleId: profile.id,
                email,
                firstName,
                lastName,
                avatarUrl,
            })

            // Send welcome notification only for brand new Google sign-ups
            if (user.isNew) {
                try {
                    await Notification.create({
                        userId:  user.id,
                        type:    'info',
                        title:   'Welcome to BlessPay! 🙏',
                        message: `Hi ${firstName}, your account has been created successfully. Start your giving journey today.`,
                    })
                } catch (notifError) {
                    console.warn('⚠️  Welcome notification failed (non-critical):', notifError.message)
                }
            }

            return done(null, user)
        } catch (error) {
            return done(error, null)
        }
    }
))

export default passport