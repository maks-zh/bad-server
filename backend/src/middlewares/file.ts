import { Request, Express } from 'express'
import multer, { FileFilterCallback } from 'multer'
import { mkdirSync } from 'fs'
import { join } from 'path'
import mime from 'mime-types'
import uniqueSlug from 'unique-slug'
import BadRequestError from '../errors/bad-request-error'

type DestinationCallback = (error: Error | null, destination: string) => void
type FileNameCallback = (error: Error | null, filename: string) => void

export const MIN_UPLOAD_SIZE = 2 * 1024
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024

const storage = multer.diskStorage({
    destination: (
        _req: Request,
        _file: Express.Multer.File,
        cb: DestinationCallback
    ) => {
        const destinationPath = join(
            __dirname,
            process.env.UPLOAD_PATH_TEMP
                ? `../public/${process.env.UPLOAD_PATH_TEMP}`
                : '../public'
        )

        mkdirSync(destinationPath, { recursive: true })

        cb(null, destinationPath)
    },

    filename: (
        _req: Request,
        file: Express.Multer.File,
        cb: FileNameCallback
    ) => {
        const extension = mime.extension(file.mimetype)

        if (!extension) {
            return cb(new BadRequestError('Неподдерживаемый тип файла'), '')
        }

        return cb(null, `${uniqueSlug()}-${Date.now()}.${extension}`)
    },
})

const types = new Set([
    'image/png',
    'image/jpg',
    'image/jpeg',
    'image/gif',
    'image/webp',
])

const fileFilter = (
    _req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
) => {
    if (!types.has(file.mimetype)) {
        return cb(
            new BadRequestError(
                'Разрешена загрузка только изображений PNG, JPEG, GIF или WEBP'
            )
        )
    }

    return cb(null, true)
}

export default multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_UPLOAD_SIZE,
        files: 1,
    },
})
