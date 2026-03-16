import { Router } from 'express'
import {
    deleteCustomer,
    getCustomerById,
    getCustomers,
    updateCustomer,
} from '../controllers/customers'
import auth, { roleGuardMiddleware } from '../middlewares/auth'
import {
    validateCustomerUpdateBody,
    validateCustomersQuery,
    validateIdParam,
} from '../middlewares/validations'
import { Role } from '../models/user'

const customerRouter = Router()

customerRouter.get(
    '/',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateCustomersQuery,
    getCustomers
)
customerRouter.get(
    '/:id',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateIdParam,
    getCustomerById
)
customerRouter.patch(
    '/:id',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateIdParam,
    validateCustomerUpdateBody,
    updateCustomer
)
customerRouter.delete(
    '/:id',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateIdParam,
    deleteCustomer
)

export default customerRouter
