const Express = require('express')
const isAuth = require('../middleware/isAuth')
const CarouselModel = require('../models/Carousel')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
//convert avif file
const sharp = require('sharp')

// convert pdf to images
// const puppeteer = require('puppeteer')


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
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'video/mp4', 'video/mkv', 'video/ogg']; // mkv

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

})



// const wasmDir = path.resolve(__dirname, '../node_modules/@squoosh/codecs')
// const wasmPath = pathToFileURL(wasmDir).href
// console.log(wasmPath)
// convert AVIF fileFilter

// const imagePool = new ImagePool({
//     codecsPath: pathToFileURL(path.resolve(__dirname, '../node_modules/@squoosh/codecs')).href
// })


// convertAVIF
async function convertToAvif(inputPath) {
    try {

        const outputPath = inputPath.replace(/\.(jpg|jpeg|png)$/i, '.avif');


        await sharp(inputPath)
            .avif({ quality: 50 })
            .toFile(outputPath);

        console.log(`Converted to AVIF: ${outputPath}`);
        return outputPath;
    } catch (err) {
        console.error('Error converting image to AVIF:', err);

        throw err;
    }
}


// convert images
// async function convertToImages(pdfpath) {
//     try {
//         const browser = await puppeteer.launch()
//         const page = await browser.newPage()

//         const pdfBuffer = fs.readFileSync(pdfpath)
//         const pdfBase = pdfBuffer.toString('base64')
//         const pdfUrl = `data:application/pdf;base64,${pdfBase}`

//         await page.goto(pdfUrl, { waitUntil: 'networkidle0' })

//         const totPages = await page.evaluate(() => {
//             return PDFViewerApplication.pdfDocument.totPages
//         })
//             .catch(() => 1)

//         const images = []

//         for (let i = 1; i <= totPages; i++) {

//             await page.setViewport({ width: 800, height: 1000 })

//             const screenshotPath = pdfpath.replace('.pdf', `-page${i}.png`)
//             await page.screenshot({ path: screenshotPath, fullPage: true })

//             images.push({
//                 filename: path.basename(screenshotPath),
//                 filepath: screenshotPath.replace(/\\/g, '/'),
//             })
//         }
//         for (const img of images) {
//             const ext = path.extname(img.filename).toLowerCase();
//             if (['.jpg', '.jpeg', '.png'].includes(ext)) {
//                 const avifPath = await convertToAvif(img.path);
//                 const avifFilename = path.basename(avifPath);
//                 convertedAvifFiles.push({
//                     filename: avifFilename,
//                     filepath: avifPath.replace(/\\/g, '/'),
//                 })
//             } else {
//                 // keep original if not convertible
//                 convertedAvifFiles.push({
//                     filename: img.filename,
//                     filepath: img.path.replace(/\\/g, '/'),
//                 })
//             }
//         }
//     }
//     catch (err) {

//     }

// }
const multiUpload = upload.fields([
    {
        name: 'ImageSlide', maxCount: 10
    },
    {
        name: 'VideoSlide', maxCount: 10
    }

])

const CarouselRouter = Express.Router()


