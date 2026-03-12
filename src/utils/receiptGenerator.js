import PDFDocument from 'pdfkit'

const generateReceipt = (transaction, user) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 })
        const buffers = []

        doc.on('data', (chunk) => buffers.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(buffers)))
        doc.on('error', reject)

        // header
        doc.fontSize(22).font('Helvetica-Bold').text('BlessPay', { align: 'center' })
        doc.fontSize(12).font('Helvetica').text('Tithe & Offering Receipt', { align: 'center' })
        doc.moveDown()
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
        doc.moveDown()

        // transaction details
        doc.fontSize(12).font('Helvetica-Bold').text('Transaction Details')
        doc.moveDown(0.5)

        doc.font('Helvetica')
        doc.text(`Receipt No     : ${transaction.mpesaReceiptNumber || 'N/A'}`)
        doc.text(`Date           : ${new Date(transaction.createdAt).toLocaleString()}`)
        doc.text(`Member         : ${user.username}`)
        doc.text(`Email          : ${user.email}`)
        doc.text(`Phone          : ${transaction.phone}`)
        doc.text(`Type           : ${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}`)
        doc.text(`Amount         : KES ${transaction.amount.toLocaleString()}`)
        doc.text(`Status         : ${transaction.status.toUpperCase()}`)
        doc.text(`Payment Method : Mpesa`)

        doc.moveDown()
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
        doc.moveDown()

        // footer
        doc.fontSize(10).font('Helvetica').fillColor('grey')
        doc.text('Thank you for your faithful giving. God bless you.', { align: 'center' })
        doc.text('This is a system-generated receipt.', { align: 'center' })

        doc.end()
    })
}

export { generateReceipt }