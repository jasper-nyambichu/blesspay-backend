import mongoose from 'mongoose'
import { Admin } from '../models/admin.model.js'
import 'dotenv/config'

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log('✅ MongoDB connected')

        const existing = await Admin.findOne({ email: 'admin@blesspay.com' })
        if (existing) {
            console.log('⚠️  Admin already exists')
            process.exit(0)
        }

        await Admin.create({
            username: 'superadmin',
            email: 'admin@blesspay.com',
            password: 'Admin@12345',
        })

        console.log('✅ Admin created successfully')
        console.log('   Email    : admin@blesspay.com')
        console.log('   Password : Admin@12345')
        console.log('⚠️  Change this password immediately after first login')
        process.exit(0)
    } catch (error) {
        console.error('❌ Seeder failed:', error.message)
        process.exit(1)
    }
}

seedAdmin()

