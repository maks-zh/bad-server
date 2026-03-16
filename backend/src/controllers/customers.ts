import { NextFunction, Request, Response } from 'express'
import { Error as MongooseError, FilterQuery } from 'mongoose'
import { normalizePagination } from '../utils/pagination'
import escapeRegExp from '../utils/escapeRegExp'
import BadRequestError from '../errors/bad-request-error'
import ConflictError from '../errors/conflict-error'
import NotFoundError from '../errors/not-found-error'
import Order from '../models/order'
import User, { IUser } from '../models/user'

function normalizeSearchText(value: string) {
    return value.replace(/[^\p{L}\p{N}\s@.+_-]/gu, '').trim()
}

export const getCustomers = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const {
            page,
            limit,
            sortField = 'createdAt',
            sortOrder = 'desc',
            registrationDateFrom,
            registrationDateTo,
            lastOrderDateFrom,
            lastOrderDateTo,
            totalAmountFrom,
            totalAmountTo,
            orderCountFrom,
            orderCountTo,
            search,
        } = req.query

        const pagination = normalizePagination(page, limit)
        const filters: FilterQuery<Partial<IUser>> = {}

        if (registrationDateFrom) {
            filters.createdAt = {
                ...filters.createdAt,
                $gte: new Date(registrationDateFrom as string | Date),
            }
        }

        if (registrationDateTo) {
            const endOfDay = new Date(registrationDateTo as string | Date)
            endOfDay.setHours(23, 59, 59, 999)
            filters.createdAt = {
                ...filters.createdAt,
                $lte: endOfDay,
            }
        }

        if (lastOrderDateFrom) {
            filters.lastOrderDate = {
                ...filters.lastOrderDate,
                $gte: new Date(lastOrderDateFrom as string | Date),
            }
        }

        if (lastOrderDateTo) {
            const endOfDay = new Date(lastOrderDateTo as string | Date)
            endOfDay.setHours(23, 59, 59, 999)
            filters.lastOrderDate = {
                ...filters.lastOrderDate,
                $lte: endOfDay,
            }
        }

        if (typeof totalAmountFrom === 'number') {
            filters.totalAmount = {
                ...filters.totalAmount,
                $gte: totalAmountFrom,
            }
        }

        if (typeof totalAmountTo === 'number') {
            filters.totalAmount = {
                ...filters.totalAmount,
                $lte: totalAmountTo,
            }
        }

        if (typeof orderCountFrom === 'number') {
            filters.orderCount = {
                ...filters.orderCount,
                $gte: orderCountFrom,
            }
        }

        if (typeof orderCountTo === 'number') {
            filters.orderCount = {
                ...filters.orderCount,
                $lte: orderCountTo,
            }
        }

        if (typeof search === 'string' && search.trim()) {
            const normalizedSearch = normalizeSearchText(search)

            if (normalizedSearch) {
                const searchRegex = new RegExp(
                    escapeRegExp(normalizedSearch),
                    'i'
                )
                const orders = await Order.find(
                    {
                        $or: [
                            { deliveryAddress: searchRegex },
                            { comment: searchRegex },
                        ],
                    },
                    '_id'
                )

                const orderIds = orders.map((order) => order._id)

                filters.$or = [
                    { name: searchRegex },
                    { email: searchRegex },
                    { phone: searchRegex },
                    { lastOrder: { $in: orderIds } },
                ]
            }
        }

        const sort: Record<string, 1 | -1> = {
            [sortField as string]: sortOrder === 'desc' ? -1 : 1,
        }

        const options = {
            sort,
            skip: pagination.skip,
            limit: pagination.limit,
        }

        const users = await User.find(filters, null, options).populate([
            'orders',
            {
                path: 'lastOrder',
                populate: {
                    path: 'products',
                },
            },
            {
                path: 'lastOrder',
                populate: {
                    path: 'customer',
                },
            },
        ])

        const totalUsers = await User.countDocuments(filters)
        const totalPages = Math.ceil(totalUsers / pagination.limit)

        return res.status(200).json({
            customers: users,
            pagination: {
                totalUsers,
                totalPages,
                currentPage: pagination.page,
                pageSize: pagination.limit,
            },
        })
    } catch (error) {
        return next(error)
    }
}

export const getCustomerById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = await User.findById(req.params.id)
            .populate(['orders', 'lastOrder'])
            .orFail(
                () =>
                    new NotFoundError(
                        'Пользователь по заданному id отсутствует в базе'
                    )
            )

        return res.status(200).json(user)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID пользователя'))
        }

        return next(error)
    }
}

export const updateCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { name, email, phone } = req.body
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            {
                name,
                email,
                phone,
            },
            {
                new: true,
                runValidators: true,
            }
        )
            .orFail(
                () =>
                    new NotFoundError(
                        'Пользователь по заданному id отсутствует в базе'
                    )
            )
            .populate(['orders', 'lastOrder'])

        return res.status(200).json(updatedUser)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }

        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID пользователя'))
        }

        if (error instanceof Error && error.message.includes('E11000')) {
            return next(
                new ConflictError('Пользователь с таким email уже существует')
            )
        }

        return next(error)
    }
}

export const deleteCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id).orFail(
            () =>
                new NotFoundError(
                    'Пользователь по заданному id отсутствует в базе'
                )
        )

        return res.status(200).json(deletedUser)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID пользователя'))
        }

        return next(error)
    }
}
