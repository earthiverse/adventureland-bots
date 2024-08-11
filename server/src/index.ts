import al from './routes/al.js'
import express from 'express'

const SERVER_PORT = 3000 /** TODO: Configuration */

const app = express()

// Serve the UI
app.use(express.static('public'))

// Serve the AL endpoint
app.use('/al', al)

app.listen(SERVER_PORT, () => {
  console.debug(`Listening on ${SERVER_PORT}!`)
})
