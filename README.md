# ALClient

**NOTE: This code is very much a work in progress. Things will quickly change, and your code will likely break between changes.**

-----

This is the latest code I use to run my bots in [AdventureLand](https://adventure.land). It's 99% custom code that seems *much* more efficient than running the code in-game, or using the game's "official" CLI.

This code is **NOT** a 1-to-1 drop in, like [ALBot](https://github.com/NexusNull/ALBot) aims to be. Your code **WILL NOT** run as-is if you try to run it using this project.

## Requirements

* Node
  * Tested with **14.13.1**
* MongoDB
  * Tested with **4.4.1**

## Installation

1. Download the code (.zip, or clone the repository)
2. Run `npm install`.
3. Edit the code as necessary (change the login and password & the usernames)
4. Run `tsc build`.
5. Run `node build/monsterhunter.js`, or whatever.

## Hints

* If you want to run the code in an infinite loop, you can do the following:
  * Linux (Bash)
    * `while true; do node halloween.js; done`
  * Windows (PowerShell)
    * `while($true) { node .\monsterhunt.js }`
