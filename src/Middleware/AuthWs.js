'use strict'

const Base = use('Adonis/Middleware/Auth')

class AuthWs {
  //eslint-disable-next-line
  async wsHandle (context, next) {
    await Base.handle(context, next)
  }
}

module.exports = AuthWs
