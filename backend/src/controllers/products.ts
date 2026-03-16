import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import { Error as MongooseError } from 'mongoose'
import { join } from 'path'
import { normalizePagination } from '../utils/pagination'
import BadRequestError from '../errors/bad-request-error'
import ConflictError from '../errors/conflict-error'
import NotFoundError from '../errors/not-found-error'
import Product from '../models/product'
import movingFile from '../utils/movingFile'

const getProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit } = req.query
        const pagination = normalizePagination(page, limit)
        const options = {
            skip: pagination.skip,
            limit: pagination.limit,
        }
        const products = await Product.find({}, null, options)
        const totalProducts = await Product.countDocuments({})
        const totalPages = Math.ceil(totalProducts / pagination.limit)

        return res.send({
            items: products,
            pagination: {
                totalProducts,
                totalPages,
                currentPage: pagination.page,
                pageSize: pagination.limit,
            },
        })
    } catch (error) {
        return next(error)
    }
}

const getProductById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const product = await Product.findById(req.params.productId).orFail(
            () => new NotFoundError('Нет товара по заданному id')
        )

        return res.send(product)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID товара'))
        }

        return next(error)
    }
}

const createProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { description, category, price, title, image } = req.body

        if (image) {
            movingFile(
                image.fileName,
                join(__dirname, `../public/${process.env.UPLOAD_PATH_TEMP}`),
                join(__dirname, `../public/${process.env.UPLOAD_PATH}`)
            )
        }

        const product = await Product.create({
            description,
            image,
            category,
            price,
            title,
        })

        return res.status(constants.HTTP_STATUS_CREATED).send(product)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }

        if (error instanceof Error && error.message.includes('E11000')) {
            return next(
                new ConflictError('Товар с таким заголовком уже существует')
            )
        }

        return next(error)
    }
}

const updateProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { productId } = req.params
        const { image } = req.body

        if (image) {
            movingFile(
                image.fileName,
                join(__dirname, `../public/${process.env.UPLOAD_PATH_TEMP}`),
                join(__dirname, `../public/${process.env.UPLOAD_PATH}`)
            )
        }

        const product = await Product.findByIdAndUpdate(
            productId,
            {
                $set: {
                    ...req.body,
                    price: req.body.price ?? null,
                    image: req.body.image || undefined,
                },
            },
            { runValidators: true, new: true }
        ).orFail(() => new NotFoundError('Нет товара по заданному id'))

        return res.send(product)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }

        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID товара'))
        }

        if (error instanceof Error && error.message.includes('E11000')) {
            return next(
                new ConflictError('Товар с таким заголовком уже существует')
            )
        }

        return next(error)
    }
}

const deleteProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { productId } = req.params
        const product = await Product.findByIdAndDelete(productId).orFail(
            () => new NotFoundError('Нет товара по заданному id')
        )

        return res.send(product)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID товара'))
        }

        return next(error)
    }
}

export {
    createProduct,
    deleteProduct,
    getProductById,
    getProducts,
    updateProduct,
}
