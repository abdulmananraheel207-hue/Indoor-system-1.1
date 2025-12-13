const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    // MySQL duplicate entry error
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            message: 'Duplicate entry exists',
            error: err.sqlMessage
        });
    }

    // MySQL foreign key constraint error
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(404).json({
            message: 'Referenced record not found',
            error: err.sqlMessage
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
    }

    // Default error
    res.status(err.status || 500).json({
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
};

module.exports = errorHandler;