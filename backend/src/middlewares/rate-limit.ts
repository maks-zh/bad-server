import { NextFunction, Request, Response } from 'express'

const WINDOW_MS = 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 100

type Bucket = {
    count: number
    resetAt: number
}

const buckets = new Map<string, Bucket>()

export default function rateLimit() {
    return (req: Request, res: Response, next: NextFunction) => {
        const key = req.ip || req.socket.remoteAddress || 'unknown'
        const now = Date.now()
        const existingBucket = buckets.get(key)

        if (!existingBucket || existingBucket.resetAt <= now) {
            buckets.set(key, {
                count: 1,
                resetAt: now + WINDOW_MS,
            })

            res.setHeader('RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString())
            res.setHeader(
                'RateLimit-Remaining',
                (MAX_REQUESTS_PER_WINDOW - 1).toString()
            )
            res.setHeader(
                'RateLimit-Reset',
                Math.ceil((now + WINDOW_MS) / 1000).toString()
            )

            return next()
        }

        if (existingBucket.count >= MAX_REQUESTS_PER_WINDOW) {
            const retryAfter = Math.max(
                1,
                Math.ceil((existingBucket.resetAt - now) / 1000)
            )

            res.setHeader('Retry-After', retryAfter.toString())
            res.setHeader('RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString())
            res.setHeader('RateLimit-Remaining', '0')
            res.setHeader(
                'RateLimit-Reset',
                Math.ceil(existingBucket.resetAt / 1000).toString()
            )

            return res.status(429).json({
                message: 'Слишком много запросов, попробуйте позже',
            })
        }

        existingBucket.count += 1

        res.setHeader('RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString())
        res.setHeader(
            'RateLimit-Remaining',
            Math.max(
                0,
                MAX_REQUESTS_PER_WINDOW - existingBucket.count
            ).toString()
        )
        res.setHeader(
            'RateLimit-Reset',
            Math.ceil(existingBucket.resetAt / 1000).toString()
        )

        return next()
    }
}
