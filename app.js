/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

require('dotenv').config()
var express = require('express') // Express web server framework
var request = require('request') // "Request" library
var cors = require('cors')
var querystring = require('querystring')
var cookieParser = require('cookie-parser')
const ejsLayouts = require('express-ejs-layouts')
const axios = require('axios')
const path = require('path')

var client_id = '6855733766f843ef8e1cc8c2bf86d052' // Your client id
var client_secret = 'bdc0727b8b6e4fe7ba84e5b061309e77' // Your secret
var redirect_uri = 'http://localhost:8888/callback' // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function (length) {
  var text = ''
  var possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

var stateKey = 'spotify_auth_state'

var app = express()

app.engine('html', require('ejs').renderFile)
app.set('view engine', 'ejs')
app.set('views', __dirname + '/views')

app.use(ejsLayouts)

app
  .use(express.static(__dirname + '/public'))
  .use(cors())
  .use(cookieParser())

app.get('/login', function (req, res) {
  var state = generateRandomString(16)
  res.cookie(stateKey, state)

  // your application requests authorization
  var scope = 'user-read-private user-read-email'
  res.redirect(
    'https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
      })
  )
})

app.get('/callback', function (req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null
  var state = req.query.state || null
  var storedState = req.cookies ? req.cookies[stateKey] : null

  if (state === null || state !== storedState) {
    res.redirect(
      '/#' +
        querystring.stringify({
          error: 'state_mismatch',
        })
    )
  } else {
    res.clearCookie(stateKey)
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code',
      },
      headers: {
        Authorization:
          'Basic ' +
          new Buffer(client_id + ':' + client_secret).toString('base64'),
      },
      json: true,
    }

    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var access_token = body.access_token,
          refresh_token = body.refresh_token
        // ***TODO HERE I HAVE SET IT TO SEARCH FOR TRACKS CALLED "HELLO"
        var options = {
          url: 'https://api.spotify.com/v1/search?q=Hello&type=track&limit=10',
          headers: { Authorization: 'Bearer ' + access_token },
          json: true,
        }

        // use the access token to access the Spotify Web API
        request.get(options, function (error, response, body) {
          res.render('results', { tracks: body.tracks.items })
        })

        // we can also pass the token to the browser to make requests from there
        // res.redirect(
        //   '/#' +
        //     querystring.stringify({
        //       access_token: access_token,
        //       refresh_token: refresh_token,
        //     })
        // )
      } else {
        res.redirect(
          '/#' +
            querystring.stringify({
              error: 'invalid_token',
            })
        )
      }
    })
  }
})

app.get('/refresh_token', function (req, res) {
  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      Authorization:
        'Basic ' +
        new Buffer(client_id + ':' + client_secret).toString('base64'),
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token,
    },
    json: true,
  }

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token
      res.send({
        access_token: access_token,
      })
    }
  })
})

console.log('Listening on 8888')
app.listen(8888)
