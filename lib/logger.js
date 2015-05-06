
module.exports = function makeLogger(dest, noConsole) {
  var winston = require('winston');
  winston.emitErrs = true;

  const transports = []
  transports.push(new winston.transports.File({
      level: 'info',
      filename: dest,
      handleExceptions: true,
      json: true,
      maxsize: 5242880, //5MB
      maxFiles: 5,
      colorize: false
  }))

  if (!noConsole) {
    transports.push(new winston.transports.Console({
        level: 'debug',
        handleExceptions: true,
        json: false,
        colorize: true
    }))
  }

  var logger = new winston.Logger({
      transports,
      exitOnError: false
  });

  logger.stream = {
      write: function(message, encoding){
          logger.info(message);
      }
  };
  return logger;
}

