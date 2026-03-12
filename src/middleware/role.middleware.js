// restrict access to specific roles only
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'Access denied. You do not have permission to perform this action.',
            })
        }
        next()
    }
}

export { restrictTo }