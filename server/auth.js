const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "attendix_secret_key";

async function createUser(user) {
  const hashedPassword = await bcrypt.hash(user.password, 10);

  return {
    ...user,
    password: hashedPassword,
  };
}

async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

function createToken(userId) {
  return jwt.sign(
    {
      userId,
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );
}

module.exports = {
  createUser,
  verifyPassword,
  createToken,
};