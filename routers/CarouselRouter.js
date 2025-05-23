const Express = require('express')
const isAuth = require('../middleware/isAuth')
const CarouselModel = require('../models/Carousel')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const uploads = 'upload/'
if (!fs.existsSync(uploads)) {
    fs.mkdirSync(uploads)
}

// store the engine
const Storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'upload/')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
})

// file filter based on some condition

const filter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'video/mp4', 'video/webm', 'video/x-matroska']; // mkv

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only valid image/video files are allowed"), false);
    }


}

// middleware for the fileupload
const upload = multer({
    storage: Storage,
    fileFilter: filter,
    // limits: { fileSize: 7 * 1024 * 1024 }
})

const multiUpload = upload.fields([
    {
        name: 'ImageSlide', maxCount: 5
    },
    {
        name: 'VideoSlide', maxCount: 5
    }
])

const CarouselRouter = Express.Router()


CarouselRouter.post('/create-slide', isAuth, multiUpload, async (req, res) => {
    try {
        const { duration, id } = req.body;

        const ImageSlideFile = req.files?.['ImageSlide'] || [];
        const VideoSlideFile = req.files?.['VideoSlide'] || [];

        const newImageFile = ImageSlideFile.map((imgs) => ({
            filename: imgs.filename,
            filepath: imgs.path.replace(/\\/g, '/'),
        }));

        const newVideoFile = VideoSlideFile.map((videos) => ({
            filename: videos.filename,
            filepath: videos.path.replace(/\\/g, '/'),
        }));

        if (!id) {
            // Check if slide already exists (assuming only one slide ever)
            const existingSlide = await CarouselModel.findOne();

            if (!existingSlide) {
                // No slide yet → create new one with id 1
                const newSlide = new CarouselModel({
                    id: 1,
                    duration,
                    ImageSlide: newImageFile,
                    VideoSlide: newVideoFile,
                });

                const saveSlide = await newSlide.save();

                if (saveSlide) {
                    return res.send({ success: true, message: "Image and/or video uploaded successfully" });
                } else {
                    return res.send({ success: false, message: "Something went wrong. Please try again." });
                }
            } else {
                // Slide exists → append images/videos to it
                if (duration) existingSlide.duration = duration; // Update duration if passed

                if (newImageFile.length > 0) {
                    existingSlide.ImageSlide.push(...newImageFile);
                }

                if (newVideoFile.length > 0) {
                    existingSlide.VideoSlide.push(...newVideoFile);
                }

                const updatedSlide = await existingSlide.save();

                if (updatedSlide) {
                    return res.send({ success: true, message: "Image and/or video uploaded successfully" });
                } else {
                    return res.send({ success: false, message: "Something went wrong. Please try again." });
                }
            }
        } else {
            // id is provided, append images/videos to the specified slide
            const existingSlide = await CarouselModel.findOne({ id });

            if (!existingSlide) {
                return res.send({ success: false, message: "Slide with this ID not found" });
            }

            if (duration) existingSlide.duration = duration; // Update duration if passed

            if (newImageFile.length > 0) {
                existingSlide.ImageSlide.push(...newImageFile);
            }

            if (newVideoFile.length > 0) {
                existingSlide.VideoSlide.push(...newVideoFile);
            }

            const updatedSlide = await existingSlide.save();

            if (updatedSlide) {
                return res.send({ success: true, message: "Image and/or video uploaded successfully" });
            } else {
                return res.send({ success: false, message: "Something went wrong. Please try again." });
            }
        }
    } catch (err) {
        console.log("Error in Carousel create:", err);
        return res.send({ success: false, message: 'Trouble in Carousel create! Please contact support Team.' });
    }
});


CarouselRouter.delete('/delete-file', isAuth, async (req, res) => {
    try {
        const { id, type, filename } = req.body; // type = 'ImageSlide' or 'VideoSlide'

        if (!id || !type || !filename) {
            return res.send({ success: false, message: 'Missing required parameters.' });
        }

        const slide = await CarouselModel.findOne({ id });
        if (!slide) {
            return res.send({ success: false, message: 'Slide not found.' });
        }

        // Filter out the file from the array
        slide[type] = slide[type].filter(file => file.filename !== filename);

        await slide.save();

        // Delete the file from disk
        const filePath = path.join(__dirname, '..', '..', 'upload', filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        return res.send({ success: true, message: `${type === 'ImageSlide' ? 'Image' : 'Video'} deleted successfully.` });

    } catch (err) {
        console.error("Error in delete-file:", err);
        return res.send({ success: false, message: 'Trouble in Carousel delete! Please contact support Team.' });
    }
})

// Upadte particular images


CarouselRouter.delete('/delete-image/:id', async (req, res) => {
    try {
        const { id, filename } = req.params;

        const numericId = parseInt(id, 10);
        if (isNaN(numericId)) {
            return res.send({ success: false, message: "Invalid ID format" });
        }

        const carousel = await CarouselModel.findOne({ id: numericId });
        if (!carousel) {
            return res.send({ success: false, message: "Carousel not found" });
        }

        // Find and remove the image from ImageSlide array
        const imageIndex = carousel.ImageSlide.findIndex(img => img.filename === filename);
        if (imageIndex === -1) {
            return res.send({ success: false, message: "Image not found" });
        }

        const imagePath = path.join(__dirname, '..', carousel.ImageSlide[imageIndex].filepath);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath); // delete file from disk
        }

        carousel.ImageSlide.splice(imageIndex, 1); // remove from array
        await carousel.save();

        return res.send({ success: true, message: "Image deleted successfully" });
    } catch (err) {
        console.error("Error in Uploading image:", err);
        return res.send({ success: false, message: 'Trouble in Carousel update image! Please contact support Team.' });
    }
});


CarouselRouter.delete('/delete-video/:id', async (req, res) => {
    try {
        const { id, filename } = req.params;

        const numericId = parseInt(id, 10);
        if (isNaN(numericId)) {
            return res.send({ success: false, message: "Invalid ID format" });
        }

        const carousel = await CarouselModel.findOne({ id: numericId });
        if (!carousel) {
            return res.send({ success: false, message: "Carousel not found" });
        }

        // Find and remove the image from ImageSlide array
        const VideoIndex = carousel.VideoSlide.findIndex(video => video.filename === filename);
        if (VideoIndex === -1) {
            return res.send({ success: false, message: "Video not found" });
        }

        const Videopath = path.join(__dirname, '..', carousel.VideoSlide[VideoIndex].filepath);
        if (fs.existsSync(Videopath)) {
            fs.unlinkSync(Videopath); // delete file from disk
        }

        carousel.VideoSlide.splice(VideoIndex, 1); // remove from array
        await carousel.save();

        return res.send({ success: true, message: "Video deleted successfully" });
    } catch (err) {
        console.error("Error in Uploading video:", err);
        return res.send({ success: false, message: 'Trouble in Carousel update video! Please contact support Team.' });
    }
});


CarouselRouter.get('/getSliders', async (req, res) => {
    try {
        const allslide = await CarouselModel.find({})

        if (allslide) {
            return res.send({ success: true, sliders: allslide })
        }
        else {
            return res.send({ success: false, message: " Slider not found", })
        }

    }
    catch (err) {
        console.log("Error in Slider Retrieve:", err)
        return res.send({ success: false, message: 'Trouble in Slider View! Please contact support Team.' })
    }
})

module.exports = CarouselRouter