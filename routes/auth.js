const router = require('koa-router')({prefix: '/api/auth'})
const passport = require('koa-passport')

router.get('/user', async (ctx, next) => {
  if(!ctx.isAuthenticated()) {
    ctx.body = await {
      success: false,
      error: 'not logged in'
    }
    return
  }
  ctx.body = await {
    success: true,
    user: ctx.state.user
  }
})

router.post('/login', passport.authenticate('local'), async (ctx, next) => {
  ctx.body = await {
    success: ctx.isAuthenticated()
  }
})

router.get('/logout', async (ctx, next) => {
  ctx.logout()
  ctx.body = await {
    success: true
  }
})
module.exports = router