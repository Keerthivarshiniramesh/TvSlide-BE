const mongoose = require('mongoose')

const usersSchema = new mongoose.Schema({
    id: { type: Number, required: true, trim: true },
    fullname: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, match: /^\S+@\S+\.\S+$/ },
    // contact: { type: Number, required: true, validate: { validator: v => /^\d{10}$/.test(v), message: 'Contact must be a 10-digit number.' } },
    password: { type: String, required: true }
}, {
    timestamps: true

})

const usersModel = mongoose.model('Admin', usersSchema)

module.exports = usersModel