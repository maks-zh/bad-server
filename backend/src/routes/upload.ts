import { Router } from 'express'
import { uploadFile } from '../controllers/upload'
import { validateCsrfToken } from '../middlewares/csrf'
import fileMiddleware from '../middlewares/file'

const uploadRouter = Router()
uploadRouter.post('/', validateCsrfToken, fileMiddleware.single('file'), uploadFile)

export default uploadRouter
