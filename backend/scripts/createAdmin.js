require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function createAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = 'Hotel Administrator', ADMIN_PHONE = '' } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    throw new Error('Set ADMIN_EMAIL and a 12+ character ADMIN_PASSWORD in backend/.env before running this command.');
  }
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hotelpro');
  const email = ADMIN_EMAIL.trim().toLowerCase();
  if (await User.exists({ email })) throw new Error('That email already has an account. Ask an existing administrator to update its role.');
  await User.create({ name: ADMIN_NAME.trim(), email, password: ADMIN_PASSWORD, phone: ADMIN_PHONE, role: 'admin' });
  console.log(`Administrator account created for ${email}.`);
}

createAdmin()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
