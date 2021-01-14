module.exports = {
    ...require('./src/step_definitions/navigation'),
    ...require('./src/step_definitions/authorization'),
    ...require('./src/step_definitions/authentication'),
    ...require('./src/step_definitions/anonymous_mode'),
    ...require('./src/step_definitions/ui_elements')
};