export const DEFAULT_PAGE = 1
export const DEFAULT_PAGE_SIZE = 10
export const MAX_PAGE_SIZE = 10

function normalizeInteger(
    value: unknown,
    fallback: number,
    min: number,
    max: number
) {
    const parsedValue = Number(value)

    if (!Number.isInteger(parsedValue)) {
        return fallback
    }

    if (parsedValue < min) {
        return min
    }

    if (parsedValue > max) {
        return max
    }

    return parsedValue
}

export function normalizePagination(pageValue: unknown, limitValue: unknown) {
    const page = normalizeInteger(pageValue, DEFAULT_PAGE, DEFAULT_PAGE, 10_000)
    const limit = normalizeInteger(
        limitValue,
        DEFAULT_PAGE_SIZE,
        DEFAULT_PAGE,
        MAX_PAGE_SIZE
    )

    return {
        limit,
        page,
        skip: (page - 1) * limit,
    }
}
