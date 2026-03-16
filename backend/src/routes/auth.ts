import { Router } from 'express'
import {
    getCsrfToken,
    getCurrentUser,
    getCurrentUserRoles,
    login,
    logout,
    refreshAccessToken,
    register,
    updateCurrentUser,
} from '../controllers/auth'
import auth from '../middlewares/auth'
import { validateCsrfToken } from '../middlewares/csrf'
import {
    validateAuthentication,
    validateCurrentUserUpdateBody,
    validateUserBody,
} from '../middlewares/validations'

const authRouter = Router()

authRouter.get('/csrf-token', getCsrfToken)
authRouter.get('/user', auth, getCurrentUser)
authRouter.patch(
    '/me',
    auth,
    validateCsrfToken,
    validateCurrentUserUpdateBody,
    updateCurrentUser
)
authRouter.get('/user/roles', auth, getCurrentUserRoles)
authRouter.post('/login', validateCsrfToken, validateAuthentication, login)
authRouter.get('/token', validateCsrfToken, refreshAccessToken)
authRouter.get('/logout', validateCsrfToken, logout)
authRouter.post('/register', validateCsrfToken, validateUserBody, register)

export default authRouter
