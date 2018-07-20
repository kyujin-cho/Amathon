const router = require('koa-router')({prefix: '/api'})

router.get('/cart', async (ctx, next) => {
  if(!ctx.isAuthenticated()) {
    ctx.body = await {
      success: false,
      error: 'not logged in'
    }
    return
  }
  console.log(ctx.state.user)
  ctx.body = await {
    success: true,
    cart: ctx.session.cart
  }
})

router.post('/cart', async (ctx, next) => {
  console.log(ctx.request.body.name)
  console.log(ctx.request.body.amount)
  if(!ctx.isAuthenticated()) {
    ctx.body = await {
      success: false,
      error: 'not logged in'
    }
    return
  }
  if(!ctx.session.cart) {
    ctx.session.cart = [{name: ctx.request.body.name, amount: ctx.request.body.amount}]
  } else {
    ctx.session.cart.push({name: ctx.request.body.name, amount: ctx.request.body.amount})
  }
  ctx.body = await {
    success: true
  }
})

router.get('/items', async (ctx, next) => {
  ctx.body = await {
    success: true,
    items: ['potato', 'tomato', 'banana']
  }
})

router.get('/itemsInKorean', async (ctx, next) => {
  ctx.body = await {
    success: true,
    items: {
      'potato': '감자',
      'tomato': '토마토',
      'banana': '바나나'
    }
  }
})

module.exports = router