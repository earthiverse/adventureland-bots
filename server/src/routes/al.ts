import { Game } from 'alclient'
import express, { Response } from 'express'

const router = express.Router()
router.use(express.json())

router.post('/login', async (req, res: Response<typeof Game.user | { error: string }>) => {
  // TODO: Is there a away to use types across the server and ui?
  const login = req.body as {
    email: string
    password: string
  }

  // TODO: MongoDB Credentials
  try {
    await Game.login(login.email, login.password)
  } catch (e) {
    if (!(e instanceof Error)) {
      return res.status(500).send({ error: 'Error logging in' })
    }
    switch (e.message) {
      case 'Wrong Password':
        res = res.status(401)
        break
      // TODO: Better status codes based on error message
      default:
        res = res.status(500)
        break
    }
    return res.send({ error: `Error logging in: ${e.message}` })
  }

  return res.send(Game.user)
})

router.post(
  '/get-characters',
  async (req, res: Response<typeof Game.characters | { error: string }>) => {
    const oldGameUser = Game.user
    Game.user = req.body

    try {
      await Game.updateServersAndCharacters()
    } catch (e) {
      Game.user = oldGameUser
      return res.status(401).send({ error: 'Error retrieving characters' })
    }

    return res.send(Game.characters)
  }
)

export default router
