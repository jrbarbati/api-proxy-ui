module.exports = {
  '/api': {
    target: process.env['API_PROXY_URL'] || 'http://localhost:8080',
    secure: false,
    changeOrigin: true,
    logLevel: 'info',
  },
};
