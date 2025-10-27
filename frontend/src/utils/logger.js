/**
 * Logger utility - Chỉ log trong development mode
 * Tắt hoàn toàn trong production để tối ưu performance
 */

const isDevelopment = process.env.NODE_ENV === "development";

export const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  error: (...args) => {
    // ERROR luôn log, ngay cả production
    console.error(...args);
  },

  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  table: (...args) => {
    if (isDevelopment) {
      console.table(...args);
    }
  },
};

export default logger;
