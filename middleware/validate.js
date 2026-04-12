const validate = (schema) => (req, res, next) => {
    const errors = [];
    Object.keys(schema).forEach(key => {
        const val = req.body[key];
        const rules = schema[key];

        if (rules.required && (val === undefined || val === null || val === '')) {
            errors.push(`${key} is required.`);
        } else if (val) {
            if (rules.type === 'email' && !/\S+@\S+\.\S+/.test(val)) {
                errors.push(`${key} must be a valid email.`);
            }
            if (rules.minLength && val.length < rules.minLength) {
                errors.push(`${key} must be at least ${rules.minLength} characters.`);
            }
            if (rules.maxLength && val.length > rules.maxLength) {
                errors.push(`${key} must be at most ${rules.maxLength} characters.`);
            }
            if (rules.pattern && !rules.pattern.test(val)) {
                errors.push(`${key} has an invalid format.`);
            }
        }
    });

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }
    next();
};

module.exports = validate;
