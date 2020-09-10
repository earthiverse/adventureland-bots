import axios from "axios"
import { AchievementProgressData, ServerData, CharacterListData } from "./definitions/adventureland-server"
import { connect, disconnect } from "./database/database.js"
import { UserModel } from "./database/users/users.model.js"
import { IUserDocument } from "./database/users/users.types.js"
import { ServerRegion, ServerIdentifier } from "./definitions/adventureland"

// Connect to the MongoDB database
connect()

class Player {
    protected user: string
    protected character: string
    protected auth: string

    public achievements = new Map<string, AchievementProgressData>()
    public socket: SocketIOClient.Socket

    constructor(user: string, auth: string, character: string) {
        this.user = user
        this.auth = auth
        this.character = character
    }

    public async connect() {
        // TODO: Implement
    }
}

export class Game2 {
    protected static user: IUserDocument
    protected static servers: { [T in ServerRegion]?: { [T in ServerIdentifier]?: ServerData } } = {}
    protected static characters: { [T in string]?: CharacterListData } = {}

    private constructor() {
        // Private to force static methods
    }

    static async login(email: string, password: string): Promise<boolean> {
        // See if we already have a loginAuth stored in our database
        const user = await UserModel.findOne({ email: email, password: password }).exec()

        if (user) {
            this.user = user
        } else {
            // Login and save the auth
            const login = await axios.post("https://adventure.land/api/signup_or_login", `method=signup_or_login&arguments={"email":"${email}","password":"${password}","only_login":true}`)
            let loginResult
            for (const datum of login.data) {
                if (datum.message) {
                    loginResult = datum
                    break
                }
            }
            if (loginResult && loginResult.message == "Logged In!") {
                // We successfully logged in
                // Find the auth cookie and save it
                for (const cookie of login.headers["set-cookie"]) {
                    const result = /^auth=(.+?);/.exec(cookie)
                    if (result) {
                        // Save our data to the database
                        this.user = await UserModel.findOneAndUpdate({ email: email, password: password }, { email: email, password: password, userID: result[1].split("-")[0], userAuth: result[1].split("-")[1] }, { upsert: true, new: true, lean: true }).exec()
                        console.log(this.user)
                        break
                    }
                }
            } else if (loginResult && loginResult.message) {
                // We failed logging in, and we have a reason from the server
                console.error(loginResult.message)
                return Promise.reject(loginResult.message)
            } else {
                // We failed logging in, but we don't know what went wrong
                console.error(login.data)
                return Promise.reject()
            }
        }

        return this.updateServersAndCharacters()
    }

    static async startCharacter(characterName: string): Promise<Player> {
        if (!this.user) return Promise.reject("You must login first.")
        if (!this.characters) await this.updateServersAndCharacters()

        const player = new Player(this.user.userID, this.user.userAuth, this.characters[characterName].id)

        return player
    }

    static async updateServersAndCharacters(): Promise<boolean> {
        const data = await axios.post("http://adventure.land/api/servers_and_characters", "method=servers_and_characters&arguments={}", { headers: { "cookie": `auth=${this.user.userID}-${this.user.userAuth}` } })

        if (data.status == 200) {
            // Populate server information
            for (const serverData of data.data[0].servers as ServerData[]) {
                if (!this.servers[serverData.region]) this.servers[serverData.region] = {}
                this.servers[serverData.region][serverData.name] = serverData
            }

            // Populate character information
            for (const characterData of data.data[0].characters as CharacterListData[]) {
                this.characters[characterData.name] = characterData
            }

            return Promise.resolve(true)
        }

        return Promise.reject()
    }
}