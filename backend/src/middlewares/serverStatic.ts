import { NextFunction, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'

export default function serveStatic(baseDir: string) {
    const safeBaseDir = path.resolve(baseDir)

    return (req: Request, res: Response, next: NextFunction) => {
        let normalizedPath: string

        try {
            normalizedPath = path.normalize(decodeURIComponent(req.path))
        } catch (_error) {
            return next()
        }

        if (normalizedPath.includes('\0')) {
            return next()
        }

        const filePath = path.resolve(safeBaseDir, `.${normalizedPath}`)
        const isInsideBaseDir =
            filePath === safeBaseDir ||
            filePath.startsWith(`${safeBaseDir}${path.sep}`)

        if (!isInsideBaseDir) {
            return next()
        }

        return fs.stat(filePath, (statError, stats) => {
            if (statError || !stats.isFile()) {
                return next()
            }

            return res.sendFile(filePath, (sendFileError) => {
                if (sendFileError) {
                    next(sendFileError)
                }
            })
        })
    }
}
