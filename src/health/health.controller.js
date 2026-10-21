const mongoose = require('mongoose');

const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];

exports.getHealth = (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    db: states[mongoose.connection.readyState] || 'unknown',
  });
};
