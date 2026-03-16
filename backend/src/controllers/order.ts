import { NextFunction, Request, Response } from 'express'
import { Error as MongooseError, FilterQuery, Types } from 'mongoose'
import { normalizePagination } from '../utils/pagination'
import escapeRegExp from '../utils/escapeRegExp'
import { sanitizeText } from '../utils/sanitize'
import BadRequestError from '../errors/bad-request-error'
import NotFoundError from '../errors/not-found-error'
import Order, { IOrder } from '../models/order'
import Product, { IProduct } from '../models/product'
import User from '../models/user'

export const getOrders = async (
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
            status,
            totalAmountFrom,
            totalAmountTo,
            orderDateFrom,
            orderDateTo,
            search,
        } = req.query

        const pagination = normalizePagination(page, limit)
        const filters: FilterQuery<Partial<IOrder>> = {}

        if (typeof status === 'string') {
            filters.status = status
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

        if (orderDateFrom) {
            filters.createdAt = {
                ...filters.createdAt,
                $gte: new Date(orderDateFrom as string | Date),
            }
        }

        if (orderDateTo) {
            const endOfDay = new Date(orderDateTo as string | Date)
            endOfDay.setHours(23, 59, 59, 999)

            filters.createdAt = {
                ...filters.createdAt,
                $lte: endOfDay,
            }
        }

        const aggregatePipeline: any[] = [
            { $match: filters },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products',
                    foreignField: '_id',
                    as: 'products',
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'customer',
                    foreignField: '_id',
                    as: 'customer',
                },
            },
            { $unwind: '$customer' },
        ]

        if (typeof search === 'string' && search.trim()) {
            const searchValue = search.trim()
            const searchRegex = new RegExp(escapeRegExp(searchValue), 'i')
            const searchNumber = Number(searchValue)
            const searchConditions: any[] = [
                { 'products.title': searchRegex },
                { 'customer.name': searchRegex },
                { 'customer.email': searchRegex },
                { deliveryAddress: searchRegex },
                { phone: searchRegex },
                { comment: searchRegex },
            ]

            if (Number.isInteger(searchNumber)) {
                searchConditions.push({ orderNumber: searchNumber })
            }

            aggregatePipeline.push({
                $match: {
                    $or: searchConditions,
                },
            })
        }

        const sort: Record<string, 1 | -1> = {
            [sortField as string]: sortOrder === 'desc' ? -1 : 1,
        }

        const [orders, totalOrdersResult] = await Promise.all([
            Order.aggregate([
                ...aggregatePipeline,
                { $sort: sort },
                { $skip: pagination.skip },
                { $limit: pagination.limit },
            ]),
            Order.aggregate([...aggregatePipeline, { $count: 'totalOrders' }]),
        ])

        const totalOrders = totalOrdersResult[0]?.totalOrders || 0
        const totalPages = Math.ceil(totalOrders / pagination.limit)

        return res.status(200).json({
            orders,
            pagination: {
                totalOrders,
                totalPages,
                currentPage: pagination.page,
                pageSize: pagination.limit,
            },
        })
    } catch (error) {
        return next(error)
    }
}

export const getOrdersCurrentUser = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = res.locals.user._id
        const { search, page, limit } = req.query
        const pagination = normalizePagination(page, limit)
        const user = await User.findById(userId)
            .populate({
                path: 'orders',
                populate: [
                    {
                        path: 'products',
                    },
                    {
                        path: 'customer',
                    },
                ],
            })
            .orFail(
                () =>
                    new NotFoundError(
                        'Пользователь по заданному id отсутствует в базе'
                    )
            )

        let orders = user.orders as unknown as Array<
            IOrder & { products: IProduct[] }
        >

        if (typeof search === 'string' && search.trim()) {
            const searchValue = search.trim()
            const searchRegex = new RegExp(escapeRegExp(searchValue), 'i')
            const searchNumber = Number(searchValue)

            orders = orders.filter((order) => {
                const products = order.products as unknown as IProduct[]
                const matchesProductTitle = products.some((product) =>
                    searchRegex.test(product.title)
                )
                const matchesDeliveryAddress = searchRegex.test(
                    order.deliveryAddress || ''
                )
                const matchesComment = searchRegex.test(order.comment || '')
                const matchesOrderNumber =
                    Number.isInteger(searchNumber) &&
                    order.orderNumber === searchNumber

                return (
                    matchesProductTitle ||
                    matchesDeliveryAddress ||
                    matchesComment ||
                    matchesOrderNumber
                )
            })
        }

        const totalOrders = orders.length
        const totalPages = Math.ceil(totalOrders / pagination.limit)
        const paginatedOrders = orders.slice(
            pagination.skip,
            pagination.skip + pagination.limit
        )

        return res.send({
            orders: paginatedOrders,
            pagination: {
                totalOrders,
                totalPages,
                currentPage: pagination.page,
                pageSize: pagination.limit,
            },
        })
    } catch (error) {
        return next(error)
    }
}

