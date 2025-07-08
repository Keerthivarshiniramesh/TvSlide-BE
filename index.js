const Express = require('express')
require('dotenv').config()
const mongoose = require('mongoose')
const session = require('express-session')
const mongoSession = require('connect-mongodb-session')(session)
const cors = require('cors')

const AuthRouter = require('./routers/AuthRouter')
const CarouselRouter = require('./routers/CarouselRouter')


const app = Express()


app.use(Express.json())
app.use(Express.urlencoded({ extended: true }))
const path = require('path');
app.use('/upload', Express.static(path.join(__dirname, 'upload')));


// app.use(cors({
//     origin: [`https://zgn3hlb1-3000.inc1.devtunnels.ms`, 'http://localhost:3000', 'http://localhost:3001', `https://carousel-show.vercel.app`],
//     credentials: true
// }))




const allowedOrigins = [
    'https://zgn3hlb1-3000.inc1.devtunnels.ms',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://carousel-show.vercel.app'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, origin); // only one origin is returned here
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));


app.use((req, res, next) => {
    const originalSetHeader = res.setHeader;
    res.setHeader = function (name, value) {
        if (name.toLowerCase().includes('access-control')) {
            console.log(`[HEADER SET] ${name}: ${value}`);
        }
        originalSetHeader.apply(this, arguments);
    };
    next();
});


app.set('trust proxy', 1)
mongoose.connect(process.env.Mongo_DB)
    .then(() => console.log("MongoDb connected Successfully"))
    .catch((err) => console.log("Error in connecting", err))

const Store = new mongoSession({
    uri: process.env.Mongo_DB,
    collection: 'Sessions'
})
console.log("True")
app.use(session({
    saveUninitialized: false,
    secret: process.env.Secret_Key,
    resave: false,
    store: Store,
    // cookie: {
    //     httpOnly: true,
    //     sameSite: 'none',
    //     secure: true

    // }
}))


app.use(AuthRouter)
app.use(CarouselRouter)

app.listen(process.env.PORT, () => {
    console.log("Server Running in ", process.env.PORT)
})