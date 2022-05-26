// export a function that helps to construct path to parent directory
const path = require('path')

module.exports = path.dirname(require.main.filename) // gives path to app running file