export const getOrderByNumber = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const order = await Order.findOne({
            orderNumber: Number(req.params.orderNumber),
        })
            .populate(['customer', 'products'])
            .orFail(
                () =>
                    new NotFoundError(
                        'Заказ по заданному id отсутствует в базе'
                    )
            )

        return res.status(200).json(order)
    } catch (error) {
        return next(error)
    }
}

export const getOrderCurrentUserByNumber = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const userId = res.locals.user._id

    try {
        const order = await Order.findOne({
            orderNumber: Number(req.params.orderNumber),
        })
            .populate(['customer', 'products'])
            .orFail(
                () =>
                    new NotFoundError(
                        'Заказ по заданному id отсутствует в базе'
                    )
            )

        if (!order.customer._id.equals(userId)) {
            return next(
                new NotFoundError('Заказ по заданному id отсутствует в базе')
            )
        }

        return res.status(200).json(order)
    } catch (error) {
        return next(error)
    }
}

export const createOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = res.locals.user._id
        const { address, payment, phone, total, email, items, comment } =
            req.body
        const productIds = (items as string[]).map(
            (id) => new Types.ObjectId(id)
        )
        const basket = await Product.find<IProduct>({
            _id: {
                $in: productIds,
            },
        })

        if (basket.length !== productIds.length) {
            return next(new BadRequestError('Один или несколько товаров не найдены'))
        }

        const productWithEmptyPrice = basket.find(
            (product) => product.price === null
        )

        if (productWithEmptyPrice) {
            return next(
                new BadRequestError(
                    `Товар с id ${productWithEmptyPrice._id} не продается`
                )
            )
        }

        const totalBasket = basket.reduce(
            (sum, product) => sum + (product.price ?? 0),
            0
        )

        if (totalBasket !== total) {
            return next(new BadRequestError('Неверная сумма заказа'))
        }

        const newOrder = new Order({
            totalAmount: total,
            products: productIds,
            payment,
            phone,
            email,
            comment: typeof comment === 'string' ? sanitizeText(comment) : '',
            customer: userId,
            deliveryAddress: address.trim(),
        })

        await newOrder.save()
        const populatedOrder = await newOrder.populate(['customer', 'products'])

        return res.status(200).json(populatedOrder)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }

        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID товара'))
        }

        return next(error)
    }
}

export const updateOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { status } = req.body
        const updatedOrder = await Order.findOneAndUpdate(
            { orderNumber: Number(req.params.orderNumber) },
            { status },
            { new: true, runValidators: true }
        )
            .orFail(
                () =>
                    new NotFoundError(
                        'Заказ по заданному id отсутствует в базе'
                    )
            )
            .populate(['customer', 'products'])

        return res.status(200).json(updatedOrder)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }

        return next(error)
    }
}

export const deleteOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const deletedOrder = await Order.findByIdAndDelete(req.params.id)
            .orFail(
                () =>
                    new NotFoundError(
                        'Заказ по заданному id отсутствует в базе'
                    )
            )
            .populate(['customer', 'products'])

        return res.status(200).json(deletedOrder)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID заказа'))
        }

        return next(error)
    }
}
