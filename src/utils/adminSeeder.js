// src/utils/adminSeeder.js
import { connectDB } from '../config/db.js'
import { Admin } from '../models/admin.model.js'
import 'dotenv/config'

const seedAccounts = async () => {
    try {
        await connectDB()
        console.log('✅  Database connected')

        // ── Seed Admin ────────────────────────────────────────
        const existingAdmin = await Admin.findByEmail('admin@blesspay.com')
        if (existingAdmin) {
            console.log('⚠️   Admin already exists — skipping')
        } else {
            await Admin.create({
                firstName: 'Super',
                lastName:  'Admin',
                email:     'admin@blesspay.com',
                password:  'Admin@12345',
                role:      'admin',
            })
            console.log('✅  Admin created')
            console.log('    Email    : admin@blesspay.com')
            console.log('    Password : Admin@12345')
        }

        // ── Seed Treasurer ────────────────────────────────────
        const existingTreasurer = await Admin.findByEmail('treasurer@blesspay.com')
        if (existingTreasurer) {
            console.log('⚠️   Treasurer already exists — skipping')
        } else {
            await Admin.create({
                firstName: 'Church',
                lastName:  'Treasurer',
                email:     'treasurer@blesspay.com',
                password:  'Treasurer@12345',
                role:      'treasurer',
            })
            console.log('✅  Treasurer created')
            console.log('    Email    : treasurer@blesspay.com')
            console.log('    Password : Treasurer@12345')
        }

        console.log('⚠️   Change all default passwords immediately after first login')
        process.exit(0)
    } catch (error) {
        console.error('❌  Seeder failed:', error.message)
        process.exit(1)
    }
}

seedAccounts()
