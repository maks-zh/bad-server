import { Joi, celebrate } from 'celebrate'
import { Types } from 'mongoose'
import { MAX_PAGE_SIZE } from '../utils/pagination'

export const phoneRegExp = /^\+?[0-9()\s-]{7,20}$/

export enum PaymentType {
    Card = 'card',
    Online = 'online',
}

const ORDER_STATUSES = ['cancelled', 'completed', 'new', 'delivering']
const ORDER_SORT_FIELDS = ['createdAt', 'status', 'totalAmount', 'orderNumber']
const CUSTOMER_SORT_FIELDS = [
    'createdAt',
    'lastOrderDate',
    'totalAmount',
    'orderCount',
    'name',
]

const objectIdSchema = Joi.string()
    .required()
    .custom((value, helpers) => {
        if (Types.ObjectId.isValid(value)) {
            return value
        }

        return helpers.message({ custom: 'Невалидный id' })
    })

const paginationSchema = {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(MAX_PAGE_SIZE).default(10),
}

const searchSchema = Joi.string().trim().max(100)

export const validateOrderBody = celebrate({
    body: Joi.object({
        items: Joi.array()
            .items(objectIdSchema)
            .min(1)
            .max(MAX_PAGE_SIZE)
            .required()
            .messages({
                'array.empty': 'Не указаны товары',
                'array.min': 'Не указаны товары',
            }),
        payment: Joi.string()
            .valid(...Object.values(PaymentType))
            .required()
            .messages({
                'string.valid':
                    'Указано не валидное значение для способа оплаты, возможные значения - "card", "online"',
                'string.empty': 'Не указан способ оплаты',
            }),
        email: Joi.string().email().max(254).required().messages({
            'string.empty': 'Не указан email',
        }),
        phone: Joi.string()
            .trim()
            .pattern(phoneRegExp)
            .max(20)
            .required()
            .messages({
                'string.empty': 'Не указан телефон',
            }),
        address: Joi.string().trim().min(5).max(255).required().messages({
            'string.empty': 'Не указан адрес',
        }),
        total: Joi.number().min(0).max(1_000_000).required().messages({
            'number.base': 'Не указана сумма заказа',
        }),
        comment: Joi.string().trim().max(2_000).optional().allow(''),
    }).unknown(false),
})

export const validateProductBody = celebrate({
    body: Joi.object({
        title: Joi.string().trim().required().min(2).max(30).messages({
            'string.min': 'Минимальная длина поля "name" - 2',
            'string.max': 'Максимальная длина поля "name" - 30',
            'string.empty': 'Поле "title" должно быть заполнено',
        }),
        image: Joi.object({
            fileName: Joi.string().trim().required(),
            originalName: Joi.string().trim().required(),
        }).required(),
        category: Joi.string().trim().max(60).required().messages({
            'string.empty': 'Поле "category" должно быть заполнено',
        }),
        description: Joi.string().trim().max(2_000).required().messages({
            'string.empty': 'Поле "description" должно быть заполнено',
        }),
        price: Joi.number().min(0).allow(null),
    }).unknown(false),
})

export const validateProductUpdateBody = celebrate({
    body: Joi.object({
        title: Joi.string().trim().min(2).max(30).messages({
            'string.min': 'Минимальная длина поля "name" - 2',
            'string.max': 'Максимальная длина поля "name" - 30',
        }),
        image: Joi.object({
            fileName: Joi.string().trim().required(),
            originalName: Joi.string().trim().required(),
        }),
        category: Joi.string().trim().max(60),
        description: Joi.string().trim().max(2_000),
        price: Joi.number().min(0).allow(null),
    })
        .min(1)
        .unknown(false),
})

export const validateProductId = celebrate({
    params: Joi.object({
        productId: objectIdSchema,
    }).unknown(false),
})

export const validateIdParam = celebrate({
    params: Joi.object({
        id: objectIdSchema,
    }).unknown(false),
})

export const validateOrderNumberParam = celebrate({
    params: Joi.object({
        orderNumber: Joi.number().integer().positive().required(),
    }).unknown(false),
})

export const validateUserBody = celebrate({
    body: Joi.object({
        name: Joi.string().trim().min(2).max(30).messages({
            'string.min': 'Минимальная длина поля "name" - 2',
            'string.max': 'Максимальная длина поля "name" - 30',
        }),
        password: Joi.string().min(6).max(72).required().messages({
            'string.empty': 'Поле "password" должно быть заполнено',
        }),
        email: Joi.string()
            .required()
            .email()
            .max(254)
            .message('Поле "email" должно быть валидным email-адресом')
            .messages({
                'string.empty': 'Поле "email" должно быть заполнено',
            }),
    }).unknown(false),
})

export const validateAuthentication = celebrate({
    body: Joi.object({
        email: Joi.string()
            .required()
            .email()
            .max(254)
            .message('Поле "email" должно быть валидным email-адресом')
            .messages({
                'string.required': 'Поле "email" должно быть заполнено',
            }),
        password: Joi.string().min(6).max(72).required().messages({
            'string.empty': 'Поле "password" должно быть заполнено',
        }),
    }).unknown(false),
})

export const validateCurrentUserUpdateBody = celebrate({
    body: Joi.object({
        name: Joi.string().trim().min(2).max(30),
        email: Joi.string().email().max(254),
        phone: Joi.string().trim().pattern(phoneRegExp).max(20),
    })
        .min(1)
        .unknown(false),
})

export const validateCustomerUpdateBody = celebrate({
    body: Joi.object({
        name: Joi.string().trim().min(2).max(30),
        email: Joi.string().email().max(254),
        phone: Joi.string().trim().pattern(phoneRegExp).max(20),
    })
        .min(1)
        .unknown(false),
})

export const validateOrderUpdateBody = celebrate({
    body: Joi.object({
        status: Joi.string()
            .valid(...ORDER_STATUSES)
            .required(),
    }).unknown(false),
})

export const validateProductsQuery = celebrate({
    query: Joi.object({
        ...paginationSchema,
    }).unknown(false),
})

export const validateOrdersQuery = celebrate({
    query: Joi.object({
        ...paginationSchema,
        sortField: Joi.string()
            .valid(...ORDER_SORT_FIELDS)
            .default('createdAt'),
        sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
        status: Joi.string().valid(...ORDER_STATUSES),
        totalAmountFrom: Joi.number().min(0),
        totalAmountTo: Joi.number().min(0),
        orderDateFrom: Joi.date().iso(),
        orderDateTo: Joi.date().iso(),
        search: searchSchema,
    }).unknown(false),
})

export const validateCurrentUserOrdersQuery = celebrate({
    query: Joi.object({
        ...paginationSchema,
        search: searchSchema,
    }).unknown(false),
})

export const validateCustomersQuery = celebrate({
    query: Joi.object({
        ...paginationSchema,
        sortField: Joi.string()
            .valid(...CUSTOMER_SORT_FIELDS)
            .default('createdAt'),
        sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
        registrationDateFrom: Joi.date().iso(),
        registrationDateTo: Joi.date().iso(),
        lastOrderDateFrom: Joi.date().iso(),
        lastOrderDateTo: Joi.date().iso(),
        totalAmountFrom: Joi.number().min(0),
        totalAmountTo: Joi.number().min(0),
        orderCountFrom: Joi.number().integer().min(0),
        orderCountTo: Joi.number().integer().min(0),
        search: searchSchema,
    }).unknown(false),
})
