const Koa = require('koa')
const app = new Koa()
const views = require('koa-views')
const json = require('koa-json')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
const logger = require('koa-logger')
const router = require('koa-router')()
const passport = require('koa-passport')
const session = require('koa-session')
const cors = require('@koa/cors')

const index = require('./routes/index.js')
const auth = require('./routes/auth.js')

app.keys = ['secret']
app.use(session({}, app))
app.use(passport.initialize())
app.use(passport.session())

const users = {
  user1: '123456',
  user2: '43535',
  user3: '00000'
}

passport.serializeUser(function(user, done) {
  done(null, user.username)
})

passport.deserializeUser(async function(id, done) {
  try {
    done(null, {
      username: id, 
      password: users[id],
      cart: []
    })
  } catch(err) {
    done(err)
  }
})

const LocalStrategy = require('passport-local').Strategy
passport.use(new LocalStrategy(function(username, password, done) {
  if(users[username] && users[username] == password) {
    done(null, {
      username: username, password: password, cart: []
    })
  } else {
    done(null, false)
  }
}))

// error handler
onerror(app)

app.use(cors({
  origin: '*'
}))

// middlewares
app.use(bodyparser({
  enableTypes:['json', 'form', 'text']
}))
app.use(json())
app.use(logger())
app.use(require('koa-static')(__dirname + '/public'))

app.use(views(__dirname + '/views', {
  extension: 'pug'
}))

// logger
app.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})

router.get('/', async (ctx, next) => {
  ctx.response.set('Access-Control-Allow-Origin', '*')
  ctx.response.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  ctx.response.set('Access-Control-Allow-Headers', 'Content-Type')
  ctx.response.set('Access-Control-Allow-Credentials', true)
  await ctx.render('index')
})

app.use(index.routes(), index.allowedMethods())
app.use(auth.routes(), auth.allowedMethods())

app.use(router.routes(), router.allowedMethods())
// error-handling
app.on('error', (err, ctx) => {
  console.error('server error', err, ctx)
})

module.exports = app
