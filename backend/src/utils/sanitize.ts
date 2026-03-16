import sanitizeHtml from 'sanitize-html'

export function sanitizeText(value: string) {
    return sanitizeHtml(value, {
        allowedTags: [],
        allowedAttributes: {},
    }).trim()
}
