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


app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'https://carousel-show.vercel.app'],
    credentials: true
}))

app.set('trust proxy', 1)
mongoose.connect(process.env.Mongo_DB)
    .then(() => console.log("MongoDb connected Successfully"))
    .catch((err) => console.log("Error in connecting", err))

const Store = new mongoSession({
    uri: process.env.Mongo_DB,
    collection: 'Sessions'
})

app.use(session({
    saveUninitialized: false,
    secret: process.env.Secret_Key,
    resave: true,
    store: Store,
    cookie: {
        httpOnly: true,
        sameSite: 'none',
        secure: true

    }
}))


app.use(AuthRouter)
app.use(CarouselRouter)


app.listen(process.env.PORT, () => {
    console.log("Server Running in ", process.env.PORT)
})