const { createProbot } = require('probot')
const { resolveAppFunction } = require('probot/lib/helpers/resolve-app-function')
const { getPrivateKey } = require('@probot/get-private-key')
const { template } = require('./views/probot')

let probot

const loadProbot = appFn => {
  probot = probot || createProbot({
    id: process.env.APP_ID,
    secret: process.env.WEBHOOK_SECRET,
    cert: getPrivateKey()
  })

  if (typeof appFn === 'string') {
    appFn = resolveAppFunction(appFn)
  }

  probot.load(appFn)

  return probot
}

module.exports.serverless = appFn => {
  return async (request, response) => {
    // 🤖 A friendly homepage if there isn't a payload
    if (request.method === 'GET' && request.path === '/probot') {
      response.send({
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: template
      })
      return;
    }

    // Otherwise let's listen handle the payload
    probot = probot || loadProbot(appFn)

    // Determine incoming webhook event type
    const name = request.headers['x-github-event'] || request.headers['X-GitHub-Event']
    const id = request.headers['x-github-delivery'] || request.headers['X-GitHub-Delivery']

    // Do the thing
    console.log(`Received event ${name}${request.body.action ? ('.' + request.body.action) : ''}`)
    if (name) {
      try {
        await probot.receive({
          name,
          id,
          payload: request.body
        })
        response.send({
          statusCode: 200,
          body: JSON.stringify({ message: 'Executed' })
        })
      } catch (err) {
        console.error(err)
        response.send({
          statusCode: 500,
          body: JSON.stringify({ message: 'Error' })
        })
      }
    } else {
      console.error("Invalid request", request)
      response.sendStatus(400)
    }
  }
}
