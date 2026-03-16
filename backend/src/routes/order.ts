import { Router } from 'express'
import {
    createOrder,
    deleteOrder,
    getOrderByNumber,
    getOrderCurrentUserByNumber,
    getOrders,
    getOrdersCurrentUser,
    updateOrder,
} from '../controllers/order'
import auth, { roleGuardMiddleware } from '../middlewares/auth'
import { validateCsrfToken } from '../middlewares/csrf'
import {
    validateCurrentUserOrdersQuery,
    validateIdParam,
    validateOrderBody,
    validateOrderNumberParam,
    validateOrdersQuery,
    validateOrderUpdateBody,
} from '../middlewares/validations'
import { Role } from '../models/user'

const orderRouter = Router()

orderRouter.post('/', auth, validateCsrfToken, validateOrderBody, createOrder)
orderRouter.get(
    '/all',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateOrdersQuery,
    getOrders
)
orderRouter.get(
    '/all/me',
    auth,
    validateCurrentUserOrdersQuery,
    getOrdersCurrentUser
)
orderRouter.get(
    '/:orderNumber',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateOrderNumberParam,
    getOrderByNumber
)
orderRouter.get(
    '/me/:orderNumber',
    auth,
    validateOrderNumberParam,
    getOrderCurrentUserByNumber
)
orderRouter.patch(
    '/:orderNumber',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateCsrfToken,
    validateOrderNumberParam,
    validateOrderUpdateBody,
    updateOrder
)

orderRouter.delete(
    '/:id',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateCsrfToken,
    validateIdParam,
    deleteOrder
)

export default orderRouter
