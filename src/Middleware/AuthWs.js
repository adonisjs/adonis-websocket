'use strict'

const Base = use('Adonis/Middleware/Auth')

class AuthWs {
  async wsHandle (context, next) {
    await Base.handle(context, next)
  }
}

module.exports = AuthWs
