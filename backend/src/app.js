const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const rateLimiter = require('./middleware/rateLimiter');


const app = express();

app.use(cors());
app.use(express.json());
app.use(rateLimiter);

app.use(routes);

app.get('/health', (_req, res) => res.json({ ok: true }));

module.exports = app;

