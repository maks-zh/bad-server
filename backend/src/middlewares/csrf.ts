import crypto from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { CSRF_TOKEN } from '../config'
import ForbiddenError from '../errors/forbidden-error'

function safeCompare(left: string, right: string) {
    const leftBuffer = Buffer.from(left)
    const rightBuffer = Buffer.from(right)

    if (leftBuffer.length !== rightBuffer.length) {
        return false
    }

    return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

function getRequestCsrfToken(req: Request) {
    const body = req.body as Record<string, unknown> | undefined
    const query = req.query as Record<string, unknown> | undefined
    const bodyCsrfToken = Reflect.get(body || {}, '_csrf')
    const queryCsrfToken = Reflect.get(query || {}, '_csrf')

    const possibleToken =
        req.header('X-CSRF-Token') ||
        req.header('X-XSRF-Token') ||
        req.header('csrf-token') ||
        req.header('xsrf-token') ||
        body?.csrfToken ||
        bodyCsrfToken ||
        query?.csrfToken ||
        queryCsrfToken

    return typeof possibleToken === 'string' ? possibleToken : ''
}

export function issueCsrfToken(_req: Request, res: Response) {
    const csrfToken = crypto.randomBytes(32).toString('hex')

    res.cookie(CSRF_TOKEN.cookie.name, csrfToken, CSRF_TOKEN.cookie.options)

    return res.status(200).json({ csrfToken })
}

export function validateCsrfToken(
    req: Request,
    _res: Response,
    next: NextFunction
) {
    const cookieCsrfToken = req.cookies[CSRF_TOKEN.cookie.name]
    const requestCsrfToken = getRequestCsrfToken(req)

    if (
        typeof cookieCsrfToken !== 'string' ||
        !requestCsrfToken ||
        !safeCompare(cookieCsrfToken, requestCsrfToken)
    ) {
        return next(new ForbiddenError('Недействительный CSRF-токен'))
    }

    return next()
}
