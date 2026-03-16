import { Router } from 'express'
import {
    createProduct,
    deleteProduct,
    getProductById,
    getProducts,
    updateProduct,
} from '../controllers/products'
import auth, { roleGuardMiddleware } from '../middlewares/auth'
import { validateCsrfToken } from '../middlewares/csrf'
import {
    validateProductId,
    validateProductBody,
    validateProductsQuery,
    validateProductUpdateBody,
} from '../middlewares/validations'
import { Role } from '../models/user'

const productRouter = Router()

productRouter.get('/', validateProductsQuery, getProducts)
productRouter.get('/:productId', validateProductId, getProductById)
productRouter.post(
    '/',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateCsrfToken,
    validateProductBody,
    createProduct
)
productRouter.delete(
    '/:productId',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateCsrfToken,
    validateProductId,
    deleteProduct
)
productRouter.patch(
    '/:productId',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateCsrfToken,
    validateProductId,
    validateProductUpdateBody,
    updateProduct
)

export default productRouter
