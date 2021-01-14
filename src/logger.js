const createLogger = require('pino');
const {name} = require("../package");

module.exports = createLogger({
    name,
    level: process.env.LOG_LEVEL || "info",
    prettyPrint: true
});
