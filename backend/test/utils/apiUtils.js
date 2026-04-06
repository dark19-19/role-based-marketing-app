const request = require('supertest');
const app = require('../../src/app');

async function login({ phone, password }) {
  const res = await request(app).post('/api/auth/login').send({ phone, password });
  return res;
}

async function loginAdmin() {
  const res = await login({ phone: '0912345678', password: '12345678' });
  return res;
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = {
  app,
  request,
  login,
  loginAdmin,
  authHeader,
};

