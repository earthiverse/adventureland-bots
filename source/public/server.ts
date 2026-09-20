import bodyParser from "body-parser"
import { spawn } from "child_process"
import cors from "cors"
import express from "express"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(express.json())
app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 80

// Resolve HTML file location (works in both development and build)
const getHtmlPath = () => {
    const candidates = [
        path.join(__dirname, "index.html"),
        path.join(path.resolve(), "source", "public", "index.html"),
        path.join(path.resolve(), "build", "public", "index.html"),
    ]
    for (const p of candidates) {
        if (fs.existsSync(p)) return p
    }
    return candidates[0]
}

app.get("/", (_req, res) => {
    res.sendFile(getHtmlPath())
})

app.post("/", (req, res) => {
    const {
        user,
        auth,
        char1,
        char2,
        char3,
        char4,
        region = "US",
        identifier = "II",
        monster = "bat",
        use_bank_b = false,
        use_bank_u = false,
        do_events = true,
    } = req.body

    const cleanUser = typeof user === "string" ? user.trim() : ""
    const cleanAuth = typeof auth === "string" ? auth.trim() : ""

    if (!cleanUser || !cleanAuth) {
        return res.status(400).json({ error: "User ID and Auth Code are required." })
    }

    const rawChars = [char1, char2, char3, char4]
    const characters: string[] = []
    for (const c of rawChars) {
        if (typeof c === "string" && c.trim().length > 0) {
            characters.push(c.trim())
        }
    }

    if (characters.length === 0) {
        return res.status(400).json({ error: "At least one character name is required." })
    }

    const runnerPath = path.join(__dirname, "runner.js")
    const payload = JSON.stringify({
        userId: cleanUser,
        userAuth: cleanAuth,
        characters: characters,
        region: region,
        identifier: identifier,
        monster: monster,
        useBankB: Boolean(use_bank_b),
        useBankU: Boolean(use_bank_u),
        doEvents: Boolean(do_events),
    })

    const encodedPayload = Buffer.from(payload).toString("base64")

    try {
        const child = spawn(process.execPath, [runnerPath, encodedPayload], {
            stdio: "pipe",
            cwd: path.resolve(),
        })

        child.stdout?.pipe(process.stdout)
        child.stderr?.pipe(process.stderr)

        child.on("close", (code) => {
            console.log(`[Server] Runner process (PID: ${child.pid}) exited with code ${code}`)
        })

        child.on("error", (err) => {
            console.error(`[Server] Runner process (PID: ${child.pid}) error:`, err)
        })

        console.log(`[Server] Spawned runner process (PID: ${child.pid}) for characters: ${characters.join(", ")}`)
        return res.status(200).json({
            success: true,
            message: `Spawned process for ${characters.length} character(s): ${characters.join(", ")} on ${region} ${identifier} (Monster: ${monster}).`,
            pid: child.pid,
        })
    } catch (e: any) {
        console.error("[Server] Error spawning runner process:", e)
        return res.status(500).json({ error: `Failed to spawn process: ${e.message || e}` })
    }
})

app.listen(PORT, () => {
    console.log(`[Public Web Server] Ready and listening on port ${PORT}!`)
})
