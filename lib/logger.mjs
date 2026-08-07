import log4js from 'log4js';

log4js.configure({
  appenders: {
    console: {
      type: 'console',
      // coloured layout 会按日志级别（INFO/WARN/ERROR...）自动着色，并在前面带上时间戳、分类、级别信息
      layout: {
        type: 'pattern',
        pattern: '%[[%d{yyyy-MM-dd hh:mm:ss.SSS}] [%p] [%c]%] %m',
      },
    },
  },
  categories: {
    default: { appenders: ['console'], level: 'info' },
  },
});

/**
 * 获取一个带分类名的 logger 实例
 * @param {string} category 日志分类名，通常传入模块名，例如 'server' | 'client' | 'chat-client'
 */
export const getLogger = (category = 'default') => log4js.getLogger(category);

export default getLogger();
