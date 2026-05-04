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

async function getToken({ phone, password }) {
  const res = await login({ phone, password });
  return res.body?.data?.token;
}

async function getAdminToken() {
  return await getToken({ phone: '0912345678', password: '12345678' });
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = {
  app,
  request,
  login,
  loginAdmin,
  getToken,
  getAdminToken,
  authHeader,
};
