const mongoose = require('mongoose')


const carouselSchema = mongoose.Schema({
    id: { type: Number, unique: true },
    duration: { type: Number },
    ImageSlide: [{
        filename: { type: String, required: true },
        filepath: { type: String, required: true }
    }]
    ,
    VideoSlide:
        [{
            filename: { type: String, required: true },
            filepath: { type: String, required: true }
        }],

}, { timestamps: true })

const carouselModel = mongoose.model('Carousel', carouselSchema)

module.exports = carouselModel