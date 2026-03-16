import crypto from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { Error as MongooseError } from 'mongoose'
import { REFRESH_TOKEN } from '../config'
import BadRequestError from '../errors/bad-request-error'
import ConflictError from '../errors/conflict-error'
import NotFoundError from '../errors/not-found-error'
import UnauthorizedError from '../errors/unauthorized-error'
import User from '../models/user'

const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body
        const user = await User.findUserByCredentials(email, password)
        const accessToken = user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        res.cookie(
            REFRESH_TOKEN.cookie.name,
            refreshToken,
            REFRESH_TOKEN.cookie.options
        )

        return res.json({
            success: true,
            user,
            accessToken,
        })
    } catch (error) {
        return next(error)
    }
}

const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, name } = req.body
        const newUser = new User({ email, password, name })

        await newUser.save()

        const accessToken = newUser.generateAccessToken()
        const refreshToken = await newUser.generateRefreshToken()

        res.cookie(
            REFRESH_TOKEN.cookie.name,
            refreshToken,
            REFRESH_TOKEN.cookie.options
        )

        return res.status(constants.HTTP_STATUS_CREATED).json({
            success: true,
            user: newUser,
            accessToken,
        })
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }

        if (error instanceof Error && error.message.includes('E11000')) {
            return next(
                new ConflictError('Пользователь с таким email уже существует')
            )
        }

        return next(error)
    }
}

const getCurrentUser = async (
    _req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = res.locals.user._id
        const user = await User.findById(userId).orFail(
            () =>
                new NotFoundError(
                    'Пользователь по заданному id отсутствует в базе'
                )
        )

        return res.json({ user, success: true })
    } catch (error) {
        return next(error)
    }
}

const deleteRefreshTokenInUser = async (req: Request) => {
    const { cookies } = req
    const refreshToken = cookies[REFRESH_TOKEN.cookie.name]

    if (!refreshToken) {
        throw new UnauthorizedError('Не валидный токен')
    }

    let decodedRefreshToken: JwtPayload

    try {
        decodedRefreshToken = jwt.verify(
            refreshToken,
            REFRESH_TOKEN.secret
        ) as JwtPayload
    } catch (_error) {
        throw new UnauthorizedError('Не валидный токен')
    }

    const user = await User.findOne({
        _id: decodedRefreshToken._id,
    }).orFail(() => new UnauthorizedError('Пользователь не найден в базе'))

    const refreshTokenHash = crypto
        .createHmac('sha256', REFRESH_TOKEN.secret)
        .update(refreshToken)
        .digest('hex')

    const hasToken = user.tokens.some(
        (tokenObject) => tokenObject.token === refreshTokenHash
    )

    if (!hasToken) {
        throw new UnauthorizedError('Не валидный токен')
    }

    user.tokens = user.tokens.filter(
        (tokenObject) => tokenObject.token !== refreshTokenHash
    )

    await user.save()

    return user
}

const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await deleteRefreshTokenInUser(req)

        res.cookie(REFRESH_TOKEN.cookie.name, '', {
            ...REFRESH_TOKEN.cookie.options,
            maxAge: 0,
        })

        return res.status(200).json({
            success: true,
        })
    } catch (error) {
        return next(error)
    }
}

const refreshAccessToken = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userWithRefreshToken = await deleteRefreshTokenInUser(req)
        const accessToken = userWithRefreshToken.generateAccessToken()
        const refreshToken = await userWithRefreshToken.generateRefreshToken()

        res.cookie(
            REFRESH_TOKEN.cookie.name,
            refreshToken,
            REFRESH_TOKEN.cookie.options
        )

        return res.json({
            success: true,
            user: userWithRefreshToken,
            accessToken,
        })
    } catch (error) {
        return next(error)
    }
}

const getCurrentUserRoles = async (
    _req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        return res.status(200).json(res.locals.user.roles)
    } catch (error) {
        return next(error)
    }
}

const updateCurrentUser = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const userId = res.locals.user._id

    try {
        const { name, email, phone } = req.body
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                name,
                email,
                phone,
            },
            {
                new: true,
                runValidators: true,
            }
        ).orFail(
            () =>
                new NotFoundError(
                    'Пользователь по заданному id отсутствует в базе'
                )
        )

        return res.status(200).json(updatedUser)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }

        if (error instanceof Error && error.message.includes('E11000')) {
            return next(
                new ConflictError('Пользователь с таким email уже существует')
            )
        }

        return next(error)
    }
}

export {
    getCurrentUser,
    getCurrentUserRoles,
    login,
    logout,
    refreshAccessToken,
    register,
    updateCurrentUser,
}
