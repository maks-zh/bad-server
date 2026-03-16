import { unlink } from 'fs/promises'
import type { Express, NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import { basename } from 'path'
import sharp from 'sharp'
import BadRequestError from '../errors/bad-request-error'
import { MIN_UPLOAD_SIZE } from '../middlewares/file'

const allowedFormats = new Set(['jpeg', 'png', 'gif', 'webp'])

async function removeTempFile(filePath: string) {
    await unlink(filePath).catch(() => undefined)
}

async function ensureUploadedImageIsSafe(file: Express.Multer.File) {
    if (file.size < MIN_UPLOAD_SIZE) {
        throw new BadRequestError('Минимальный размер файла - 2KB')
    }

    const metadata = await sharp(file.path, {
        failOn: 'error',
    }).metadata()

    if (
        !metadata.format ||
        !allowedFormats.has(metadata.format) ||
        !metadata.width ||
        !metadata.height
    ) {
        throw new BadRequestError(
            'Загруженный файл должен быть валидным изображением'
        )
    }
}

export const uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!req.file) {
        return next(new BadRequestError('Файл не загружен'))
    }

    try {
        await ensureUploadedImageIsSafe(req.file)

        const fileName = process.env.UPLOAD_PATH
            ? `/${process.env.UPLOAD_PATH}/${basename(req.file.filename)}`
            : `/${basename(req.file.filename)}`

        return res.status(constants.HTTP_STATUS_CREATED).send({
            fileName,
            originalName: basename(req.file.originalname),
        })
    } catch (error) {
        await removeTempFile(req.file.path)
        return next(error)
    }
}

export default {}
