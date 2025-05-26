const Express = require('express')
const isAuth = require('../middleware/isAuth')
const CarouselModel = require('../models/Carousel')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
//convert avif file
const sharp = require('sharp')

// convert pdf to images
const puppeteer = require('puppeteer')


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
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', '.pdf']; // mkv

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

const multiUpload = upload.fields([
    {
        name: 'ImageSlide', maxCount: 10
    },
    {
        name: 'PdfFile', maxCount: 10
    }


])

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

const CarouselRouter = Express.Router()


CarouselRouter.post('/create-slide', isAuth, multiUpload, async (req, res) => {
    try {
        const { duration, id } = req.body;

        const ImageSlideFile = req.files?.['ImageSlide'] || [];
        const PdfFiles = req.files?.['PdfFile'] || [];

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
            } else {
                // keep original if not convertible
                convertedAvifFiles.push({
                    filename: img.filename,
                    filepath: img.path.replace(/\\/g, '/'),
                });
            }
        }


        // convert images
        // for (const pdf of PdfFiles) {
        //     const ext = path.extname(pdf.filename).toLowerCase();
        //     if (['.pdf'].includes(ext)) {
        //         await convertToImages(pdf.path)
        //     }
        // }


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
                    // PdfFile: newPdf,
                });

                const saveSlide = await newSlide.save();

                if (saveSlide) {
                    return res.send({ success: true, message: "Image  uploaded successfully" })
                } else {
                    return res.send({ success: false, message: "Something went wrong. Please try again." })
                }
            } else {

                if (duration) existingSlide.duration = duration;

                if (newImageFile.length > 0) {
                    existingSlide.ImageSlide.push(...newImageFile);
                }

                // if (newPdf.length > 0) {
                //     existingSlide.PdfFile.push(...newPdf);
                // }

                const updatedSlide = await existingSlide.save();

                if (updatedSlide) {
                    return res.send({ success: true, message: "Image  uploaded successfully" });
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
                return res.send({ success: true, message: "Image  uploaded successfully" });
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
        const { id, type, filename } = req.body; // type = 'ImageSlide' or 'PdfFile'
        console.log(id, type, filename)

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