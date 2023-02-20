process.env.NODE_ENV = 'test';

module.exports = {
  require: 'ts-node/register',
  extension: ['ts'],
  watchExtensions: ['ts'],
  spec: ['tests/**/*.spec.ts'],
}