CarouselRouter.post('/create-slide', isAuth, multiUpload, async (req, res) => {
    try {
        const { duration, id } = req.body;

        const ImageSlideFile = req.files?.['ImageSlide'] || [];
        const VideoSlideFile = req.files?.['VideoSlide'] || [];
        console.log("Video is", VideoSlideFile)
        const convertedAvifFiles = [];

        for (const img of ImageSlideFile) {
            const ext = path.extname(img.filename).toLowerCase();
            if (['.jpg', '.jpeg', '.png'].includes(ext)) {
                const avifPath = await convertToAvif(img.path);
                const avifFilename = path.basename(avifPath);
                convertedAvifFiles.push({
                    filename: avifFilename,
                    filepath: avifPath.replace(/\\/g, '/'),
                });
            }
            // else {
            //     // keep original if not convertible
            //     convertedAvifFiles.push({
            //         filename: img.filename,
            //         filepath: img.path.replace(/\\/g, '/'),
            //     });
            // }
        }

        const newVideoFile = []
        // videos
        for (const video of VideoSlideFile) {
            newVideoFile.push({
                filename: video.filename,
                filepath: video.path.replace(/\\/g, '/'),
            })
        }


        const newImageFile = convertedAvifFiles;

        // const newPdf = PdfFiles.map((pdf) => ({
        //     filename: pdf.filename,
        //     filepath: pdf.path.replace(/\\/g, '/'),
        // }));

        if (!id) {
            // Check if slide already exists (assuming only one slide ever)
            const existingSlide = await CarouselModel.findOne();

            if (!existingSlide) {
                // No slide yet → create new one with id 1
                const newSlide = new CarouselModel({
                    id: 1,
                    duration,
                    ImageSlide: newImageFile,
                    VideoSlide: newVideoFile
                });

                const saveSlide = await newSlide.save();

                if (saveSlide) {
                    return res.send({ success: true, message: "Uploaded successfully" })
                } else {
                    return res.send({ success: false, message: "Something went wrong. Please try again." })
                }
            } else {

                if (duration) existingSlide.duration = duration;

                if (newImageFile.length > 0) {
                    existingSlide.ImageSlide.push(...newImageFile);
                }

                if (newVideoFile.length > 0) {
                    existingSlide.VideoSlide.push(...newVideoFile);
                }

                // if (newPdf.length > 0) {
                //     existingSlide.PdfFile.push(...newPdf);
                // }

                const updatedSlide = await existingSlide.save();

                if (updatedSlide) {
                    return res.send({ success: true, message: " Uploaded successfully" });
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

            // if (newPdf.length > 0) {
            //     existingSlide.PdfFile.push(...newPdf);
            // }

            const updatedSlide = await existingSlide.save();

            if (updatedSlide) {
                return res.send({ success: true, message: "Uploaded successfully" });
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
        const { id, type, filenames } = req.body; // type = 'ImageSlide' or 'VideoType'
        console.log(id, type, filenames)

        if (!id || !type || !filenames) {
            return res.send({ success: false, message: 'Missing required parameters.' });
        }

        const slide = await CarouselModel.findOne({ id });
        if (!slide) {
            return res.send({ success: false, message: 'Slide not found.' });
        }

        // Filter out the file from the array

        filenames.forEach((files, i) => {
            slide[type] = slide[type].filter(file => file.filename !== files);
        })

        await slide.save();

        // Delete the file from disk
        // console.log("Filename are :", typeof filenames)
        let original = []
        filenames.forEach((files) => {
            let imgname = files.split('.')
            console.log("Image get", imgname)
            original.push(path.resolve('upload', imgname[0]))
            console.log("Image get name", imgname[0])
        })


        console.log("Original Path", original)

        let possibleFormat = ['.png', '.jpeg', '.jpg']


        possibleFormat.forEach((ext, i) => {

            original.forEach((originals) => {
                if (fs.existsSync(originals.concat(ext))) {
                    let originalPath = originals.concat(ext)
                    setTimeout(() => {
                        fs.unlink(originalPath, (err) => {
                            if (err) {
                                console.error("Failed to delete file:", err);
                            } else {
                                console.log("Deleted successfully:", originalPath);
                            }
                        });

                    }, 2000);

                    console.log(" original  image in the upload folder successfully")

                }
            })

        })


        filenames.forEach((filename) => {
            const filePath = path.resolve('upload', filename)
            console.log("FilePath", filePath)
            if (fs.existsSync(filePath)) {
                setTimeout(() => {
                    fs.unlink(filePath, (err) => {
                        if (err) console.error("Failed to delete:", err)
                        else console.log("Deleted file from the MongoDB link:", filePath)
                    })
                }, 1000)

            }
            else {
                console.log("Not exist link")
            }
        })


        return res.send({ success: true, message: `${type === 'ImageSlide' ? 'Image' : 'Video'} deleted successfully.` });

    } catch (err) {
        console.error("Error in delete-file:", err);
        return res.send({ success: false, message: 'Trouble in Carousel delete! Please contact support Team.' });
    }
})


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

CarouselRouter.get('/stream/:filename', async (req, res) => {
    try {
        const filename = req.params.filename
        console.log(filename)

        const paths = path.join(__dirname, '../upload', filename)

        if (!fs.existsSync(paths)) {
            return res.send({ success: false, message: " Media not found", })
        }

        const status = fs.statSync(paths)

        const filesize = status.size
        const range = req.headers.range

        const ext_path = path.extname(filename).toLowerCase()
        const contentType = {
            ".mp4": "video/mp4",
            '.mkv': 'video/mkv',
            '.ogg': 'video/ogg',
            '.avif': 'image/avif',
            '.png': 'image/png',
            '.jpeg': 'image/jpeg',
            '.jpg': 'image/jpg',

        }[ext_path]

        if (!contentType) {
            return res.send({ success: false, message: "Unsupported media type" });
        }

        if (range && contentType.startsWith("video")) {
            const part = range.replace(/bytes=/, "").split("-")
            const start = Number(part[0])
            const end = part[1] ? Number(part[1]) : filesize - 1

            const chunk = (end - start) + 1
            const file = fs.createReadStream(paths, { start, end })

            const head = {
                "Content-Range": `bytes ${start}- ${end} / ${filesize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": chunk,
                "Content-Type": contentType,
            }

            res.writeHead(206, head)
            file.pipe(res)

        }
        // For images
        else {
            console.log('images')

            res.writeHead(200, {
                "Content-Type": contentType,
                "Content-Length": filesize,
            });
            fs.createReadStream(paths).pipe(res);
        }

    }
    catch (err) {
        console.log("Error in Slider Retrieve:", err)
        return res.send({ success: false, message: 'Trouble in Slider View! Please contact support Team.' })
    }
})


module.exports = CarouselRouter