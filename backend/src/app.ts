import { errors } from 'celebrate'
import cookieParser from 'cookie-parser'
import cors, { CorsOptions } from 'cors'
import 'dotenv/config'
import express, { json, urlencoded } from 'express'
import mongoose from 'mongoose'
import path from 'path'
import { DB_ADDRESS } from './config'
import errorHandler from './middlewares/error-handler'
import rateLimit from './middlewares/rate-limit'
import serveStatic from './middlewares/serverStatic'
import routes from './routes'

const { PORT = 3000 } = process.env
const app = express()
const allowedOrigins = (
    process.env.ORIGIN_ALLOW ||
    'http://localhost:5173,http://localhost,http://127.0.0.1'
)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
const allowedMethods = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS']
const corsOptions: CorsOptions = {
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true)
        }

        return callback(null, false)
    },
    credentials: true,
    methods: allowedMethods,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    optionsSuccessStatus: 204,
}

mongoose.set('sanitizeFilter', true)
app.disable('x-powered-by')
app.use(cookieParser())
app.use(rateLimit())
app.use(cors(corsOptions))
app.use((req, res, next) => {
    const requestOrigin = req.headers.origin
    const responseOrigin =
        typeof requestOrigin === 'string' && allowedOrigins.includes(requestOrigin)
            ? requestOrigin
            : allowedOrigins[0]

    res.header('Access-Control-Allow-Origin', responseOrigin)
    res.header('Access-Control-Allow-Methods', allowedMethods.join(', '))
    next()
})

app.use(serveStatic(path.join(__dirname, 'public')))

app.use(urlencoded({ extended: false, limit: '100kb', parameterLimit: 50 }))
app.use(json({ limit: '100kb' }))

app.options('*', cors(corsOptions))
app.use(routes)
app.use(errors())
app.use(errorHandler)

// eslint-disable-next-line no-console

const bootstrap = async () => {
    try {
        await mongoose.connect(DB_ADDRESS)
        await app.listen(PORT, () => console.log('ok'))
    } catch (error) {
        console.error(error)
    }
}

bootstrap()
