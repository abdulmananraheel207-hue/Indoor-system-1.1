const { body, param, query, validationResult } = require('express-validator');

const validate = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        res.status(400).json({ errors: errors.array() });
    };
};

// User validation rules
const userValidation = {
    register: validate([
        body('name').notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Valid email is required'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters'),
        body('phone_number')
            .optional()
            .matches(/^\+?[1-9]\d{1,14}$/)
            .withMessage('Valid phone number required')
    ]),

    login: validate([
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required')
    ]),

    updateProfile: validate([
        body('name').optional().notEmpty().withMessage('Name cannot be empty'),
        body('phone_number')
            .optional()
            .matches(/^\+?[1-9]\d{1,14}$/)
            .withMessage('Valid phone number required')
    ])
};

// Arena validation rules
const arenaValidation = {
    createArena: validate([
        body('name').notEmpty().withMessage('Arena name is required'),
        body('address').notEmpty().withMessage('Address is required'),
        body('location_lat').isDecimal().withMessage('Valid latitude required'),
        body('location_lng').isDecimal().withMessage('Valid longitude required'),
        body('base_price_per_hour')
            .isDecimal({ gt: 0 })
            .withMessage('Valid price required'),
        body('sports').isArray({ min: 1 }).withMessage('At least one sport required')
    ]),

    updateTimeSlots: validate([
        body('date').isDate().withMessage('Valid date required'),
        body('slots').isArray().withMessage('Slots must be an array'),
        body('is_blocked').optional().isBoolean()
    ])
};

// Booking validation rules
const bookingValidation = {
    createBooking: validate([
        body('arena_id').isInt({ gt: 0 }).withMessage('Valid arena ID required'),
        body('slot_id').isInt({ gt: 0 }).withMessage('Valid slot ID required'),
        body('sport_id').isInt({ gt: 0 }).withMessage('Valid sport ID required'),
        body('court_id').optional().isInt({ gt: 0 })
    ])
};

// Team validation rules
const teamValidation = {
    createTeam: validate([
        body('team_name').notEmpty().withMessage('Team name is required'),
        body('sport_id').isInt({ gt: 0 }).withMessage('Valid sport ID required')
    ])
};

module.exports = {
    userValidation,
    arenaValidation,
    bookingValidation,
    teamValidation,
    validate
};