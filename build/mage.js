window["bots"] =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 17);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "q", function() { return sleep; });
/* unused harmony export isNPC */
/* unused harmony export isMonster */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "p", function() { return isPlayer; });
/* unused harmony export startKonami */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "j", function() { return getInventory; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "c", function() { return findItem; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "d", function() { return findItems; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "e", function() { return findItemsWithLevel; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return calculateDamageRange; });
/* unused harmony export areWalkingTowards */
/* unused harmony export canSeePlayer */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "f", function() { return getCooldownMS; });
/* unused harmony export estimatedTimeToKill */
/* unused harmony export getExchangableItems */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "o", function() { return isInventoryFull; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "k", function() { return getPartyMemberTypes; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "h", function() { return getEmptySlots; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "g", function() { return getEmptyBankSlots; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "n", function() { return isAvailable; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "i", function() { return getEntities; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "m", function() { return getVisibleMonsterTypes; });
/* unused harmony export sendMassCM */
/* unused harmony export getMonsterSpawns */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "l", function() { return getRandomMonsterSpawn; });
/* unused harmony export getClosestMonsterSpawn */
/* unused harmony export getNearbyMonsterSpawns */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return buyIfNone; });
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function isNPC(entity) {
    return entity.npc ? true : false;
}
function isMonster(entity) {
    return entity.type == "monster";
}
function isPlayer(entity) {
    return entity.type == "character" && !isNPC(entity);
}
async function startKonami() {
    const result = new Promise((resolve) => {
        parent.socket.once("game_response", (response) => {
            resolve(response.monster);
        });
        parent.socket.emit("move", { "key": "up" });
        parent.socket.emit("move", { "key": "up" });
        parent.socket.emit("move", { "key": "down" });
        parent.socket.emit("move", { "key": "down" });
        parent.socket.emit("move", { "key": "left" });
        parent.socket.emit("move", { "key": "right" });
        parent.socket.emit("move", { "key": "left" });
        parent.socket.emit("move", { "key": "right" });
        parent.socket.emit("interaction", { "key": "B" });
        parent.socket.emit("interaction", { "key": "A" });
        parent.socket.emit("interaction", { "key": "enter" });
    });
    const timeout = new Promise(function (resolve, reject) {
        setTimeout(reject, 5000);
    });
    return Promise.race([result, timeout]);
}
function getInventory(inventory = parent.character.items) {
    const items = [];
    for (let i = 0; i < 42; i++) {
        if (!inventory[i])
            continue;
        items.push({ ...inventory[i], index: i });
    }
    return items;
}
function findItem(name) {
    for (let i = 0; i < 42; i++) {
        if (!parent.character.items[i])
            continue;
        if (parent.character.items[i].name != name)
            continue;
        return { ...parent.character.items[i], index: i };
    }
}
function findItems(name) {
    const items = [];
    for (let i = 0; i < 42; i++) {
        if (!parent.character.items[i])
            continue;
        if (parent.character.items[i].name != name)
            continue;
        items.push({ ...parent.character.items[i], index: i });
    }
    return items;
}
function findItemsWithLevel(name, level) {
    const items = [];
    for (let i = 0; i < 42; i++) {
        if (!parent.character.items[i])
            continue;
        if (parent.character.items[i].name != name)
            continue;
        if (parent.character.items[i].level != level)
            continue;
        items.push({ ...parent.character.items[i], index: i });
    }
    return items;
}
function calculateDamageRange(attacker, defender) {
    let baseDamage = attacker.attack;
    if (!attacker.apiercing)
        attacker.apiercing = 0;
    if (!attacker.rpiercing)
        attacker.rpiercing = 0;
    if (!defender.armor)
        defender.armor = 0;
    if (!attacker.damage_type && attacker.slots.mainhand)
        attacker.damage_type = G.items[attacker.slots.mainhand.name].damage;
    if (defender["1hp"]) {
        return [1, 1];
    }
    if (attacker.damage_type == "physical") {
        baseDamage *= damage_multiplier(defender.armor - attacker.apiercing);
    }
    else if (attacker.damage_type == "magical") {
        baseDamage *= damage_multiplier(defender.resistance - attacker.rpiercing);
    }
    return [baseDamage * 0.9, baseDamage * 1.1];
}
function areWalkingTowards(entity) {
    if (!parent.character.moving)
        return false;
    if (parent.character.vx < 0 && parent.character.real_x - entity.real_x > 0)
        return true;
}
function canSeePlayer(name) {
    return parent.entities[name] ? true : false;
}
function getCooldownMS(skill, ignorePing = false) {
    if (parent.next_skill && parent.next_skill[skill]) {
        const ms = parent.next_skill[skill].getTime() - Date.now();
        if (ignorePing) {
            return ms + 1;
        }
        else {
            return ms < parent.character.ping ? parent.character.ping : ms + 1;
        }
    }
    else {
        return parent.character.ping;
    }
}
function estimatedTimeToKill(attacker, defender) {
    const damage = calculateDamageRange(attacker, defender)[0];
    let evasionMultiplier = 1;
    if (defender.evasion && attacker.damage_type == "physical") {
        evasionMultiplier -= defender.evasion * 0.01;
    }
    const attacksPerSecond = attacker.frequency;
    const numberOfAttacks = Math.ceil(evasionMultiplier * defender.hp / damage);
    return numberOfAttacks / attacksPerSecond;
}
function getExchangableItems(inventory) {
    const items = [];
    for (const item of getInventory(inventory)) {
        if (G.items[item.name].e)
            items.push(item);
    }
    return items;
}
function isInventoryFull(store = parent.character.items) {
    for (let i = 0; i < store.length; i++) {
        if (!store[i])
            return false;
    }
    return true;
}
function getPartyMemberTypes() {
    const types = new Set();
    for (const name of parent.party_list) {
        types.add(parent.party[name].type);
    }
    return types;
}
function getEmptySlots(store = parent.character.items) {
    const slots = [];
    for (let i = 0; i < store.length; i++) {
        if (!store[i])
            slots.push(i);
    }
    return slots;
}
function getEmptyBankSlots() {
    if (parent.character.map != "bank")
        return;
    const emptySlots = [];
    for (const store in parent.character.bank) {
        if (store == "gold")
            continue;
        for (let i = 0; i < 42; i++) {
            const item = parent.character.bank[store][i];
            if (!item)
                emptySlots.push({ pack: store, "index": i });
        }
    }
    return emptySlots;
}
function isAvailable(skill) {
    const skillLevel = G.skills[skill].level;
    if (skillLevel && skillLevel > parent.character.level)
        return false;
    if (parent.character.stoned)
        return false;
    if (parent.character.rip)
        return false;
    const skillWeaponType = G.skills[skill].wtype;
    if (skillWeaponType && skillWeaponType != G.items[parent.character.slots.mainhand.name].wtype)
        return false;
    if (G.skills[skill].slot) {
        for (const requiredItem of G.skills[skill].slot) {
            if (parent.character.slots[requiredItem[0]].name != requiredItem[1])
                return false;
        }
    }
    if (G.skills[skill].class) {
        let skillClass = false;
        for (const classType of G.skills[skill].class) {
            if (classType == parent.character.ctype) {
                skillClass = true;
                break;
            }
        }
        if (!skillClass)
            return false;
    }
    let mp = 0;
    if (G.skills[skill].mp) {
        mp = G.skills[skill].mp;
    }
    else if (["attack", "heal"].includes(skill)) {
        mp = parent.character.mp_cost;
    }
    if (parent.character.mp < mp)
        return false;
    if (parent.next_skill[skill] === undefined)
        return true;
    const skillShare = G.skills[skill].share;
    if (skillShare)
        return parent.next_skill[skillShare] ? (Date.now() >= parent.next_skill[skillShare].getTime()) : true;
    return Date.now() >= parent.next_skill[skill].getTime();
}
function getEntities({ canAttackUsWithoutMoving, canKillInOneHit, canMoveTo, isAttacking, isAttackingParty, isAttackingUs, isCtype, isMonster, isMonsterType, isMoving, isNPC, isPartyMember, isPlayer, isRIP, isWithinDistance }) {
    const entities = [];
    const isPVP = is_pvp();
    for (const id in parent.entities) {
        const entity = parent.entities[id];
        const d = distance(parent.character, entity);
        if (canAttackUsWithoutMoving === true && entity.range > d)
            continue;
        if (canAttackUsWithoutMoving === false && entity.range <= d)
            continue;
        if (canKillInOneHit === true && calculateDamageRange(parent.character, entity)[0] > entity.hp)
            continue;
        if (canKillInOneHit === false && calculateDamageRange(parent.character, entity)[0] <= entity.hp)
            continue;
        if (canMoveTo === true && !can_move_to(entity.real_x, entity.real_y))
            continue;
        if (canMoveTo === false && can_move_to(entity.real_x, entity.real_y))
            continue;
        if (isAttacking === true && entity.type == "monster" && !entity.target)
            continue;
        if (isAttacking === false && entity.type == "monster" && entity.target)
            continue;
        if (isAttacking === true && entity.type == "character" && !entity.target)
            continue;
        if (isAttackingParty === true && entity.type == "monster" && !parent.party_list.includes(entity.target))
            continue;
        if (isAttackingParty === false && entity.type == "monster" && parent.party_list.includes(entity.target))
            continue;
        if (isAttackingParty === true && entity.type == "character" && !isPVP)
            continue;
        if (isAttackingParty === true && entity.type == "character" && parent.party_list.includes(id))
            continue;
        if (isAttackingParty === true && parent.character.name == "Wizard")
            continue;
        if (isAttackingUs === true && entity.type == "monster" && entity.target != parent.character.name)
            continue;
        if (isAttackingUs === false && entity.type == "monster" && entity.target == parent.character.name)
            continue;
        if (isAttackingUs === true && entity.type == "character" && !isPVP)
            continue;
        if (isAttackingUs === true && entity.type == "character" && parent.party_list.includes(id))
            continue;
        if (isAttackingUs === true && parent.character.name == "Wizard")
            continue;
        if (isCtype !== undefined && !entity.ctype)
            continue;
        if (isCtype !== undefined && entity.ctype != isCtype)
            continue;
        if (isMonster === true && entity.type != "monster")
            continue;
        if (isMonster === false && entity.type == "monster")
            continue;
        if (isMonsterType !== undefined && !entity.mtype)
            continue;
        if (isMonsterType !== undefined && !isMonsterType.includes(entity.mtype))
            continue;
        if (isMoving === true && !entity.moving)
            continue;
        if (isMoving === false && entity.moving)
            continue;
        if (isNPC === true && entity.type != "character")
            continue;
        if (isNPC === true && entity.type == "character" && !entity.npc)
            continue;
        if (isPartyMember === true && !parent.party_list.includes(id))
            continue;
        if (isPartyMember === false && parent.party_list.includes(id))
            continue;
        if (isPlayer === true && entity.type != "character")
            continue;
        if (isPlayer === true && entity.npc)
            continue;
        if (isRIP === true && !entity.rip)
            continue;
        if (isRIP === false && entity.rip)
            continue;
        if (isWithinDistance !== undefined && d > isWithinDistance)
            continue;
        entities.push(entity);
    }
    return entities;
}
function getVisibleMonsterTypes() {
    const monsterTypes = new Set();
    for (const id in parent.entities) {
        const entity = parent.entities[id];
        if (entity.mtype)
            monsterTypes.add(entity.mtype);
    }
    return monsterTypes;
}
function sendMassCM(names, data) {
    for (const name of names) {
        send_cm(name, data);
    }
}
function getMonsterSpawns(type) {
    const spawnLocations = [];
    for (const id in G.maps) {
        const map = G.maps[id];
        if (map.instance)
            continue;
        for (const monster of map.monsters || []) {
            if (monster.type != type)
                continue;
            if (monster.boundary) {
                spawnLocations.push({ "map": id, "x": (monster.boundary[0] + monster.boundary[2]) / 2, "y": (monster.boundary[1] + monster.boundary[3]) / 2 });
            }
            else if (monster.boundaries) {
                for (const boundary of monster.boundaries) {
                    spawnLocations.push({ "map": boundary[0], "x": (boundary[1] + boundary[3]) / 2, "y": (boundary[2] + boundary[4]) / 2 });
                }
            }
        }
    }
    return spawnLocations;
}
function getRandomMonsterSpawn(type) {
    const monsterSpawns = getMonsterSpawns(type);
    return monsterSpawns[Math.floor(Math.random() * monsterSpawns.length)];
}
function getClosestMonsterSpawn(type) {
    const monsterSpawns = getMonsterSpawns(type);
    let closestSpawnDistance = Number.MAX_VALUE;
    let closestSpawn;
    for (const spawn of monsterSpawns) {
        const d = distance(parent.character, spawn);
        if (d < closestSpawnDistance) {
            closestSpawnDistance = d;
            closestSpawn = spawn;
        }
    }
    return closestSpawn;
}
function getNearbyMonsterSpawns(position, radius = 1000) {
    const locations = [];
    const map = G.maps[position.map];
    if (map.instance)
        return;
    for (const monster of map.monsters || []) {
        if (monster.boundary) {
            const location = { "map": position.map, "x": (monster.boundary[0] + monster.boundary[2]) / 2, "y": (monster.boundary[1] + monster.boundary[3]) / 2 };
            if (distance(position, location) < radius)
                locations.push({ ...location, monster: monster.type });
            else if (position.x >= monster.boundary[0] && position.x <= monster.boundary[2] && position.y >= monster.boundary[1] && position.y <= monster.boundary[3])
                locations.push({ ...location, monster: monster.type });
        }
        else if (monster.boundaries) {
            for (const boundary of monster.boundaries) {
                if (boundary[0] != position.map)
                    continue;
                const location = { "map": position.map, "x": (boundary[1] + boundary[3]) / 2, "y": (boundary[2] + boundary[4]) / 2 };
                if (distance(position, location) < radius)
                    locations.push({ ...location, monster: monster.type });
                else if (position.x >= boundary[1] && position.x <= boundary[3] && position.y >= boundary[2] && position.y <= boundary[4])
                    locations.push({ ...location, monster: monster.type });
            }
        }
    }
    locations.sort((a, b) => {
        return distance(position, a) > distance(position, b) ? 1 : -1;
    });
    return locations;
}
async function buyIfNone(itemName, targetLevel = 9, targetQuantity = 1) {
    if (!findItem("computer")) {
        let foundNPCBuyer = false;
        if (!G.maps[parent.character.map].npcs)
            return;
        for (const npc of G.maps[parent.character.map].npcs) {
            if (G.npcs[npc.id].role != "merchant")
                continue;
            if (distance(parent.character, {
                x: npc.position[0],
                y: npc.position[1]
            }) < 350) {
                foundNPCBuyer = true;
                break;
            }
        }
        if (!foundNPCBuyer)
            return;
    }
    let items = findItemsWithLevel(itemName, targetLevel);
    if (items.length >= targetQuantity)
        return;
    items = findItems(itemName);
    if (items.length < Math.min(2, targetQuantity))
        await buy_with_gold(itemName, 1);
}


/***/ }),
/* 1 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return getMonstersInfo; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "e", function() { return setMonstersInfo; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return getNPCInfo; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "f", function() { return setNPCInfo; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "c", function() { return getPartyInfo; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "g", function() { return setPartyInfo; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "d", function() { return getPlayersInfo; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "h", function() { return setPlayersInfo; });
function reviver(key, value) {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
        return new Date(value);
    }
    return value;
}
function serverPrefix() {
    return `${parent.server_region}.${parent.server_identifier}`;
}
function getMonstersInfo() {
    return JSON.parse(localStorage.getItem(`${serverPrefix()}_monsters`), reviver) || {};
}
function setMonstersInfo(info) {
    localStorage.setItem(`${serverPrefix()}_monsters`, JSON.stringify(info));
}
function getNPCInfo() {
    return JSON.parse(localStorage.getItem(`${serverPrefix()}_npcs`), reviver) || {};
}
function setNPCInfo(info) {
    localStorage.setItem(`${serverPrefix()}_npcs`, JSON.stringify(info));
}
function getPartyInfo() {
    return JSON.parse(localStorage.getItem(`${serverPrefix()}_party`), reviver) || {};
}
function setPartyInfo(info) {
    localStorage.setItem(`${serverPrefix()}_party`, JSON.stringify(info));
}
function getPlayersInfo() {
    return JSON.parse(localStorage.getItem(`${serverPrefix()}_players`), reviver) || {};
}
function setPlayersInfo(info) {
    localStorage.setItem(`${serverPrefix()}_players`, JSON.stringify(info));
}


/***/ }),
/* 2 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "h", function() { return sellUnwantedItems; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "g", function() { return openMerchantStand; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "d", function() { return closeMerchantStand; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return buyFromPonty; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "j", function() { return transferItemsToMerchant; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "i", function() { return transferGoldToMerchant; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "e", function() { return dismantleItems; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "f", function() { return exchangeItems; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return buyPots; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "c", function() { return buyScrolls; });
/* harmony import */ var _functions__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);

function sellUnwantedItems(itemsToSell) {
    if (parent.character.map == "bank")
        return;
    if (!Object(_functions__WEBPACK_IMPORTED_MODULE_0__[/* findItem */ "c"])("computer")) {
        let foundNPCBuyer = false;
        if (!G.maps[parent.character.map].npcs)
            return;
        for (const npc of G.maps[parent.character.map].npcs.filter(npc => G.npcs[npc.id].role == "merchant")) {
            if (distance(parent.character, {
                x: npc.position[0],
                y: npc.position[1]
            }) < 350) {
                foundNPCBuyer = true;
                break;
            }
        }
        if (!foundNPCBuyer)
            return;
    }
    for (const item of Object(_functions__WEBPACK_IMPORTED_MODULE_0__[/* getInventory */ "j"])()) {
        if (item.p)
            continue;
        if (itemsToSell[item.name]) {
            if (item.level && item.level > itemsToSell[item.name])
                continue;
            item.q ? sell(item.index, item.q) : sell(item.index, 1);
        }
    }
}
function openMerchantStand() {
    const stand = Object(_functions__WEBPACK_IMPORTED_MODULE_0__[/* findItem */ "c"])("stand0");
    if (!stand)
        return;
    if (parent.character.standed === undefined)
        parent.open_merchant(stand.index);
}
function closeMerchantStand() {
    if (parent.character.standed !== undefined)
        parent.close_merchant();
}
function buyFromPonty(itemsToBuy) {
    let foundPonty = false;
    for (const npc of parent.npcs) {
        if (npc.id == "secondhands" && distance(parent.character, {
            x: npc.position[0],
            y: npc.position[1]
        }) < 350) {
            foundPonty = true;
            break;
        }
    }
    if (!foundPonty)
        return;
    let itemsBought = 0;
    parent.socket.once("secondhands", (data) => {
        for (let i = 0; i < data.length; i++) {
            if (itemsToBuy.has(data[i].name)) {
                parent.socket.emit("sbuy", { "rid": data[i].rid });
                if (++itemsBought >= 5)
                    break;
            }
            else if (data[i].p) {
                parent.socket.emit("sbuy", { "rid": data[i].rid });
                if (++itemsBought >= 5)
                    break;
            }
            else if (G.items[data[i].name].upgrade && data[i].level >= 8) {
                parent.socket.emit("sbuy", { "rid": data[i].rid });
                if (++itemsBought >= 5)
                    break;
            }
            else if (G.items[data[i].name].compound && data[i].level >= 4) {
                parent.socket.emit("sbuy", { "rid": data[i].rid });
                if (++itemsBought >= 5)
                    break;
            }
        }
    });
    parent.socket.emit("secondhands");
}
function transferItemsToMerchant(merchantName, itemsToKeep) {
    const merchant = parent.entities[merchantName];
    if (!merchant)
        return;
    if (distance(parent.character, merchant) > 400)
        return;
    const itemsToKeepSet = new Set(itemsToKeep);
    const items = Object(_functions__WEBPACK_IMPORTED_MODULE_0__[/* getInventory */ "j"])();
    items.sort((a, b) => {
        if (a.name < b.name)
            return -1;
        if (a.name > b.name)
            return 1;
        if (a.level > b.level)
            return -1;
    });
    for (const item of items) {
        if (itemsToKeepSet.has(item.name)) {
            itemsToKeepSet.delete(item.name);
            continue;
        }
        if (item.q) {
            send_item(merchantName, item.index, item.q);
        }
        else {
            send_item(merchantName, item.index, 1);
        }
    }
}
function transferGoldToMerchant(merchantName, minimumGold = 0) {
    if (parent.character.gold <= minimumGold)
        return;
    const merchant = parent.entities[merchantName];
    if (!merchant)
        return;
    if (distance(parent.character, merchant) > 400)
        return;
    send_gold(merchantName, parent.character.gold - minimumGold);
}
async function dismantleItems(itemsToDismantle) {
    if (parent.character.map == "bank")
        return;
    if (!Object(_functions__WEBPACK_IMPORTED_MODULE_0__[/* findItem */ "c"])("computer")) {
        let foundGuy = false;
        for (const npc of parent.npcs) {
            if (npc.id == "craftsman" && distance(parent.character, {
                x: npc.position[0],
                y: npc.position[1]
            }) < 250) {
                foundGuy = true;
                break;
            }
        }
        if (!foundGuy)
            return;
    }
    for (const itemName in itemsToDismantle) {
        if (parent.character.gold < G.dismantle[itemName].cost)
            continue;
        for (let itemLevel = itemsToDismantle[itemName]; itemLevel > 0; itemLevel--) {
            const items = Object(_functions__WEBPACK_IMPORTED_MODULE_0__[/* findItemsWithLevel */ "e"])(itemName, itemLevel);
            for (const item of items) {
                parent.socket.emit("dismantle", { num: item.index });
                await Object(_functions__WEBPACK_IMPORTED_MODULE_0__[/* sleep */ "q"])(parent.character.ping);
            }
        }
    }
}
function exchangeItems(itemsToExchange) {
    if (parent.character.q.exchange)
        return;
    if (parent.character.map == "bank")
        return;
    const haveComputer = Object(_functions__WEBPACK_IMPORTED_MODULE_0__[/* findItem */ "c"])("computer");
    const nearbyNPCs = [];
    if (!haveComputer) {
        for (const npc of parent.npcs) {
            if (!npc.position)
                continue;
            if (distance(parent.character, {
                x: npc.position[0],
                y: npc.position[1]
            }) < 250)
                nearbyNPCs.push(npc.id);
        }
        if (!nearbyNPCs.length)
            return;
    }
    const exchangableItems = {};
    for (const item of Object(_functions__WEBPACK_IMPORTED_MODULE_0__[/* getInventory */ "j"])()) {
        const gInfo = G.items[item.name];
        const amountNeeded = gInfo.e;
        if (!amountNeeded || amountNeeded > item.q)
            continue;
        let npc;
        if (gInfo.type == "quest") {
            if (gInfo.quest) {
                npc = G.quests[gInfo.quest].id;
            }
            else {
                npc = "exchange";
            }
        }
        else if (gInfo.type == "box" || gInfo.type == "gem" || gInfo.type == "misc") {
            npc = "exchange";
        }
        else if (item.name == "lostearring" && item.level == 2) {
            npc = "pwincess";
        }
        else {
            continue;
        }
        if (!exchangableItems[npc])
            exchangableItems[npc] = [];
        exchangableItems[npc].push(item);
    }
    for (const npc in exchangableItems) {
        if (!nearbyNPCs.includes(npc) && !haveComputer)
            continue;
        const item = exchangableItems[npc][0];
        exchange(item.index);
        return;
    }
}
async function buyPots() {
    if (parent.character.map == "bank")
        return;
    if (!Object(_functions__WEBPACK_IMPORTED_MODULE_0__[/* findItem */ "c"])("computer")) {
        let foundNPC = false;
        if (!G.maps[parent.character.map].npcs)
            return;
        for (const npc of G.maps[parent.character.map].npcs.filter(npc => npc.id == "fancypots")) {
            if (distance(parent.character, {
                x: npc.position[0],
                y: npc.position[1]
            }) < 350) {
                foundNPC = true;
                break;
            }
        }
        if (!foundNPC)
            return;
    }
    if (parent.character.gold < G.items["mpot1"].g)
        return;
    const itemsToBuy = {
        "mpot1": 9999,
        "hpot1": 9999
    };
    for (const itemName in itemsToBuy) {
        const numberToBuy = itemsToBuy[itemName];
        const numItems = Object(_functions__WEBPACK_IMPORTED_MODULE_0__[/* findItems */ "d"])(itemName).reduce((a, b) => a + b.q, 0);
        if (numItems < numberToBuy) {
            await buy_with_gold(itemName, Math.min(numberToBuy - numItems, parent.character.gold / G.items[itemName].g));
        }
    }
}
async function buyScrolls() {
    if (parent.character.map == "bank")
        return;
    if (!Object(_functions__WEBPACK_IMPORTED_MODULE_0__[/* findItem */ "c"])("computer")) {
        let foundNPC = false;
        if (!G.maps[parent.character.map].npcs)
            return;
        for (const npc of G.maps[parent.character.map].npcs.filter(npc => npc.id == "scrolls")) {
            if (distance(parent.character, {
                x: npc.position[0],
                y: npc.position[1]
            }) < 350) {
                foundNPC = true;
                break;
            }
        }
        if (!foundNPC)
            return;
    }
    if (parent.character.gold < G.items["scroll0"].g)
        return;
    const itemsToBuy = {
        "scroll0": 1000,
        "scroll1": 100,
        "scroll2": 10,
        "cscroll0": 1000,
        "cscroll1": 100,
        "cscroll2": 10
    };
    for (const itemName in itemsToBuy) {
        const numberToBuy = itemsToBuy[itemName];
        const numItems = Object(_functions__WEBPACK_IMPORTED_MODULE_0__[/* findItems */ "d"])(itemName).reduce((a, b) => a + b.q, 0);
        const numCanBuy = Math.min(numberToBuy - numItems, Math.floor(parent.character.gold / G.items[itemName].g));
        if (numItems < numberToBuy && numCanBuy > 0) {
            await buy_with_gold(itemName, numCanBuy);
        }
    }
}


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(module) {/**
 * FastPriorityQueue.js : a fast heap-based priority queue  in JavaScript.
 * (c) the authors
 * Licensed under the Apache License, Version 2.0.
 *
 * Speed-optimized heap-based priority queue for modern browsers and JavaScript engines.
 *
 * Usage :
         Installation (in shell, if you use node):
         $ npm install fastpriorityqueue

         Running test program (in JavaScript):

         // var FastPriorityQueue = require("fastpriorityqueue");// in node
         var x = new FastPriorityQueue();
         x.add(1);
         x.add(0);
         x.add(5);
         x.add(4);
         x.add(3);
         x.peek(); // should return 0, leaves x unchanged
         x.size; // should return 5, leaves x unchanged
         while(!x.isEmpty()) {
           console.log(x.poll());
         } // will print 0 1 3 4 5
         x.trim(); // (optional) optimizes memory usage
 */


var defaultcomparator = function(a, b) {
  return a < b;
};

// the provided comparator function should take a, b and return *true* when a < b
function FastPriorityQueue(comparator) {
  if (!(this instanceof FastPriorityQueue)) return new FastPriorityQueue(comparator);
  this.array = [];
  this.size = 0;
  this.compare = comparator || defaultcomparator;
}

// copy the priority queue into another, and return it. Queue items are shallow-copied.
// Runs in `O(n)` time.
FastPriorityQueue.prototype.clone = function() {
  var fpq = new FastPriorityQueue(this.compare);
  fpq.size = this.size;
  for (var i = 0; i < this.size; i++) {
    fpq.array.push(this.array[i]);
  }
  return fpq;
};

// Add an element into the queue
// runs in O(log n) time
FastPriorityQueue.prototype.add = function(myval) {
  var i = this.size;
  this.array[this.size] = myval;
  this.size += 1;
  var p;
  var ap;
  while (i > 0) {
    p = (i - 1) >> 1;
    ap = this.array[p];
    if (!this.compare(myval, ap)) {
      break;
    }
    this.array[i] = ap;
    i = p;
  }
  this.array[i] = myval;
};

// replace the content of the heap by provided array and "heapify it"
FastPriorityQueue.prototype.heapify = function(arr) {
  this.array = arr;
  this.size = arr.length;
  var i;
  for (i = this.size >> 1; i >= 0; i--) {
    this._percolateDown(i);
  }
};

// for internal use
FastPriorityQueue.prototype._percolateUp = function(i, force) {
  var myval = this.array[i];
  var p;
  var ap;
  while (i > 0) {
    p = (i - 1) >> 1;
    ap = this.array[p];
    // force will skip the compare
    if (!force && !this.compare(myval, ap)) {
      break;
    }
    this.array[i] = ap;
    i = p;
  }
  this.array[i] = myval;
};

// for internal use
FastPriorityQueue.prototype._percolateDown = function(i) {
  var size = this.size;
  var hsize = this.size >>> 1;
  var ai = this.array[i];
  var l;
  var r;
  var bestc;
  while (i < hsize) {
    l = (i << 1) + 1;
    r = l + 1;
    bestc = this.array[l];
    if (r < size) {
      if (this.compare(this.array[r], bestc)) {
        l = r;
        bestc = this.array[r];
      }
    }
    if (!this.compare(bestc, ai)) {
      break;
    }
    this.array[i] = bestc;
    i = l;
  }
  this.array[i] = ai;
};

// internal
// _removeAt(index) will remove the item at the given index from the queue,
// retaining balance. returns the removed item, or undefined if nothing is removed.
FastPriorityQueue.prototype._removeAt = function(index) {
  if (index > this.size - 1 || index < 0) return undefined;

  // impl1:
  //this.array.splice(index, 1);
  //this.heapify(this.array);
  // impl2:
  this._percolateUp(index, true);
  return this.poll();
};

// remove(myval) will remove an item matching the provided value from the
// queue, checked for equality by using the queue's comparator.
// return true if removed, false otherwise.
FastPriorityQueue.prototype.remove = function(myval) {
  for (var i = 0; i < this.size; i++) {
    if (!this.compare(this.array[i], myval) && !this.compare(myval, this.array[i])) {
      // items match, comparator returns false both ways, remove item
      this._removeAt(i);
      return true;
    }
  }
  return false;
};

// internal
// removes and returns items for which the callback returns true.
FastPriorityQueue.prototype._batchRemove = function(callback, limit) {
  // initialize return array with max size of the limit or current queue size
  var retArr = new Array(limit ? limit : this.size);
  var count = 0;

  if (typeof callback === 'function' && this.size) {
    var i = 0;
    while (i < this.size && count < retArr.length) {
      if (callback(this.array[i])) {
        retArr[count] = this._removeAt(i);
        count++;
        // move up a level in the heap if we remove an item
        i = i >> 1;
      } else {
        i++;
      }
    } 
  }
  retArr.length = count;
  return retArr;
}

// removeOne(callback) will execute the callback function for each item of the queue
// and will remove the first item for which the callback will return true.
// return the removed item, or undefined if nothing is removed.
FastPriorityQueue.prototype.removeOne = function(callback) {
  var arr = this._batchRemove(callback, 1);
  return arr.length > 0 ? arr[0] : undefined;
};

// remove(callback[, limit]) will execute the callback function for each item of
// the queue and will remove each item for which the callback returns true, up to
// a max limit of removed items if specified or no limit if unspecified.
// return an array containing the removed items.
FastPriorityQueue.prototype.removeMany = function(callback, limit) {
  return this._batchRemove(callback, limit);
};

// Look at the top of the queue (one of the smallest elements) without removing it
// executes in constant time
//
// Calling peek on an empty priority queue returns
// the "undefined" value.
// https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/undefined
//
FastPriorityQueue.prototype.peek = function() {
  if (this.size == 0) return undefined;
  return this.array[0];
};

// remove the element on top of the heap (one of the smallest elements)
// runs in logarithmic time
//
// If the priority queue is empty, the function returns the
// "undefined" value.
// https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/undefined
//
// For long-running and large priority queues, or priority queues
// storing large objects, you may  want to call the trim function
// at strategic times to recover allocated memory.
FastPriorityQueue.prototype.poll = function() {
  if (this.size == 0) return undefined;
  var ans = this.array[0];
  if (this.size > 1) {
    this.array[0] = this.array[--this.size];
    this._percolateDown(0);
  } else {
    this.size -= 1;
  }
  return ans;
};

// This function adds the provided value to the heap, while removing
// and returning one of the smallest elements (like poll). The size of the queue
// thus remains unchanged.
FastPriorityQueue.prototype.replaceTop = function(myval) {
  if (this.size == 0) return undefined;
  var ans = this.array[0];
  this.array[0] = myval;
  this._percolateDown(0);
  return ans;
};

// recover unused memory (for long-running priority queues)
FastPriorityQueue.prototype.trim = function() {
  this.array = this.array.slice(0, this.size);
};

// Check whether the heap is empty
FastPriorityQueue.prototype.isEmpty = function() {
  return this.size === 0;
};

// iterate over the items in order, pass a callback that receives (item, index) as args.
// TODO once we transpile, uncomment
// if (Symbol && Symbol.iterator) {
//   FastPriorityQueue.prototype[Symbol.iterator] = function*() {
//     if (this.isEmpty()) return;
//     var fpq = this.clone();
//     while (!fpq.isEmpty()) {
//       yield fpq.poll();
//     }
//   };
// }
FastPriorityQueue.prototype.forEach = function(callback) {
  if (this.isEmpty() || typeof callback != 'function') return;
  var i = 0;
  var fpq = this.clone();
  while (!fpq.isEmpty()) {
    callback(fpq.poll(), i++);
  }
};

// return the k 'smallest' elements of the queue
// runs in O(k log k) time
// this is the equivalent of repeatedly calling poll, but
// it has a better computational complexity, which can be
// important for large data sets.
FastPriorityQueue.prototype.kSmallest = function(k) {
  if (this.size == 0) return [];
  var comparator = this.compare;
  var arr = this.array
  var fpq = new FastPriorityQueue(function(a,b){
   return comparator(arr[a],arr[b]);
  });
  k = Math.min(this.size, k);
  var smallest = new Array(k);
  var j = 0;
  fpq.add(0);
  while (j < k) {
    var small = fpq.poll();
    smallest[j++] = this.array[small];
    var l = (small << 1) + 1;
    var r = l + 1;
    if (l < this.size) fpq.add(l);
    if (r < this.size) fpq.add(r);
  }
  return smallest;
}

// just for illustration purposes
var main = function() {
  // main code
  var x = new FastPriorityQueue(function(a, b) {
    return a < b;
  });
  x.add(1);
  x.add(0);
  x.add(5);
  x.add(4);
  x.add(3);
  while (!x.isEmpty()) {
    console.log(x.poll());
  }
};

if (__webpack_require__.c[__webpack_require__.s] === module) {
  main();
}

module.exports = FastPriorityQueue;

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(11)(module)))

/***/ }),
/* 4 */
/***/ (function(module, exports) {

/**
 * Based on https://github.com/mourner/tinyqueue
 * Copyright (c) 2017, Vladimir Agafonkin https://github.com/mourner/tinyqueue/blob/master/LICENSE
 * 
 * Adapted for PathFinding needs by @anvaka
 * Copyright (c) 2017, Andrei Kashcha
 */
module.exports = NodeHeap;

function NodeHeap(data, options) {
  if (!(this instanceof NodeHeap)) return new NodeHeap(data, options);

  if (!Array.isArray(data)) {
    // assume first argument is our config object;
    options = data;
    data = [];
  }

  options = options || {};

  this.data = data || [];
  this.length = this.data.length;
  this.compare = options.compare || defaultCompare;
  this.setNodeId = options.setNodeId || noop;

  if (this.length > 0) {
    for (var i = (this.length >> 1); i >= 0; i--) this._down(i);
  }

  if (options.setNodeId) {
    for (var i = 0; i < this.length; ++i) {
      this.setNodeId(this.data[i], i);
    }
  }
}

function noop() {}

function defaultCompare(a, b) {
  return a - b;
}

NodeHeap.prototype = {

  push: function (item) {
    this.data.push(item);
    this.setNodeId(item, this.length);
    this.length++;
    this._up(this.length - 1);
  },

  pop: function () {
    if (this.length === 0) return undefined;

    var top = this.data[0];
    this.length--;

    if (this.length > 0) {
      this.data[0] = this.data[this.length];
      this.setNodeId(this.data[0], 0);
      this._down(0);
    }
    this.data.pop();

    return top;
  },

  peek: function () {
    return this.data[0];
  },

  updateItem: function (pos) {
    this._down(pos);
    this._up(pos);
  },

  _up: function (pos) {
    var data = this.data;
    var compare = this.compare;
    var setNodeId = this.setNodeId;
    var item = data[pos];

    while (pos > 0) {
      var parent = (pos - 1) >> 1;
      var current = data[parent];
      if (compare(item, current) >= 0) break;
        data[pos] = current;

       setNodeId(current, pos);
       pos = parent;
    }

    data[pos] = item;
    setNodeId(item, pos);
  },

  _down: function (pos) {
    var data = this.data;
    var compare = this.compare;
    var halfLength = this.length >> 1;
    var item = data[pos];
    var setNodeId = this.setNodeId;

    while (pos < halfLength) {
      var left = (pos << 1) + 1;
      var right = left + 1;
      var best = data[left];

      if (right < this.length && compare(data[right], best) < 0) {
        left = right;
        best = data[right];
      }
      if (compare(best, item) >= 0) break;

      data[pos] = best;
      setNodeId(best, pos);
      pos = left;
    }

    data[pos] = item;
    setNodeId(item, pos);
  }
};

/***/ }),
/* 5 */
/***/ (function(module, exports) {

module.exports = {
  l2: l2,
  l1: l1
};

/**
 * Euclid distance (l2 norm);
 * 
 * @param {*} a 
 * @param {*} b 
 */
function l2(a, b) {
  var dx = a.x - b.x;
  var dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Manhattan distance (l1 norm);
 * @param {*} a 
 * @param {*} b 
 */
function l1(a, b) {
  var dx = a.x - b.x;
  var dy = a.y - b.y;
  return Math.abs(dx) + Math.abs(dy);
}


/***/ }),
/* 6 */
/***/ (function(module, exports) {

// We reuse instance of array, but we trie to freeze it as well,
// so that consumers don't modify it. Maybe it's a bad idea.
var NO_PATH = [];
if (typeof Object.freeze === 'function') Object.freeze(NO_PATH);

module.exports = {
  // Path search settings
  heuristic: blindHeuristic,
  distance: constantDistance,
  compareFScore: compareFScore,
  NO_PATH: NO_PATH,

  // heap settings
  setHeapIndex: setHeapIndex,

  // nba:
  setH1: setH1,
  setH2: setH2,
  compareF1Score: compareF1Score,
  compareF2Score: compareF2Score,
}

function blindHeuristic(/* a, b */) {
  // blind heuristic makes this search equal to plain Dijkstra path search.
  return 0;
}

function constantDistance(/* a, b */) {
  return 1;
}

function compareFScore(a, b) {
  var result = a.fScore - b.fScore;
  // TODO: Can I improve speed with smarter ties-breaking?
  // I tried distanceToSource, but it didn't seem to have much effect
  return result;
}

function setHeapIndex(nodeSearchState, heapIndex) {
  nodeSearchState.heapIndex = heapIndex;
}

function compareF1Score(a, b) {
  return a.f1 - b.f1;
}

function compareF2Score(a, b) {
  return a.f2 - b.f2;
}

function setH1(node, heapIndex) {
  node.h1 = heapIndex;
}

function setH2(node, heapIndex) {
  node.h2 = heapIndex;
}

/***/ }),
/* 7 */
/***/ (function(module, exports) {

/**
 * This class represents a single search node in the exploration tree for
 * A* algorithm.
 * 
 * @param {Object} node  original node in the graph
 */
function NodeSearchState(node) {
  this.node = node;

  // How we came to this node?
  this.parent = null;

  this.closed = false;
  this.open = 0;

  this.distanceToSource = Number.POSITIVE_INFINITY;
  // the f(n) = g(n) + h(n) value
  this.fScore = Number.POSITIVE_INFINITY;

  // used to reconstruct heap when fScore is updated.
  this.heapIndex = -1;
};

function makeSearchStatePool() {
  var currentInCache = 0;
  var nodeCache = [];

  return {
    createNewState: createNewState,
    reset: reset
  };

  function reset() {
    currentInCache = 0;
  }

  function createNewState(node) {
    var cached = nodeCache[currentInCache];
    if (cached) {
      // TODO: This almost duplicates constructor code. Not sure if
      // it would impact performance if I move this code into a function
      cached.node = node;
      // How we came to this node?
      cached.parent = null;

      cached.closed = false;
      cached.open = 0;

      cached.distanceToSource = Number.POSITIVE_INFINITY;
      // the f(n) = g(n) + h(n) value
      cached.fScore = Number.POSITIVE_INFINITY;

      // used to reconstruct heap when fScore is updated.
      cached.heapIndex = -1;

    } else {
      cached = new NodeSearchState(node);
      nodeCache[currentInCache] = cached;
    }
    currentInCache++;
    return cached;
  }
}
module.exports = makeSearchStatePool;

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * @fileOverview Contains definition of the core graph object.
 */

// TODO: need to change storage layer:
// 1. Be able to get all nodes O(1)
// 2. Be able to get number of links O(1)

/**
 * @example
 *  var graph = require('ngraph.graph')();
 *  graph.addNode(1);     // graph has one node.
 *  graph.addLink(2, 3);  // now graph contains three nodes and one link.
 *
 */
module.exports = createGraph;

var eventify = __webpack_require__(12);

/**
 * Creates a new graph
 */
function createGraph(options) {
  // Graph structure is maintained as dictionary of nodes
  // and array of links. Each node has 'links' property which
  // hold all links related to that node. And general links
  // array is used to speed up all links enumeration. This is inefficient
  // in terms of memory, but simplifies coding.
  options = options || {};
  if ('uniqueLinkId' in options) {
    console.warn(
      'ngraph.graph: Starting from version 0.14 `uniqueLinkId` is deprecated.\n' +
      'Use `multigraph` option instead\n',
      '\n',
      'Note: there is also change in default behavior: From now on each graph\n'+
      'is considered to be not a multigraph by default (each edge is unique).'
    );

    options.multigraph = options.uniqueLinkId;
  }

  // Dear reader, the non-multigraphs do not guarantee that there is only
  // one link for a given pair of node. When this option is set to false
  // we can save some memory and CPU (18% faster for non-multigraph);
  if (options.multigraph === undefined) options.multigraph = false;

  if (typeof Map !== 'function') {
    // TODO: Should we polyfill it ourselves? We don't use much operations there..
    throw new Error('ngraph.graph requires `Map` to be defined. Please polyfill it before using ngraph');
  } 

  var nodes = new Map();
  var links = [],
    // Hash of multi-edges. Used to track ids of edges between same nodes
    multiEdges = {},
    suspendEvents = 0,

    createLink = options.multigraph ? createUniqueLink : createSingleLink,

    // Our graph API provides means to listen to graph changes. Users can subscribe
    // to be notified about changes in the graph by using `on` method. However
    // in some cases they don't use it. To avoid unnecessary memory consumption
    // we will not record graph changes until we have at least one subscriber.
    // Code below supports this optimization.
    //
    // Accumulates all changes made during graph updates.
    // Each change element contains:
    //  changeType - one of the strings: 'add', 'remove' or 'update';
    //  node - if change is related to node this property is set to changed graph's node;
    //  link - if change is related to link this property is set to changed graph's link;
    changes = [],
    recordLinkChange = noop,
    recordNodeChange = noop,
    enterModification = noop,
    exitModification = noop;

  // this is our public API:
  var graphPart = {
    /**
     * Adds node to the graph. If node with given id already exists in the graph
     * its data is extended with whatever comes in 'data' argument.
     *
     * @param nodeId the node's identifier. A string or number is preferred.
     * @param [data] additional data for the node being added. If node already
     *   exists its data object is augmented with the new one.
     *
     * @return {node} The newly added node or node with given id if it already exists.
     */
    addNode: addNode,

    /**
     * Adds a link to the graph. The function always create a new
     * link between two nodes. If one of the nodes does not exists
     * a new node is created.
     *
     * @param fromId link start node id;
     * @param toId link end node id;
     * @param [data] additional data to be set on the new link;
     *
     * @return {link} The newly created link
     */
    addLink: addLink,

    /**
     * Removes link from the graph. If link does not exist does nothing.
     *
     * @param link - object returned by addLink() or getLinks() methods.
     *
     * @returns true if link was removed; false otherwise.
     */
    removeLink: removeLink,

    /**
     * Removes node with given id from the graph. If node does not exist in the graph
     * does nothing.
     *
     * @param nodeId node's identifier passed to addNode() function.
     *
     * @returns true if node was removed; false otherwise.
     */
    removeNode: removeNode,

    /**
     * Gets node with given identifier. If node does not exist undefined value is returned.
     *
     * @param nodeId requested node identifier;
     *
     * @return {node} in with requested identifier or undefined if no such node exists.
     */
    getNode: getNode,

    /**
     * Gets number of nodes in this graph.
     *
     * @return number of nodes in the graph.
     */
    getNodeCount: getNodeCount,

    /**
     * Gets total number of links in the graph.
     */
    getLinkCount: getLinkCount,

    /**
     * Synonym for `getLinkCount()`
     */
    getLinksCount: getLinkCount,
    
    /**
     * Synonym for `getNodeCount()`
     */
    getNodesCount: getNodeCount,

    /**
     * Gets all links (inbound and outbound) from the node with given id.
     * If node with given id is not found null is returned.
     *
     * @param nodeId requested node identifier.
     *
     * @return Array of links from and to requested node if such node exists;
     *   otherwise null is returned.
     */
    getLinks: getLinks,

    /**
     * Invokes callback on each node of the graph.
     *
     * @param {Function(node)} callback Function to be invoked. The function
     *   is passed one argument: visited node.
     */
    forEachNode: forEachNode,

    /**
     * Invokes callback on every linked (adjacent) node to the given one.
     *
     * @param nodeId Identifier of the requested node.
     * @param {Function(node, link)} callback Function to be called on all linked nodes.
     *   The function is passed two parameters: adjacent node and link object itself.
     * @param oriented if true graph treated as oriented.
     */
    forEachLinkedNode: forEachLinkedNode,

    /**
     * Enumerates all links in the graph
     *
     * @param {Function(link)} callback Function to be called on all links in the graph.
     *   The function is passed one parameter: graph's link object.
     *
     * Link object contains at least the following fields:
     *  fromId - node id where link starts;
     *  toId - node id where link ends,
     *  data - additional data passed to graph.addLink() method.
     */
    forEachLink: forEachLink,

    /**
     * Suspend all notifications about graph changes until
     * endUpdate is called.
     */
    beginUpdate: enterModification,

    /**
     * Resumes all notifications about graph changes and fires
     * graph 'changed' event in case there are any pending changes.
     */
    endUpdate: exitModification,

    /**
     * Removes all nodes and links from the graph.
     */
    clear: clear,

    /**
     * Detects whether there is a link between two nodes.
     * Operation complexity is O(n) where n - number of links of a node.
     * NOTE: this function is synonim for getLink()
     *
     * @returns link if there is one. null otherwise.
     */
    hasLink: getLink,

    /**
     * Detects whether there is a node with given id
     * 
     * Operation complexity is O(1)
     * NOTE: this function is synonim for getNode()
     *
     * @returns node if there is one; Falsy value otherwise.
     */
    hasNode: getNode,

    /**
     * Gets an edge between two nodes.
     * Operation complexity is O(n) where n - number of links of a node.
     *
     * @param {string} fromId link start identifier
     * @param {string} toId link end identifier
     *
     * @returns link if there is one. null otherwise.
     */
    getLink: getLink
  };

  // this will add `on()` and `fire()` methods.
  eventify(graphPart);

  monitorSubscribers();

  return graphPart;

  function monitorSubscribers() {
    var realOn = graphPart.on;

    // replace real `on` with our temporary on, which will trigger change
    // modification monitoring:
    graphPart.on = on;

    function on() {
      // now it's time to start tracking stuff:
      graphPart.beginUpdate = enterModification = enterModificationReal;
      graphPart.endUpdate = exitModification = exitModificationReal;
      recordLinkChange = recordLinkChangeReal;
      recordNodeChange = recordNodeChangeReal;

      // this will replace current `on` method with real pub/sub from `eventify`.
      graphPart.on = realOn;
      // delegate to real `on` handler:
      return realOn.apply(graphPart, arguments);
    }
  }

  function recordLinkChangeReal(link, changeType) {
    changes.push({
      link: link,
      changeType: changeType
    });
  }

  function recordNodeChangeReal(node, changeType) {
    changes.push({
      node: node,
      changeType: changeType
    });
  }

  function addNode(nodeId, data) {
    if (nodeId === undefined) {
      throw new Error('Invalid node identifier');
    }

    enterModification();

    var node = getNode(nodeId);
    if (!node) {
      node = new Node(nodeId, data);
      recordNodeChange(node, 'add');
    } else {
      node.data = data;
      recordNodeChange(node, 'update');
    }

    nodes.set(nodeId, node);

    exitModification();
    return node;
  }

  function getNode(nodeId) {
    return nodes.get(nodeId);
  }

  function removeNode(nodeId) {
    var node = getNode(nodeId);
    if (!node) {
      return false;
    }

    enterModification();

    var prevLinks = node.links;
    if (prevLinks) {
      node.links = null;
      for(var i = 0; i < prevLinks.length; ++i) {
        removeLink(prevLinks[i]);
      }
    }

    nodes.delete(nodeId)

    recordNodeChange(node, 'remove');

    exitModification();

    return true;
  }


  function addLink(fromId, toId, data) {
    enterModification();

    var fromNode = getNode(fromId) || addNode(fromId);
    var toNode = getNode(toId) || addNode(toId);

    var link = createLink(fromId, toId, data);

    links.push(link);

    // TODO: this is not cool. On large graphs potentially would consume more memory.
    addLinkToNode(fromNode, link);
    if (fromId !== toId) {
      // make sure we are not duplicating links for self-loops
      addLinkToNode(toNode, link);
    }

    recordLinkChange(link, 'add');

    exitModification();

    return link;
  }

  function createSingleLink(fromId, toId, data) {
    var linkId = makeLinkId(fromId, toId);
    return new Link(fromId, toId, data, linkId);
  }

  function createUniqueLink(fromId, toId, data) {
    // TODO: Get rid of this method.
    var linkId = makeLinkId(fromId, toId);
    var isMultiEdge = multiEdges.hasOwnProperty(linkId);
    if (isMultiEdge || getLink(fromId, toId)) {
      if (!isMultiEdge) {
        multiEdges[linkId] = 0;
      }
      var suffix = '@' + (++multiEdges[linkId]);
      linkId = makeLinkId(fromId + suffix, toId + suffix);
    }

    return new Link(fromId, toId, data, linkId);
  }

  function getNodeCount() {
    return nodes.size;
  }

  function getLinkCount() {
    return links.length;
  }

  function getLinks(nodeId) {
    var node = getNode(nodeId);
    return node ? node.links : null;
  }

  function removeLink(link) {
    if (!link) {
      return false;
    }
    var idx = indexOfElementInArray(link, links);
    if (idx < 0) {
      return false;
    }

    enterModification();

    links.splice(idx, 1);

    var fromNode = getNode(link.fromId);
    var toNode = getNode(link.toId);

    if (fromNode) {
      idx = indexOfElementInArray(link, fromNode.links);
      if (idx >= 0) {
        fromNode.links.splice(idx, 1);
      }
    }

    if (toNode) {
      idx = indexOfElementInArray(link, toNode.links);
      if (idx >= 0) {
        toNode.links.splice(idx, 1);
      }
    }

    recordLinkChange(link, 'remove');

    exitModification();

    return true;
  }

  function getLink(fromNodeId, toNodeId) {
    // TODO: Use sorted links to speed this up
    var node = getNode(fromNodeId),
      i;
    if (!node || !node.links) {
      return null;
    }

    for (i = 0; i < node.links.length; ++i) {
      var link = node.links[i];
      if (link.fromId === fromNodeId && link.toId === toNodeId) {
        return link;
      }
    }

    return null; // no link.
  }

  function clear() {
    enterModification();
    forEachNode(function(node) {
      removeNode(node.id);
    });
    exitModification();
  }

  function forEachLink(callback) {
    var i, length;
    if (typeof callback === 'function') {
      for (i = 0, length = links.length; i < length; ++i) {
        callback(links[i]);
      }
    }
  }

  function forEachLinkedNode(nodeId, callback, oriented) {
    var node = getNode(nodeId);

    if (node && node.links && typeof callback === 'function') {
      if (oriented) {
        return forEachOrientedLink(node.links, nodeId, callback);
      } else {
        return forEachNonOrientedLink(node.links, nodeId, callback);
      }
    }
  }

  function forEachNonOrientedLink(links, nodeId, callback) {
    var quitFast;
    for (var i = 0; i < links.length; ++i) {
      var link = links[i];
      var linkedNodeId = link.fromId === nodeId ? link.toId : link.fromId;

      quitFast = callback(nodes.get(linkedNodeId), link);
      if (quitFast) {
        return true; // Client does not need more iterations. Break now.
      }
    }
  }

  function forEachOrientedLink(links, nodeId, callback) {
    var quitFast;
    for (var i = 0; i < links.length; ++i) {
      var link = links[i];
      if (link.fromId === nodeId) {
        quitFast = callback(nodes.get(link.toId), link)
        if (quitFast) {
          return true; // Client does not need more iterations. Break now.
        }
      }
    }
  }

  // we will not fire anything until users of this library explicitly call `on()`
  // method.
  function noop() {}

  // Enter, Exit modification allows bulk graph updates without firing events.
  function enterModificationReal() {
    suspendEvents += 1;
  }

  function exitModificationReal() {
    suspendEvents -= 1;
    if (suspendEvents === 0 && changes.length > 0) {
      graphPart.fire('changed', changes);
      changes.length = 0;
    }
  }

  function forEachNode(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Function is expected to iterate over graph nodes. You passed ' + callback);
    }

    var valuesIterator = nodes.values();
    var nextValue = valuesIterator.next();
    while (!nextValue.done) {
      if (callback(nextValue.value)) {
        return true; // client doesn't want to proceed. Return.
      }
      nextValue = valuesIterator.next();
    }
  }
}

// need this for old browsers. Should this be a separate module?
function indexOfElementInArray(element, array) {
  if (!array) return -1;

  if (array.indexOf) {
    return array.indexOf(element);
  }

  var len = array.length,
    i;

  for (i = 0; i < len; i += 1) {
    if (array[i] === element) {
      return i;
    }
  }

  return -1;
}

/**
 * Internal structure to represent node;
 */
function Node(id, data) {
  this.id = id;
  this.links = null;
  this.data = data;
}

function addLinkToNode(node, link) {
  if (node.links) {
    node.links.push(link);
  } else {
    node.links = [link];
  }
}

/**
 * Internal structure to represent links;
 */
function Link(fromId, toId, data, id) {
  this.fromId = fromId;
  this.toId = toId;
  this.data = data;
  this.id = id;
}

function makeLinkId(fromId, toId) {
  return fromId.toString() + '👉 ' + toId.toString();
}


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = {
  aStar: __webpack_require__(13),
  aGreedy: __webpack_require__(14),
  nba: __webpack_require__(15),
}


/***/ }),
/* 10 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, "a", function() { return /* binding */ character_Character; });

// EXTERNAL MODULE: ./node_modules/fastpriorityqueue/FastPriorityQueue.js
var FastPriorityQueue = __webpack_require__(3);
var FastPriorityQueue_default = /*#__PURE__*/__webpack_require__.n(FastPriorityQueue);

// EXTERNAL MODULE: ./source/functions.ts
var functions = __webpack_require__(0);

// EXTERNAL MODULE: ./source/trade.ts
var trade = __webpack_require__(2);

// CONCATENATED MODULE: ./source/astarsmartmove.ts


class astarsmartmove_AStarSmartMove {
    constructor() {
        this.TOWN_MOVEMENT_COST = 250;
        this.DOOR_TOLERANCE = 40 - 2;
        this.TELEPORT_TOLERANCE = 75 - 2;
        this.MOVE_TOLERANCE = 1;
        this.TOWN_TOLERANCE = 1;
        this.SLEEP_AFTER_MS = 500;
        this.SLEEP_FOR_MS = 50;
        this.FINISH_CHECK_DISTANCE = 200;
        this.MOVEMENTS = [
            [[0, 25], [0, 5]],
            [[25, 0], [5, 0]],
            [[0, -25], [0, -5]],
            [[-25, 0], [-5, 0]]
        ];
        this.USE_BLINK = true;
        this.MOVE_ON_FAIL = false;
        this.SHOW_MESSAGES = false;
        this.MESSAGE_COLOR = "#F7600E";
        this.doorCache = new Map();
    }
    isMoving() {
        return this.finishedDate == undefined && this.startDate != undefined;
    }
    wasCancelled(start) {
        return (!this.startDate || start < this.startDate);
    }
    stop() {
        this.reset();
        if (parent.character.c.town)
            stop("town");
        stop();
    }
    reset() {
        this.finishedDate = undefined;
        this.startDate = undefined;
    }
    cleanPosition(position) {
        const x = (position.real_x !== undefined ? position.real_x : position.x);
        const y = (position.real_y !== undefined ? position.real_y : position.y);
        const clean = {
            map: position.map,
            x: x,
            y: y,
            key: `${position.map}.${x}.${y}`,
            transportS: position.transportS,
            transportMap: position.transportMap,
            transportType: position.transportType
        };
        return clean;
    }
    positionToString(position) {
        return `${position.map}.${position.x}.${position.y}`;
    }
    stringToPosition(positionString) {
        const s = positionString.split(".");
        const map = s[0];
        const x = Number.parseFloat(s[1]);
        const y = Number.parseFloat(s[2]);
        return {
            map: map,
            x: x,
            real_x: x,
            y: y,
            real_y: y
        };
    }
    findDoorPath(position, destination, visitedNodes = new Set(), visitedMaps = new Set()) {
        visitedNodes.add(position);
        if (position.map == destination.map) {
            const d = distance(position, destination);
            const path = [];
            for (const door of visitedNodes) {
                path.push(door);
            }
            path.push(destination);
            return [d, path];
        }
        const doors = [...G.maps[position.map].doors];
        for (const npc of G.maps[position.map].npcs) {
            if (npc.id !== "transporter")
                continue;
            for (const map in G.npcs.transporter.places) {
                if (map == position.map)
                    continue;
                doors.push([npc.position[0], npc.position[1], -1, -1, map, G.npcs.transporter.places[map]]);
            }
            break;
        }
        let currentBestDistance = Number.MAX_VALUE;
        let currentBestPath;
        for (const door of doors) {
            const doorExitMap = door[4];
            if (visitedMaps.has(doorExitMap))
                continue;
            if (door[7] || door[8])
                continue;
            const doorEntrance = { map: position.map, x: door[0], y: door[1], key: `${position.map}.${door[0]}.${door[1]}`, transportS: door[5], transportMap: doorExitMap, transportType: door[3] == -1 ? "teleport" : "door" };
            const doorExit = { map: doorExitMap, x: G.maps[doorExitMap].spawns[door[5]][0], y: G.maps[doorExitMap].spawns[door[5]][1], key: `${doorExitMap}.${G.maps[doorExitMap].spawns[door[5]][0]}.${G.maps[doorExitMap].spawns[door[5]][1]}` };
            const newVisitedMaps = new Set(visitedMaps);
            newVisitedMaps.add(doorExitMap);
            const newVisitedDoors = new Set(visitedNodes);
            newVisitedDoors.add(doorEntrance);
            const d = distance(position, doorEntrance) + 50;
            if (currentBestDistance < d)
                continue;
            const [d2, path] = this.findDoorPath(doorExit, destination, newVisitedDoors, newVisitedMaps);
            if (currentBestDistance > d2 + d) {
                currentBestDistance = d2 + d;
                currentBestPath = path;
            }
        }
        return [currentBestDistance, currentBestPath];
    }
    heuristic(position, finish) {
        return distance(position, finish);
    }
    smoothPath(path) {
        let newPath = [];
        newPath.push(path[0]);
        for (let i = 0; i < path.length - 1; i++) {
            const iPath = path[i];
            if (iPath.transportType == "town") {
                newPath.push(iPath);
                break;
            }
            let canWalkTo = i + 1;
            for (let j = i + 1; j < path.length; j++) {
                const jPath = path[j];
                if (can_move({
                    map: iPath.map,
                    x: jPath.x,
                    y: jPath.y,
                    going_x: iPath.x,
                    going_y: iPath.y,
                    base: parent.character.base
                })) {
                    canWalkTo = j;
                    i = j - 1;
                }
            }
            if (canWalkTo > 0)
                newPath.push(path[canWalkTo]);
        }
        newPath = newPath.reverse();
        return newPath;
    }
    reconstructPath(current, finish, cameFrom) {
        const path = [];
        path.push({
            map: finish.map,
            x: finish.x,
            real_x: finish.x,
            y: finish.y,
            real_y: finish.y,
            key: `${finish.map}.${finish.x}.${finish.y}`,
            transportMap: finish.transportMap,
            transportType: finish.transportType,
            transportS: finish.transportS
        });
        while (current) {
            path.push({
                map: current.map,
                x: current.x,
                real_x: current.x,
                y: current.y,
                real_y: current.y,
                key: `${current.map}.${current.x}.${current.y}`,
                transportMap: current.transportMap,
                transportType: current.transportType,
                transportS: current.transportS
            });
            current = cameFrom.get(current.key);
        }
        return this.smoothPath(path);
    }
    async smartMove(destination, finishDistanceTolerance = 0) {
        this.reset();
        this.startDate = new Date();
        let movements = [];
        const start = Date.now();
        if (this.SHOW_MESSAGES)
            game_log("a* - start searching", this.MESSAGE_COLOR);
        const doors = this.findDoorPath(this.cleanPosition(parent.character), this.cleanPosition(destination))[1];
        for (let i = 0; i < doors.length; i += 2) {
            const from = doors[i];
            const to = doors[i + 1];
            const doorCacheKey = `${from.key}_${to.key}`;
            let subMovements;
            if (this.doorCache.has(doorCacheKey)) {
                subMovements = this.doorCache.get(doorCacheKey);
            }
            else {
                if (to.transportType == "door") {
                    subMovements = await this.getMovements(from, to, this.DOOR_TOLERANCE);
                }
                else if (to.transportType == "teleport") {
                    subMovements = await this.getMovements(from, to, this.TELEPORT_TOLERANCE);
                }
                else {
                    subMovements = await this.getMovements(from, to, finishDistanceTolerance);
                }
                this.doorCache.set(doorCacheKey, subMovements);
            }
            movements = movements.concat(subMovements);
        }
        if (this.SHOW_MESSAGES)
            game_log(`a* - finish searching (${((Date.now() - start) / 1000).toFixed(1)} s)`, this.MESSAGE_COLOR);
        let i = 0;
        const movementComplete = new Promise((resolve, reject) => {
            const movementLoop = (start) => {
                if (this.wasCancelled(start)) {
                    stop();
                    return reject("a* - cancelled moving");
                }
                const nextMove = movements[i];
                if (distance(parent.character, movements[movements.length - 1]) < this.MOVE_TOLERANCE) {
                    if (this.SHOW_MESSAGES)
                        game_log("a* - done moving", this.MESSAGE_COLOR);
                    this.finishedDate = new Date();
                    resolve();
                    return;
                }
                if (parent.character.moving || is_transporting(parent.character) || !can_walk(parent.character)) {
                }
                else if (nextMove.map == parent.character.map && this.USE_BLINK && can_use("blink") && distance(parent.character, nextMove) > this.TOWN_MOVEMENT_COST && parent.character.mp > G.skills.blink.mp) {
                    let j = i;
                    for (; j < movements.length; j++) {
                        if (movements[j].map !== parent.character.map) {
                            break;
                        }
                    }
                    i = j - 1;
                    setTimeout(() => { movementLoop(start); }, 900);
                    use_skill("blink", [movements[i].x, movements[i].y]);
                    return;
                }
                else if (nextMove.map == parent.character.map && nextMove.transportType == "town") {
                    if (distance(parent.character, nextMove) < this.TOWN_TOLERANCE) {
                        i += 1;
                        movementLoop(start);
                        return;
                    }
                    else {
                        setTimeout(() => { movementLoop(start); }, 900);
                        use_skill("town");
                        return;
                    }
                }
                else if (parent.character.map == nextMove.map && can_move_to(nextMove.x, nextMove.y)) {
                    if (distance(parent.character, nextMove) < this.MOVE_TOLERANCE) {
                        if (nextMove.transportType == "door" || nextMove.transportType == "teleport") {
                            if (parent.character.map == nextMove.map) {
                                transport(nextMove.transportMap, nextMove.transportS);
                                i += 1;
                                setTimeout(() => { movementLoop(start); }, 100);
                                return;
                            }
                        }
                        else {
                            i += 1;
                            movementLoop(start);
                            return;
                        }
                    }
                    else {
                        move(nextMove.x, nextMove.y);
                    }
                }
                else {
                    if (this.SHOW_MESSAGES)
                        game_log("a* - failed moving", this.MESSAGE_COLOR);
                    if (this.MOVE_ON_FAIL) {
                        const randomX = Math.random() * (1 - -1) + -1;
                        const randomY = Math.random() * (1 - -1) + -1;
                        move(parent.character.real_x + randomX, parent.character.real_y + randomY);
                    }
                    this.reset();
                    return reject("failed moving");
                }
                setTimeout(() => { movementLoop(start); }, 40);
            };
            if (this.SHOW_MESSAGES)
                game_log("a* - start moving", this.MESSAGE_COLOR);
            movementLoop(this.startDate);
        });
        return await movementComplete;
    }
    async getMovements(start, finish, finishDistanceTolerance = 0, startTime = this.startDate) {
        const cleanStart = this.cleanPosition(start);
        const cleanFinish = this.cleanPosition(finish);
        const cameFrom = new Map();
        const gScore = new Map();
        gScore.set(cleanStart.key, 0);
        const fScore = new Map();
        fScore.set(cleanStart.key, this.heuristic(cleanStart, cleanFinish));
        const openSet = new FastPriorityQueue_default.a((a, b) => {
            return fScore.get(a.key) < fScore.get(b.key);
        });
        openSet.add({ ...cleanStart });
        const openSetNodes = new Set();
        const neighbor = this.cleanPosition({
            map: cleanStart.map,
            x: G.maps[cleanStart.map].spawns[0][0],
            y: G.maps[cleanStart.map].spawns[0][1],
            transportType: "town"
        });
        const tentativeGScore = gScore.get(cleanStart.key) + this.TOWN_MOVEMENT_COST;
        if (neighbor.key !== cleanStart.key) {
            if (!gScore.get(neighbor.key)
                || tentativeGScore < gScore.get(neighbor.key)) {
                cameFrom.set(neighbor.key, cleanStart);
                gScore.set(neighbor.key, tentativeGScore);
                fScore.set(neighbor.key, tentativeGScore + this.heuristic(neighbor, cleanFinish));
                if (!openSetNodes.has(neighbor.key)) {
                    openSetNodes.add(neighbor.key);
                    openSet.add(neighbor);
                }
            }
        }
        let timer = Date.now();
        while (openSet.size) {
            const current = openSet.poll();
            openSetNodes.delete(current.key);
            const distanceToFinish = distance(current, cleanFinish);
            if (distanceToFinish < finishDistanceTolerance) {
                const path = this.reconstructPath(current, {
                    ...current,
                    transportType: cleanFinish.transportType,
                    transportMap: cleanFinish.transportMap,
                    transportS: cleanFinish.transportS
                }, cameFrom);
                return Promise.resolve(path);
            }
            else if (distanceToFinish < finishDistanceTolerance + this.FINISH_CHECK_DISTANCE) {
                if (finishDistanceTolerance == 0) {
                    if (can_move({
                        map: current.map,
                        x: current.x,
                        y: current.y,
                        going_x: cleanFinish.x,
                        going_y: cleanFinish.y,
                        base: parent.character.base
                    })) {
                        const path = this.reconstructPath(current, cleanFinish, cameFrom);
                        return Promise.resolve(path);
                    }
                }
                else {
                    const angle = Math.atan2(current.y - cleanFinish.y, current.x - cleanFinish.x);
                    const x = cleanFinish.x + Math.cos(angle) * finishDistanceTolerance;
                    const y = cleanFinish.y + Math.sin(angle) * finishDistanceTolerance;
                    const closeFinish = {
                        map: cleanFinish.map,
                        x: x,
                        y: y,
                        key: this.positionToString({ x: x, y: y, map: cleanFinish.map }),
                        transportMap: cleanFinish.transportMap,
                        transportType: cleanFinish.transportType,
                        transportS: cleanFinish.transportS
                    };
                    if (can_move({
                        map: current.map,
                        x: current.x,
                        y: current.y,
                        going_x: closeFinish.x,
                        going_y: closeFinish.y,
                        base: parent.character.base
                    })) {
                        const path = this.reconstructPath(current, closeFinish, cameFrom);
                        return Promise.resolve(path);
                    }
                }
            }
            for (const subMovements of this.MOVEMENTS) {
                for (const subMovement of subMovements) {
                    const neighbor = this.cleanPosition({
                        map: current.map,
                        x: Math.trunc(current.x + subMovement[0]),
                        y: Math.trunc(current.y + subMovement[1])
                    });
                    if (can_move({
                        map: current.map,
                        x: current.x,
                        y: current.y,
                        going_x: neighbor.x,
                        going_y: neighbor.y,
                        base: parent.character.base
                    })) {
                        const tentativeGScore = gScore.get(current.key) + Math.abs(subMovement[0]) + Math.abs(subMovement[1]);
                        if (!gScore.has(neighbor.key)
                            || tentativeGScore < gScore.get(neighbor.key)) {
                            cameFrom.set(neighbor.key, current);
                            gScore.set(neighbor.key, tentativeGScore);
                            fScore.set(neighbor.key, tentativeGScore + this.heuristic(neighbor, cleanFinish));
                            if (!openSetNodes.has(neighbor.key)) {
                                openSetNodes.add(neighbor.key);
                                openSet.add(neighbor);
                            }
                        }
                    }
                }
            }
            if (Date.now() - timer > this.SLEEP_AFTER_MS) {
                await Object(functions["q" /* sleep */])(this.SLEEP_FOR_MS);
                timer = Date.now();
                if (this.wasCancelled(startTime))
                    return Promise.reject("cancelled");
            }
        }
        if (this.SHOW_MESSAGES)
            game_log("a* - failed searching", this.MESSAGE_COLOR);
        try {
            let finalPointString;
            let minScore = Number.MAX_VALUE;
            for (const [pointString, f] of fScore) {
                const g = gScore.get(pointString);
                if (f - g < minScore) {
                    minScore = f - g;
                    finalPointString = pointString;
                }
            }
            const finalPoint = this.stringToPosition(finalPointString);
            const path = this.reconstructPath(finalPoint, cleanFinish, cameFrom);
            return Promise.resolve(path);
        }
        catch (error) {
            return Promise.reject("Failed to find a path...");
        }
    }
}

// EXTERNAL MODULE: ./source/info.ts
var source_info = __webpack_require__(1);

// EXTERNAL MODULE: ./node_modules/ngraph.graph/index.js
var ngraph_graph = __webpack_require__(8);
var ngraph_graph_default = /*#__PURE__*/__webpack_require__.n(ngraph_graph);

// EXTERNAL MODULE: ./node_modules/ngraph.path/index.js
var ngraph_path = __webpack_require__(9);
var ngraph_path_default = /*#__PURE__*/__webpack_require__.n(ngraph_path);

// CONCATENATED MODULE: ./source/ngraphmove.ts


const UNKNOWN = 1;
const UNWALKABLE = 2;
const WALKABLE = 3;
const FIRST_MAP = "main";
const SLEEP_FOR_MS = 50;
class ngraphmove_NGraphMove {
    constructor() {
        this.grids = {};
        this.graph = ngraph_graph_default()();
        this.pathfinder = ngraph_path_default.a.aStar(this.graph);
    }
    canMove(from, to) {
        if (from.map != to.map)
            throw new Error("Don't use this function across maps.");
        const grid = this.grids[from.map];
        const dx = to.x - from.x, dy = to.y - from.y;
        const nx = Math.abs(dx), ny = Math.abs(dy);
        const sign_x = dx > 0 ? 1 : -1, sign_y = dy > 0 ? 1 : -1;
        let x = from.x - G.geometry[from.map].min_x, y = from.y - G.geometry[from.map].min_y;
        for (let ix = 0, iy = 0; ix < nx || iy < ny;) {
            if ((0.5 + ix) / nx == (0.5 + iy) / ny) {
                x += sign_x;
                y += sign_y;
                ix++;
                iy++;
            }
            else if ((0.5 + ix) / nx < (0.5 + iy) / ny) {
                x += sign_x;
                ix++;
            }
            else {
                y += sign_y;
                iy++;
            }
            if (grid[y][x] !== WALKABLE) {
                return false;
            }
        }
        return true;
    }
    async addToGraph(map) {
        if (this.grids[map])
            return;
        const mapWidth = G.geometry[map].max_x - G.geometry[map].min_x;
        const mapHeight = G.geometry[map].max_y - G.geometry[map].min_y;
        const grid = Array(mapHeight);
        for (let y = 0; y < mapHeight; y++) {
            grid[y] = Array(mapWidth).fill(UNKNOWN);
        }
        for (const yLine of G.geometry[map].y_lines) {
            for (let y = yLine[0] - G.geometry[map].min_y - parent.character.base.v; y < yLine[0] - G.geometry[map].min_y + parent.character.base.vn && y < mapHeight; y++) {
                for (let x = yLine[1] - G.geometry[map].min_x - parent.character.base.h; x < yLine[2] - G.geometry[map].min_x + parent.character.base.h && x < mapWidth; x++) {
                    grid[y][x] = UNWALKABLE;
                }
            }
        }
        for (const xLine of G.geometry[map].x_lines) {
            for (let x = xLine[0] - G.geometry[map].min_x - parent.character.base.h; x < xLine[0] - G.geometry[map].min_x + parent.character.base.h && x < mapWidth; x++) {
                for (let y = xLine[1] - G.geometry[map].min_y - parent.character.base.v; y < xLine[2] - G.geometry[map].min_y + parent.character.base.vn && y < mapHeight; y++) {
                    grid[y][x] = UNWALKABLE;
                }
            }
        }
        for (const spawn of G.maps[map].spawns) {
            let x = spawn[0] - G.geometry[map].min_x;
            let y = spawn[1] - G.geometry[map].min_y;
            if (grid[y][x] == WALKABLE)
                continue;
            const stack = [[y, x]];
            while (stack.length) {
                [y, x] = stack.pop();
                let x1 = x;
                while (x1 >= 0 && grid[y][x1] == UNKNOWN)
                    x1--;
                x1++;
                let spanAbove = 0;
                let spanBelow = 0;
                while (x1 < mapWidth && grid[y][x1] == UNKNOWN) {
                    grid[y][x1] = WALKABLE;
                    if (!spanAbove && y > 0 && grid[y - 1][x1] == UNKNOWN) {
                        stack.push([y - 1, x1]);
                        spanAbove = 1;
                    }
                    else if (spanAbove && y > 0 && grid[y - 1][x1] != UNKNOWN) {
                        spanAbove = 0;
                    }
                    if (!spanBelow && y < mapHeight - 1 && grid[y + 1][x1] == UNKNOWN) {
                        stack.push([y + 1, x1]);
                        spanBelow = 1;
                    }
                    else if (spanBelow && y < mapHeight - 1 && grid[y + 1][x1] != UNKNOWN) {
                        spanBelow = 0;
                    }
                    x1++;
                }
            }
        }
        this.grids[map] = grid;
        function createNodeId(map, x, y) {
            return `${map}:${x},${y}`;
        }
        function createNodeData(map, x, y) {
            return {
                map: map,
                x: x,
                y: y
            };
        }
        function findClosestSpawn(x, y) {
            let closest = {
                x: -99999,
                y: -99999,
                distance: 99999
            };
            for (const spawn of G.maps[map].spawns) {
                const distance = Math.sqrt((spawn[0] - x) ** 2 + (spawn[1] - y) ** 2);
                if (distance < closest.distance) {
                    closest = {
                        x: spawn[0],
                        y: spawn[1],
                        distance: distance
                    };
                }
            }
            return closest;
        }
        const newNodes = [];
        for (let y = 1; y < mapHeight - 1; y++) {
            for (let x = 1; x < mapWidth - 1; x++) {
                if (grid[y][x] != WALKABLE)
                    continue;
                const nodeID = createNodeId(map, x, y);
                if (this.graph.hasNode(nodeID)) {
                    newNodes.push(this.graph.getNode(nodeID));
                    continue;
                }
                const nodeData = createNodeData(map, x + G.geometry[map].min_x, y + G.geometry[map].min_y);
                if (grid[y - 1][x - 1] == UNWALKABLE
                    && grid[y - 1][x] == UNWALKABLE
                    && grid[y - 1][x + 1] == UNWALKABLE
                    && grid[y][x - 1] == UNWALKABLE
                    && grid[y + 1][x - 1] == UNWALKABLE) {
                    newNodes.push(this.graph.addNode(nodeID, nodeData));
                }
                else if (grid[y - 1][x - 1] == UNWALKABLE
                    && grid[y - 1][x] == UNWALKABLE
                    && grid[y - 1][x + 1] == UNWALKABLE
                    && grid[y][x + 1] == UNWALKABLE
                    && grid[y + 1][x + 1] == UNWALKABLE) {
                    newNodes.push(this.graph.addNode(nodeID, nodeData));
                }
                else if (grid[y - 1][x + 1] == UNWALKABLE
                    && grid[y][x + 1] == UNWALKABLE
                    && grid[y + 1][x - 1] == UNWALKABLE
                    && grid[y + 1][x] == UNWALKABLE
                    && grid[y + 1][x + 1] == UNWALKABLE) {
                    newNodes.push(this.graph.addNode(nodeID, nodeData));
                }
                else if (grid[y - 1][x - 1] == UNWALKABLE
                    && grid[y][x - 1] == UNWALKABLE
                    && grid[y + 1][x - 1] == UNWALKABLE
                    && grid[y + 1][x] == UNWALKABLE
                    && grid[y + 1][x + 1] == UNWALKABLE) {
                    newNodes.push(this.graph.addNode(nodeID, nodeData));
                }
                else if (grid[y - 1][x - 1] == UNWALKABLE
                    && grid[y - 1][x] == WALKABLE
                    && grid[y][x - 1] == WALKABLE) {
                    newNodes.push(this.graph.addNode(nodeID, nodeData));
                }
                else if (grid[y - 1][x] == WALKABLE
                    && grid[y - 1][x + 1] == UNWALKABLE
                    && grid[y][x + 1] == WALKABLE) {
                    newNodes.push(this.graph.addNode(nodeID, nodeData));
                }
                else if (grid[y][x + 1] == WALKABLE
                    && grid[y + 1][x] == WALKABLE
                    && grid[y + 1][x + 1] == UNWALKABLE) {
                    newNodes.push(this.graph.addNode(nodeID, nodeData));
                }
                else if (grid[y][x - 1] == WALKABLE
                    && grid[y + 1][x - 1] == UNWALKABLE
                    && grid[y + 1][x] == WALKABLE) {
                    newNodes.push(this.graph.addNode(nodeID, nodeData));
                }
            }
        }
        for (const npc of G.maps[map].npcs) {
            if (npc.id != "transporter")
                continue;
            const closest = findClosestSpawn(npc.position[0], npc.position[1]);
            const nodeID = createNodeId(map, closest.x, closest.y);
            if (!this.graph.hasNode(nodeID)) {
                const nodeData = createNodeData(map, closest.x, closest.y);
                newNodes.push(this.graph.addNode(nodeID, nodeData));
            }
            else {
                newNodes.push(this.graph.getNode(nodeID));
            }
            for (const map in G.npcs.transporter.places) {
                const spawnID = G.npcs.transporter.places[map];
                const spawn = G.maps[map].spawns[spawnID];
                const nodeID2 = createNodeId(map, spawn[0], spawn[1]);
                if (!this.graph.hasNode(nodeID)) {
                    const nodeData2 = createNodeData(map, spawn[0], spawn[1]);
                    this.graph.addNode(nodeID2, nodeData2);
                }
                if (!this.graph.hasLink(nodeID, nodeID2)) {
                    const linkData = {
                        type: "transport",
                        spawn: spawnID
                    };
                    this.graph.addLink(nodeID, nodeID2, linkData);
                }
            }
        }
        for (const door of G.maps[map].doors) {
            const nodeID = createNodeId(map, door[0], door[1]);
            if (!this.graph.hasNode(nodeID)) {
                const spawn = G.maps[map].spawns[door[6]];
                const nodeData = createNodeData(map, spawn[0], spawn[1]);
                newNodes.push(this.graph.addNode(nodeID, nodeData));
            }
            else {
                newNodes.push(this.graph.getNode(nodeID));
            }
            const spawn2 = G.maps[door[4]].spawns[door[5]];
            const nodeID2 = createNodeId(door[4], spawn2[0], spawn2[1]);
            if (!this.graph.hasNode(nodeID2)) {
                const nodeData2 = createNodeData(door[4], spawn2[0], spawn2[1]);
                this.graph.addNode(nodeID2, nodeData2);
            }
            if (!this.graph.hasLink(nodeID, nodeID2)) {
                const linkData = {
                    type: "transport",
                    spawn: door[5]
                };
                this.graph.addLink(nodeID, nodeID2, linkData);
            }
        }
        for (let i = 0; i < newNodes.length; i++) {
            for (let j = i + 1; j < newNodes.length; j++) {
                const nodeI = newNodes[i];
                const nodeJ = newNodes[j];
                if (this.canMove(nodeI.data, nodeJ.data)) {
                    this.graph.addLink(nodeI.id, nodeJ.id);
                    this.graph.addLink(nodeJ.id, nodeI.id);
                }
            }
        }
    }
    async prepare(start = FIRST_MAP) {
        const maps = [start];
        for (let i = 0; i < maps.length; i++) {
            const map = maps[i];
            for (const door of G.maps[map].doors) {
                const connectedMap = door[4];
                if (!maps.includes(connectedMap))
                    maps.push(door[4]);
            }
        }
        for (const destination in G.npcs.transporter.places) {
            const map = destination;
            if (!maps.includes(map))
                maps.push(map);
        }
        for (const map of maps) {
            game_log(`Preparing ${map}...`);
            await this.addToGraph(map);
            await new Promise(resolve => setTimeout(resolve, SLEEP_FOR_MS));
        }
    }
    getPath(start, goal) {
        let distToStart = Number.MAX_VALUE;
        let startNode;
        let distToFinish = Number.MAX_VALUE;
        let finishNode;
        this.graph.forEachNode((node) => {
            if (node.data.map == start.map) {
                const distance = Math.sqrt((node.data.x - start.x) ** 2 + (node.data.y - start.y) ** 2);
                if (distance < distToStart) {
                    distToStart = distance;
                    startNode = node.id;
                }
            }
            if (node.data.map == goal.map) {
                const distance = Math.sqrt((node.data.x - goal.x) ** 2 + (node.data.y - goal.y) ** 2);
                if (distance < distToFinish) {
                    distToFinish = distance;
                    finishNode = node.id;
                }
            }
        });
        const path = this.pathfinder.find(startNode, finishNode);
        console.log("This is the path we found:");
        console.log(path);
    }
    async move(destination, finishDistanceTolerance = 0) {
        return;
    }
}

// CONCATENATED MODULE: ./source/character.ts






class character_Character {
    constructor() {
        this.astar = new astarsmartmove_AStarSmartMove();
        this.nGraphMove = new ngraphmove_NGraphMove();
        this.itemsToKeep = [
            "computer", "tracker",
            "goldbooster", "luckbooster", "xpbooster",
            "hpot1", "mpot1",
            "jacko", "lantern"
        ];
        this.itemsToSell = {
            "shoes": 2, "pants": 2, "coat": 2, "helmet": 2, "gloves": 2,
            "cclaw": 2, "hpamulet": 1, "hpbelt": 1, "maceofthedead": 2, "ringsj": 1, "slimestaff": 2, "spear": 2, "throwingstars": 2, "vitearring": 1, "vitring": 1,
        };
        this.itemsToDismantle = {};
        this.itemsToExchange = new Set([
            "5bucks", "gem0", "gem1",
            "seashell",
            "leather",
            "candycane", "mistletoe", "ornament",
            "candy0", "candy1",
            "redenvelopev3",
            "basketofeggs",
            "armorbox", "bugbountybox", "gift0", "gift1", "mysterybox", "weaponbox", "xbox"
        ]);
        this.itemsToBuy = new Set([
            ...this.itemsToExchange,
            "dexbelt", "intbelt", "strbelt",
            "ctristone", "dexring", "intring", "ringofluck", "strring", "suckerpunch", "tristone",
            "dexearring", "intearring", "lostearring", "strearring",
            "amuletofm", "dexamulet", "intamulet", "snring", "stramulet", "t2dexamulet", "t2intamulet", "t2stramulet",
            "charmer", "ftrinket", "jacko", "orbg", "orbofdex", "orbofint", "orbofsc", "orbofstr", "rabbitsfoot", "talkingskull",
            "t2quiver", "lantern", "mshield", "quiver", "sshield", "xshield",
            "angelwings", "bcape", "cape", "ecape", "stealthcape",
            "hboots", "mrnboots", "mwboots", "shoes1", "wingedboots", "xboots",
            "hpants", "mrnpants", "mwpants", "pants1", "starkillers", "xpants",
            "cdragon", "coat1", "harmor", "mcape", "mrnarmor", "mwarmor", "tshirt0", "tshirt1", "tshirt2", "tshirt3", "tshirt4", "tshirt6", "tshirt7", "tshirt8", "tshirt88", "tshirt9", "warpvest", "xarmor",
            "eears", "fury", "helmet1", "hhelmet", "mrnhat", "mwhelmet", "partyhat", "rednose", "xhelmet",
            "gloves1", "goldenpowerglove", "handofmidas", "hgloves", "mrngloves", "mwgloves", "poker", "powerglove", "xgloves",
            "basher", "bataxe", "bowofthedead", "candycanesword", "carrotsword", "crossbow", "dartgun", "firebow", "frostbow", "froststaff", "gbow", "harbringer", "hbow", "merry", "oozingterror", "ornamentstaff", "pmace", "t2bow", "t3bow", "wblade",
            "ascale", "bfur", "cscale", "electronics", "feather0", "fireblade", "goldenegg", "goldingot", "goldnugget", "leather", "networkcard", "platinumingot", "platinumnugget", "pleather", "snakefang",
            "x0", "x1", "x2", "x3", "x4", "x5", "x6", "x7", "x8",
            "egg0", "egg1", "egg2", "egg3", "egg4", "egg5", "egg6", "egg7", "egg8",
            "essenceofether", "essenceoffire", "essenceoffrost", "essenceoflife", "essenceofnature",
            "bunnyelixir", "candypop", "elixirdex0", "elixirdex1", "elixirdex2", "elixirint0", "elixirint1", "elixirint2", "elixirluck", "elixirstr0", "elixirstr1", "elixirstr2", "greenbomb", "hotchocolate",
            "cscroll3", "scroll3", "scroll4",
            "bottleofxp", "bugbountybox", "monstertoken", "poison", "snakeoil"
        ]);
        this.holdPosition = false;
        this.holdAttack = false;
    }
    async mainLoop() {
        try {
            if (parent.character.ctype != "merchant") {
                this.equipBetterItems();
                this.getMonsterhuntQuest();
                await Object(trade["b" /* buyPots */])();
            }
            this.getNewYearTreeBuff();
            Object(trade["e" /* dismantleItems */])(this.itemsToDismantle);
            if (parent.character.slots.elixir == null) {
                const items = Object(functions["d" /* findItems */])("candypop");
                if (items.length) {
                    equip(items[0].index);
                }
            }
            for (const entity of Object(functions["i" /* getEntities */])({ isCtype: "merchant", isWithinDistance: 400 })) {
                for (const slot in entity.slots) {
                    const info = entity.slots[slot];
                    if (!info)
                        continue;
                    if (!info.giveaway)
                        continue;
                    if (info.list.includes(parent.character.id))
                        continue;
                    parent.socket.emit("join_giveaway", { slot: slot, id: entity.id, rid: info.rid });
                }
            }
            for (const entity of Object(functions["i" /* getEntities */])({ isCtype: "merchant", isWithinDistance: 400 })) {
                for (const slot in entity.slots) {
                    const info = entity.slots[slot];
                    if (!info)
                        continue;
                    if (info.b)
                        continue;
                    if (!info.rid)
                        continue;
                    if (!this.itemsToBuy.has(info.name))
                        continue;
                    if (info.price > G.items[info.name].g * 2)
                        continue;
                    if (parent.character.gold < info.price)
                        continue;
                    if (info.q) {
                        const quantityToBuy = Math.min(info.q, Math.floor(parent.character.gold / info.price));
                        parent.socket.emit("trade_buy", { slot: slot, id: entity.id, rid: info.rid, q: quantityToBuy });
                    }
                    else {
                        parent.socket.emit("trade_buy", { slot: slot, id: entity.id, rid: info.rid, q: 1 });
                    }
                }
            }
            this.loot();
        }
        catch (error) {
            console.error(error);
        }
        setTimeout(async () => { this.mainLoop(); }, Math.max(250, parent.character.ping));
    }
    async run() {
        try {
            game_log("Preparing pathfinding...");
            const before = Date.now();
            await this.nGraphMove.prepare();
            game_log(`Took ${Date.now() - before}ms to prepare pathfinding.`);
        }
        catch (e) {
            console.error(e);
        }
        this.healLoop();
        this.attackLoop();
        this.scareLoop();
        this.moveLoop();
        this.infoLoop();
        this.mainLoop();
    }
    infoLoop() {
        const party = Object(source_info["c" /* getPartyInfo */])();
        party[parent.character.name] = {
            "lastSeen": new Date(),
            "shouldSwitchServer": this.shouldSwitchServer(),
            "monsterHuntTargets": this.getMonsterHuntTargets(),
            "items": Object(functions["j" /* getInventory */])(),
            "attack": parent.character.attack,
            "frequency": parent.character.frequency,
            "goldm": parent.character.goldm,
            "last_ms": parent.character.last_ms,
            "luckm": parent.character.luckm,
            "map": parent.character.map,
            "x": parent.character.real_x,
            "y": parent.character.real_y,
            "s": parent.character.s
        };
        Object(source_info["g" /* setPartyInfo */])(party);
        const players = Object(source_info["d" /* getPlayersInfo */])();
        let changed = false;
        for (const player of Object(functions["i" /* getEntities */])({ isPlayer: true, isPartyMember: false })) {
            players[player.id] = {
                "lastSeen": new Date(),
                "rip": player.rip,
                "map": player.map,
                "x": player.real_x,
                "y": player.real_y,
                "s": player.s,
                "ctype": player.ctype
            };
            changed = true;
        }
        if (changed)
            Object(source_info["h" /* setPlayersInfo */])(players);
        const npcs = Object(source_info["b" /* getNPCInfo */])();
        changed = false;
        for (const npc of ["Angel", "Kane"]) {
            if (!parent.entities[npc])
                continue;
            npcs[npc] = {
                "lastSeen": new Date(),
                "map": parent.entities[npc].map,
                "x": parent.entities[npc].real_x,
                "y": parent.entities[npc].real_y
            };
            changed = true;
        }
        if (changed)
            Object(source_info["f" /* setNPCInfo */])(npcs);
        const monsters = Object(source_info["a" /* getMonstersInfo */])();
        changed = false;
        for (const entity of Object(functions["i" /* getEntities */])({ isMonster: true, isRIP: false })) {
            if (!(["fvampire", "goldenbat", "greenjr", "jr", "mvampire", "phoenix", "pinkgoo", "snowman", "wabbit"]).includes(entity.mtype))
                continue;
            monsters[entity.mtype] = {
                "lastSeen": new Date(),
                "id": entity.id,
                "x": entity.real_x,
                "y": entity.real_y,
                "map": entity.map
            };
            changed = true;
        }
        if (changed)
            Object(source_info["e" /* setMonstersInfo */])(monsters);
        setTimeout(() => { this.infoLoop(); }, 2000);
    }
    getMonsterHuntTargets() {
        const types = [];
        let leastTimeRemaining = Number.MAX_VALUE;
        const party = Object(source_info["c" /* getPartyInfo */])();
        for (const memberName of parent.party_list) {
            const member = party[memberName];
            if (!member)
                continue;
            if (!member.s.monsterhunt || member.s.monsterhunt.c == 0)
                continue;
            if (!this.targetPriority[member.s.monsterhunt.id])
                continue;
            const coop = this.targetPriority[member.s.monsterhunt.id].coop;
            if (coop) {
                const availableTypes = Object(functions["k" /* getPartyMemberTypes */])();
                const missingTypes = coop.filter(x => !availableTypes.has(x));
                if (missingTypes.length)
                    continue;
            }
            const timeLeft = member.s.monsterhunt.ms - (Date.now() - member.last_ms.getTime());
            if (timeLeft < leastTimeRemaining) {
                leastTimeRemaining = timeLeft;
                types.unshift(member.s.monsterhunt.id);
            }
            else {
                types.push(member.s.monsterhunt.id);
            }
        }
        return types;
    }
    shouldSwitchServer() {
        if (parent.character.ctype == "merchant")
            return true;
        if (!parent.character.s.monsterhunt)
            return false;
        if (parent.character.s.monsterhunt.c == 0)
            return false;
        if (this.getMonsterHuntTargets().length)
            return false;
        for (const monster in parent.S) {
            if (monster == "grinch")
                continue;
            if (parent.S[monster].hp / parent.S[monster].max_hp > 0.9)
                continue;
            if (!parent.S[monster].live)
                continue;
            if (this.targetPriority[monster])
                return false;
        }
        return true;
    }
    loot() {
        let i = 0;
        const party = Object(source_info["c" /* getPartyInfo */])();
        for (const chestID in parent.chests) {
            const chest = parent.chests[chestID];
            if (distance(parent.character, chest) > 800)
                continue;
            let shouldLoot = true;
            for (const id of parent.party_list) {
                if (id == parent.character.id)
                    continue;
                const partyMember = parent.entities[id];
                if (!partyMember)
                    continue;
                if (distance(partyMember, chest) > 800)
                    continue;
                if (!party[id])
                    continue;
                if (["chest3", "chest4"].includes(chest.skin)) {
                    if (parent.character.goldm >= party[id].goldm)
                        continue;
                }
                else {
                    if (parent.character.luckm >= party[id].luckm)
                        continue;
                }
                shouldLoot = false;
                break;
            }
            if (shouldLoot) {
                parent.socket.emit("open_chest", { id: chestID });
                if (++i > 10)
                    break;
            }
        }
    }
    async attackLoop() {
        try {
            const targets = this.getTargets(1);
            if (targets.length && this.wantToAttack(targets[0])) {
                await attack(targets[0]);
                reduce_cooldown("attack", Math.min(...parent.pings));
            }
        }
        catch (error) {
            if (error.reason == "cooldown") {
                setTimeout(async () => { this.attackLoop(); }, Math.min(...parent.pings) - error.remaining);
                return;
            }
            else if (!["not_found", "disabled"].includes(error.reason)) {
                console.error(error);
            }
            setTimeout(async () => { this.attackLoop(); }, Object(functions["f" /* getCooldownMS */])("attack"));
            return;
        }
        setTimeout(async () => { this.attackLoop(); }, Object(functions["f" /* getCooldownMS */])("attack", true));
    }
    scareLoop() {
        try {
            const targets = Object(functions["i" /* getEntities */])({ isAttackingUs: true, isMonster: true, isRIP: false });
            let wantToScare = false;
            if (targets.length >= 3) {
                wantToScare = true;
            }
            else if (targets.length && !this.targetPriority[targets[0].mtype]) {
                wantToScare = true;
            }
            else if (parent.character.c.town
                && (targets.length > 1
                    || (targets.length == 1
                        && distance(targets[0], parent.character) - targets[0].range - (targets[0].speed * 2)))) {
                wantToScare = true;
            }
            else {
                for (const target of targets) {
                    if (distance(target, parent.character) > target.range)
                        continue;
                    if (Object(functions["b" /* calculateDamageRange */])(target, parent.character)[1] * 6 * target.frequency <= parent.character.hp)
                        continue;
                    wantToScare = true;
                    break;
                }
            }
            if (!Object(functions["n" /* isAvailable */])("scare")
                || !wantToScare) {
                setTimeout(() => { this.scareLoop(); }, Object(functions["f" /* getCooldownMS */])("scare"));
                return;
            }
            if (parent.character.slots.orb.name == "jacko") {
                use_skill("scare");
                reduce_cooldown("scare", Math.min(...parent.pings));
            }
            else {
                const items = Object(functions["d" /* findItems */])("jacko");
                if (items.length) {
                    const jackoI = items[0].index;
                    equip(jackoI);
                    use_skill("scare");
                    reduce_cooldown("scare", Math.min(...parent.pings));
                }
            }
        }
        catch (error) {
            console.error(error);
        }
        setTimeout(() => { this.scareLoop(); }, Object(functions["f" /* getCooldownMS */])("scare"));
    }
    getMovementLocation(mtype) {
        if (!this.targetPriority[mtype])
            return;
        if (this.targetPriority[mtype].farmingPosition && this.targetPriority[mtype].holdPositionFarm)
            return this.targetPriority[mtype].farmingPosition;
        if (Object(functions["m" /* getVisibleMonsterTypes */])().has(mtype))
            return;
        if (this.targetPriority[mtype].farmingPosition) {
            if (distance(parent.character, this.targetPriority[mtype].farmingPosition) < 300) {
                return;
            }
            else {
                return this.targetPriority[mtype].farmingPosition;
            }
        }
        if (parent.S[mtype]) {
            if (!parent.S[mtype].live)
                return;
            return parent.S[mtype];
        }
        const randomSpawn = Object(functions["l" /* getRandomMonsterSpawn */])(mtype);
        if (randomSpawn)
            return randomSpawn;
    }
    getMovementTarget() {
        if (parent.character.rip) {
            set_message("RIP");
            return;
        }
        if (parent.character.s.monsterhunt && parent.character.s.monsterhunt.c == 0) {
            set_message("Finish MH");
            return { target: "monsterhunter", position: G.maps.main.ref.monsterhunter, range: 300 };
        }
        for (const entity of Object(functions["i" /* getEntities */])({ isMonster: true, isRIP: false })) {
            if (entity.mtype != "goldenbat" && entity.mtype != "phoenix")
                continue;
            if (!this.targetPriority[entity.mtype])
                continue;
            set_message(entity.mtype);
            return { target: entity.mtype, position: entity, range: parent.character.range };
        }
        const monsters = Object(source_info["a" /* getMonstersInfo */])();
        for (const mtype in monsters) {
            if (!this.targetPriority[mtype])
                continue;
            const info = monsters[mtype];
            const entityInfo = parent.entities[info.id];
            if (entityInfo) {
                info.x = entityInfo.real_x;
                info.y = entityInfo.real_y;
            }
            if (distance(parent.character, info) < parent.character.range * 2 && !entityInfo) {
                delete monsters[mtype];
                Object(source_info["e" /* setMonstersInfo */])(monsters);
            }
            else {
                set_message(`SP ${mtype}`);
                return { target: mtype, position: info, range: parent.character.range };
            }
        }
        if (G.maps.main.ref.newyear_tree && !parent.character.s.holidayspirit) {
            set_message("Xmas Tree");
            return { target: "newyear_tree", position: G.maps.main.ref.newyear_tree, range: 300 };
        }
        if (Object(functions["o" /* isInventoryFull */])()) {
            set_message("Full!");
            return { target: "merchant", position: { map: "main", "x": 60, "y": -325 }, range: 300 };
        }
        for (const mtype in parent.S) {
            if (!parent.S[mtype].live)
                continue;
            if (!this.targetPriority[mtype])
                continue;
            set_message(mtype);
            return { target: mtype, position: parent.S[mtype], range: parent.character.range };
        }
        const party = Object(source_info["c" /* getPartyInfo */])();
        const monsterHuntTargets = this.getMonsterHuntTargets();
        if (monsterHuntTargets.length) {
            const potentialTarget = monsterHuntTargets[0];
            const coop = this.targetPriority[potentialTarget].coop;
            if (coop) {
                const readyMembers = new Set();
                for (const memberName of parent.party_list) {
                    if (!party[memberName] || !party[memberName].monsterHuntTargets)
                        continue;
                    if (party[memberName].monsterHuntTargets[0] != potentialTarget)
                        continue;
                    readyMembers.add(parent.party[memberName].type);
                }
                const notReady = coop.filter(x => !readyMembers.has(x));
                if (notReady.length == 0) {
                    set_message(`MH ${potentialTarget}`);
                    return { target: potentialTarget, position: this.getMovementLocation(potentialTarget) };
                }
            }
            else {
                set_message(`MH ${potentialTarget}`);
                return { target: potentialTarget, position: this.getMovementLocation(potentialTarget) };
            }
        }
        if (!parent.character.s.monsterhunt) {
            set_message("New MH");
            return { target: "monsterhunter", position: G.maps.main.ref.monsterhunter, range: 300 };
        }
        if (this.mainTarget) {
            set_message(this.mainTarget);
            return { target: this.mainTarget, position: this.getMovementLocation(this.mainTarget) };
        }
    }
    moveLoop() {
        try {
            if (this.holdPosition || smart.moving) {
                setTimeout(() => { this.moveLoop(); }, Math.max(400, parent.character.ping));
                return;
            }
            const lastMovementTarget = this.movementTarget;
            this.movementTarget = this.getMovementTarget();
            if (this.movementTarget && this.movementTarget.position) {
                if (!lastMovementTarget
                    || this.movementTarget.target != lastMovementTarget.target
                    || (lastMovementTarget.position && this.movementTarget.position.map != lastMovementTarget.position.map)) {
                    this.astar.stop();
                    this.astar.smartMove(this.movementTarget.position, this.movementTarget.range);
                    setTimeout(() => { this.moveLoop(); }, Math.max(400, parent.character.ping));
                    return;
                }
                if (!this.astar.isMoving()) {
                    this.astar.smartMove(this.movementTarget.position, this.movementTarget.range);
                    setTimeout(() => { this.moveLoop(); }, Math.max(400, parent.character.ping));
                    return;
                }
            }
            const targets = this.getTargets(1);
            if (targets.length
                && targets[0].mtype == this.movementTarget.target
                && this.targetPriority[targets[0].mtype] && !this.targetPriority[targets[0].mtype].holdPositionFarm) {
                this.astar.stop();
            }
            const targeted = get_targeted_monster();
            if (targeted && targeted.rip) {
                change_target(null, true);
                this.astar.stop();
            }
            if (this.astar.isMoving()) {
                setTimeout(() => { this.moveLoop(); }, Math.max(400, parent.character.ping));
                return;
            }
            if (this.targetPriority[this.movementTarget.target] && this.targetPriority[this.movementTarget.target].holdPositionFarm) {
                setTimeout(() => { this.moveLoop(); }, Math.max(400, parent.character.ping));
                return;
            }
            const inEnemyAttackRange = [];
            const inAggroRange = [];
            const inAttackRange = [];
            const inAttackRangeHighPriority = [];
            const inExtendedAttackRange = [];
            const inExtendedAttackRangeHighPriority = [];
            const visible = [];
            const visibleHighPriority = [];
            for (const id in parent.entities) {
                const entity = parent.entities[id];
                if (entity.rip)
                    continue;
                if (!this.targetPriority[entity.mtype])
                    continue;
                const d = distance(parent.character, entity);
                const enemyRange = Math.max(entity.range + entity.speed, 50);
                if (enemyRange < parent.character.range
                    && d < enemyRange) {
                    if (entity.hp > Object(functions["b" /* calculateDamageRange */])(parent.character, entity)[0] || this.targetPriority[entity.mtype].holdAttackInEntityRange || entity.target == parent.character.name) {
                        inEnemyAttackRange.push(entity);
                    }
                }
                if (!entity.target && d < 50) {
                    inAggroRange.push(entity);
                }
                if (d < parent.character.range) {
                    inAttackRange.push(entity);
                    if (this.movementTarget.target == entity.mtype)
                        inAttackRangeHighPriority.push(entity);
                }
                else if (d < parent.character.range * 2) {
                    inExtendedAttackRange.push(entity);
                    if (this.movementTarget.target == entity.mtype)
                        inExtendedAttackRangeHighPriority.push(entity);
                }
                visible.push(entity);
                if (this.movementTarget.target == entity.mtype)
                    visibleHighPriority.push(entity);
            }
            if (inEnemyAttackRange.length) {
                const average = {
                    x: 0,
                    y: 0
                };
                let maxRange = 0;
                for (const v of inEnemyAttackRange) {
                    average.x += v.real_x;
                    average.y += v.real_y;
                    if (v.range + v.speed > maxRange) {
                        maxRange = v.range + v.speed;
                    }
                }
                average.x /= inEnemyAttackRange.length;
                average.y /= inEnemyAttackRange.length;
                const angle = Math.atan2(parent.character.real_y - average.y, parent.character.real_x - average.x);
                const moveDistance = Math.min(parent.character.range, maxRange * 1.5);
                const calculateEscape = (angle, moveDistance) => {
                    const x = Math.cos(angle) * moveDistance;
                    const y = Math.sin(angle) * moveDistance;
                    return { x: parent.character.real_x + x, y: parent.character.real_y + y };
                };
                let escapePosition = calculateEscape(angle, moveDistance);
                let angleChange = 0;
                while (!can_move_to(escapePosition.x, escapePosition.y) && angleChange < 180) {
                    if (angleChange <= 0) {
                        angleChange = (-angleChange) + 1;
                    }
                    else {
                        angleChange = -angleChange;
                    }
                    escapePosition = calculateEscape(angle + (angleChange * Math.PI / 180), moveDistance);
                }
                move(escapePosition.x, escapePosition.y);
                setTimeout(() => { this.moveLoop(); }, Math.max(400, parent.character.ping));
                return;
            }
            if (inAttackRangeHighPriority.length) {
                setTimeout(() => { this.moveLoop(); }, Math.max(400, parent.character.ping));
                return;
            }
            if (visibleHighPriority.length) {
                let closest;
                let d = Number.MAX_VALUE;
                for (const v of visibleHighPriority) {
                    const vD = distance(parent.character, v);
                    if (vD < d) {
                        d = vD;
                        closest = v;
                    }
                }
                this.astar.smartMove(closest, parent.character.range);
                setTimeout(() => { this.moveLoop(); }, Math.max(400, parent.character.ping));
                return;
            }
            if (visible.length) {
                let closest;
                let d = Number.MAX_VALUE;
                for (const v of visible) {
                    const vD = distance(parent.character, v);
                    if (vD < d) {
                        d = vD;
                        closest = v;
                    }
                }
                this.astar.smartMove(closest, parent.character.range);
                setTimeout(() => { this.moveLoop(); }, Math.max(400, parent.character.ping));
                return;
            }
        }
        catch (error) {
            console.error(error);
        }
        setTimeout(() => { this.moveLoop(); }, Math.max(400, parent.character.ping));
    }
    async healLoop() {
        try {
            if (parent.character.rip) {
                respawn();
                setTimeout(() => { this.healLoop(); }, Object(functions["f" /* getCooldownMS */])("use_town"));
                return;
            }
            else if (!Object(functions["n" /* isAvailable */])("use_hp")) {
                setTimeout(() => { this.healLoop(); }, Object(functions["f" /* getCooldownMS */])("use_hp"));
                return;
            }
            const hpPots = ["hpot0", "hpot1"];
            const mpPots = ["mpot0", "mpot1"];
            let useMpPot = null;
            let useHpPot = null;
            for (let i = parent.character.items.length - 1; i >= 0; i--) {
                const item = parent.character.items[i];
                if (!item)
                    continue;
                if (!useHpPot && hpPots.includes(item.name)) {
                    useHpPot = item;
                }
                else if (!useMpPot && mpPots.includes(item.name)) {
                    useMpPot = item;
                }
                if (useHpPot && useMpPot) {
                    break;
                }
            }
            const hpRatio = parent.character.hp / parent.character.max_hp;
            const mpRatio = parent.character.mp / parent.character.max_mp;
            if (hpRatio <= mpRatio
                && hpRatio != 1
                && (!useHpPot
                    || (useHpPot.name == "hpot0" && (parent.character.hp <= parent.character.max_hp - 200 || parent.character.hp < 50))
                    || (useHpPot.name == "hpot1" && (parent.character.hp <= parent.character.max_hp - 400 || parent.character.hp < 50)))) {
                use_skill("use_hp");
                reduce_cooldown("use_hp", Math.min(...parent.pings));
                reduce_cooldown("use_mp", Math.min(...parent.pings));
            }
            else if (mpRatio != 1
                && (!useMpPot
                    || (useMpPot.name == "mpot0" && (parent.character.mp <= parent.character.max_mp - 300 || parent.character.mp < 50))
                    || (useMpPot.name == "mpot1" && (parent.character.mp <= parent.character.max_mp - 500 || parent.character.mp < 50)))) {
                use_skill("use_mp");
                reduce_cooldown("use_hp", Math.min(...parent.pings));
                reduce_cooldown("use_mp", Math.min(...parent.pings));
            }
            else if (hpRatio < mpRatio) {
                use_skill("regen_hp");
                reduce_cooldown("use_hp", Math.min(...parent.pings));
                reduce_cooldown("use_mp", Math.min(...parent.pings));
            }
            else if (mpRatio < hpRatio) {
                use_skill("regen_mp");
                reduce_cooldown("use_hp", Math.min(...parent.pings));
                reduce_cooldown("use_mp", Math.min(...parent.pings));
            }
        }
        catch (error) {
            console.error(error);
        }
        setTimeout(() => { this.healLoop(); }, Object(functions["f" /* getCooldownMS */])("use_hp"));
    }
    getNewYearTreeBuff() {
        if (!G.maps.main.ref.newyear_tree)
            return;
        if (parent.character.s.holidayspirit)
            return;
        if (distance(parent.character, G.maps.main.ref.newyear_tree) > 400)
            return;
        parent.socket.emit("interaction", { type: "newyear_tree" });
    }
    getMonsterhuntQuest() {
        if (distance(parent.character, G.maps.main.ref.monsterhunter) > 400)
            return;
        if (!parent.character.s.monsterhunt) {
            parent.socket.emit("monsterhunt");
        }
        else if (parent.character.s.monsterhunt.c == 0) {
            parent.socket.emit("monsterhunt");
        }
    }
    parseCM(characterName, data) {
        if (!parent.party_list.includes(characterName) && parent.character.name != characterName
            && !["earthiverse", "earthMag", "earthMag2"].includes(characterName)
            && !(data.message == "monster")) {
            game_log("Blocked CM from " + characterName);
            return;
        }
        if (data.message == "info") {
            const party = Object(source_info["c" /* getPartyInfo */])();
            party[characterName] = data.info;
            Object(source_info["g" /* setPartyInfo */])(party);
        }
        else if (data.message == "monster") {
            const monsters = Object(source_info["a" /* getMonstersInfo */])();
            monsters[data.id] = data.info;
            Object(source_info["e" /* setMonstersInfo */])(monsters);
        }
        else if (data.message == "npc") {
            const npcs = Object(source_info["b" /* getNPCInfo */])();
            npcs[data.id] = data.info;
            Object(source_info["f" /* setNPCInfo */])(npcs);
        }
        else if (data.message == "player") {
            const players = Object(source_info["d" /* getPlayersInfo */])();
            players[data.id] = data.info;
            Object(source_info["h" /* setPlayersInfo */])(players);
        }
        else if (data.message == "chests") {
            for (const chestID in data.chests) {
                if (!parent.chests[chestID])
                    parent.chests[chestID] = data.chests[chestID];
            }
        }
    }
    equipBetterItems() {
        try {
            const items = Object(functions["j" /* getInventory */])();
            if (this.movementTarget.target && this.targetPriority[this.movementTarget.target]) {
                for (const idealItem of this.targetPriority[this.movementTarget.target].equip || []) {
                    let hasItem = false;
                    for (const slot in parent.character.slots) {
                        const slotInfo = parent.character.slots[slot];
                        if (!slotInfo)
                            continue;
                        if (slotInfo.name == idealItem) {
                            hasItem = true;
                            break;
                        }
                    }
                    if (!hasItem) {
                        for (const item of items) {
                            if (item.name == idealItem) {
                                if (G.classes[parent.character.ctype].doublehand[G.items[idealItem].wtype])
                                    unequip("offhand");
                                equip(item.index);
                                break;
                            }
                        }
                    }
                }
            }
            for (const slot in parent.character.slots) {
                let slotItem = parent.character.slots[slot];
                let betterItem;
                if (!slotItem)
                    continue;
                for (const item of items) {
                    if (item.name != slotItem.name)
                        continue;
                    if (!item.level || item.level <= slotItem.level)
                        continue;
                    slotItem = item;
                    betterItem = item;
                }
                if (betterItem)
                    equip(betterItem.index, slot);
            }
        }
        catch (error) {
            console.error(error);
        }
    }
    getTargets(numTargets = 1, distanceCheck = parent.character.range) {
        const targets = [];
        const members = parent.party_list;
        const claimedTargets = new Set();
        for (const id in parent.entities) {
            if (members.includes(id)) {
                const target = parent.entities[id].target;
                if (target)
                    claimedTargets.add(target);
            }
        }
        const potentialTargets = new FastPriorityQueue_default.a((x, y) => x.priority > y.priority);
        for (const id in parent.entities) {
            const potentialTarget = parent.entities[id];
            if (potentialTarget.rip)
                continue;
            if (parent.party_list.includes(id))
                continue;
            if (!is_pvp() && potentialTarget.type != "monster")
                continue;
            if (is_pvp() && parent.party_list.includes(id))
                continue;
            if (!this.targetPriority[potentialTarget.mtype] && potentialTarget.target != parent.character.name)
                continue;
            let priority = this.targetPriority[potentialTarget.mtype] ? this.targetPriority[potentialTarget.mtype].priority : 0;
            const d = distance(parent.character, potentialTarget);
            if (d > distanceCheck)
                continue;
            priority -= d;
            if (claimedTargets.has(id)) {
                if (this.targetPriority[potentialTarget.mtype] && this.targetPriority[potentialTarget.mtype].coop)
                    priority += parent.character.range;
                if (potentialTarget.hp <= Object(functions["b" /* calculateDamageRange */])(parent.character, potentialTarget)[0])
                    priority -= parent.character.range;
            }
            if (potentialTarget.mtype == this.mainTarget)
                priority += 250;
            if (this.movementTarget && potentialTarget.mtype == this.movementTarget.target)
                priority += 1000;
            if (potentialTarget.target == parent.character.name)
                priority += 2000;
            if (potentialTarget.cooperative)
                priority += 1000 * (potentialTarget.max_hp - potentialTarget.hp) / potentialTarget.max_hp;
            const priorityEntity = { id: potentialTarget.id, priority: priority };
            potentialTargets.add(priorityEntity);
        }
        while (targets.length < numTargets && potentialTargets.size > 0) {
            const entity = parent.entities[potentialTargets.poll().id];
            if (entity)
                targets.push(entity);
        }
        if (targets.length > 0)
            change_target(targets[0], true);
        return targets;
    }
    wantToAttack(e, s = "attack") {
        if (!Object(functions["n" /* isAvailable */])(s))
            return false;
        if (parent.character.c.town)
            return false;
        let range = G.skills[s].range ? G.skills[s].range : parent.character.range;
        const distanceToEntity = distance(parent.character, e);
        if (G.skills[s].range_multiplier)
            range *= G.skills[s].range_multiplier;
        if (distanceToEntity > range)
            return false;
        const mp = G.skills[s].mp ? G.skills[s].mp : parent.character.mp_cost;
        if (parent.character.mp < mp)
            return false;
        if (s != "attack" && e.immune)
            return false;
        if (s != "attack" && e["1hp"])
            return false;
        if (!is_pvp() && e.type == "monster" && !this.targetPriority[e.mtype])
            return false;
        if (!e.target) {
            if (this.holdAttack)
                return false;
            if ((smart.moving || this.astar.isMoving()) && (this.movementTarget && this.movementTarget.target && this.movementTarget.target != e.mtype) && this.targetPriority[e.mtype].holdAttackWhileMoving)
                return false;
            if (this.targetPriority[e.mtype].holdAttackInEntityRange && distanceToEntity <= e.range)
                return false;
            if (this.targetPriority[e.mtype].coop) {
                const availableTypes = [parent.character.ctype];
                for (const member of parent.party_list) {
                    const e = parent.entities[member];
                    if (!e)
                        continue;
                    if (e.rip)
                        continue;
                    if (e.ctype == "priest" && distance(parent.character, e) > e.range)
                        continue;
                    availableTypes.push(e.ctype);
                }
                for (const type of this.targetPriority[e.mtype].coop) {
                    if (!availableTypes.includes(type))
                        return false;
                }
            }
            if (Object(functions["b" /* calculateDamageRange */])(e, parent.character)[1] * 5 * e.frequency > parent.character.hp && distanceToEntity <= e.range)
                return false;
        }
        return true;
    }
}


/***/ }),
/* 11 */
/***/ (function(module, exports) {

module.exports = function(module) {
	if (!module.webpackPolyfill) {
		module.deprecate = function() {};
		module.paths = [];
		// module.parent = undefined by default
		if (!module.children) module.children = [];
		Object.defineProperty(module, "loaded", {
			enumerable: true,
			get: function() {
				return module.l;
			}
		});
		Object.defineProperty(module, "id", {
			enumerable: true,
			get: function() {
				return module.i;
			}
		});
		module.webpackPolyfill = 1;
	}
	return module;
};


/***/ }),
/* 12 */
/***/ (function(module, exports) {

module.exports = function eventify(subject) {
  validateSubject(subject);

  var eventsStorage = createEventsStorage(subject);
  subject.on = eventsStorage.on;
  subject.off = eventsStorage.off;
  subject.fire = eventsStorage.fire;
  return subject;
};

function createEventsStorage(subject) {
  // Store all event listeners to this hash. Key is event name, value is array
  // of callback records.
  //
  // A callback record consists of callback function and its optional context:
  // { 'eventName' => [{callback: function, ctx: object}] }
  var registeredEvents = Object.create(null);

  return {
    on: function (eventName, callback, ctx) {
      if (typeof callback !== 'function') {
        throw new Error('callback is expected to be a function');
      }
      var handlers = registeredEvents[eventName];
      if (!handlers) {
        handlers = registeredEvents[eventName] = [];
      }
      handlers.push({callback: callback, ctx: ctx});

      return subject;
    },

    off: function (eventName, callback) {
      var wantToRemoveAll = (typeof eventName === 'undefined');
      if (wantToRemoveAll) {
        // Killing old events storage should be enough in this case:
        registeredEvents = Object.create(null);
        return subject;
      }

      if (registeredEvents[eventName]) {
        var deleteAllCallbacksForEvent = (typeof callback !== 'function');
        if (deleteAllCallbacksForEvent) {
          delete registeredEvents[eventName];
        } else {
          var callbacks = registeredEvents[eventName];
          for (var i = 0; i < callbacks.length; ++i) {
            if (callbacks[i].callback === callback) {
              callbacks.splice(i, 1);
            }
          }
        }
      }

      return subject;
    },

    fire: function (eventName) {
      var callbacks = registeredEvents[eventName];
      if (!callbacks) {
        return subject;
      }

      var fireArguments;
      if (arguments.length > 1) {
        fireArguments = Array.prototype.splice.call(arguments, 1);
      }
      for(var i = 0; i < callbacks.length; ++i) {
        var callbackInfo = callbacks[i];
        callbackInfo.callback.apply(callbackInfo.ctx, fireArguments);
      }

      return subject;
    }
  };
}

function validateSubject(subject) {
  if (!subject) {
    throw new Error('Eventify cannot use falsy object as events subject');
  }
  var reservedWords = ['on', 'fire', 'off'];
  for (var i = 0; i < reservedWords.length; ++i) {
    if (subject.hasOwnProperty(reservedWords[i])) {
      throw new Error("Subject cannot be eventified, since it already has property '" + reservedWords[i] + "'");
    }
  }
}


/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Performs a uni-directional A Star search on graph.
 * 
 * We will try to minimize f(n) = g(n) + h(n), where
 * g(n) is actual distance from source node to `n`, and
 * h(n) is heuristic distance from `n` to target node.
 */
module.exports = aStarPathSearch;

var NodeHeap = __webpack_require__(4);
var makeSearchStatePool = __webpack_require__(7);
var heuristics = __webpack_require__(5);
var defaultSettings = __webpack_require__(6);

var NO_PATH = defaultSettings.NO_PATH;

module.exports.l2 = heuristics.l2;
module.exports.l1 = heuristics.l1;

/**
 * Creates a new instance of pathfinder. A pathfinder has just one method:
 * `find(fromId, toId)`, it may be extended in future.
 * 
 * @param {ngraph.graph} graph instance. See https://github.com/anvaka/ngraph.graph
 * @param {Object} options that configures search
 * @param {Function(a, b)} options.heuristic - a function that returns estimated distance between
 * nodes `a` and `b`. This function should never overestimate actual distance between two
 * nodes (otherwise the found path will not be the shortest). Defaults function returns 0,
 * which makes this search equivalent to Dijkstra search.
 * @param {Function(a, b)} options.distance - a function that returns actual distance between two
 * nodes `a` and `b`. By default this is set to return graph-theoretical distance (always 1);
 * @param {Boolean} options.oriented - whether graph should be considered oriented or not.
 * 
 * @returns {Object} A pathfinder with single method `find()`.
 */
function aStarPathSearch(graph, options) {
  options = options || {};
  // whether traversal should be considered over oriented graph.
  var oriented = options.oriented;

  var heuristic = options.heuristic;
  if (!heuristic) heuristic = defaultSettings.heuristic;

  var distance = options.distance;
  if (!distance) distance = defaultSettings.distance;
  var pool = makeSearchStatePool();

  return {
    /**
     * Finds a path between node `fromId` and `toId`.
     * @returns {Array} of nodes between `toId` and `fromId`. Empty array is returned
     * if no path is found.
     */
    find: find
  };

  function find(fromId, toId) {
    var from = graph.getNode(fromId);
    if (!from) throw new Error('fromId is not defined in this graph: ' + fromId);
    var to = graph.getNode(toId);
    if (!to) throw new Error('toId is not defined in this graph: ' + toId);
    pool.reset();

    // Maps nodeId to NodeSearchState.
    var nodeState = new Map();

    // the nodes that we still need to evaluate
    var openSet = new NodeHeap({
      compare: defaultSettings.compareFScore,
      setNodeId: defaultSettings.setHeapIndex
    });

    var startNode = pool.createNewState(from);
    nodeState.set(fromId, startNode);

    // For the first node, fScore is completely heuristic.
    startNode.fScore = heuristic(from, to);

    // The cost of going from start to start is zero.
    startNode.distanceToSource = 0;
    openSet.push(startNode);
    startNode.open = 1;

    var cameFrom;

    while (openSet.length > 0) {
      cameFrom = openSet.pop();
      if (goalReached(cameFrom, to)) return reconstructPath(cameFrom);

      // no need to visit this node anymore
      cameFrom.closed = true;
      graph.forEachLinkedNode(cameFrom.node.id, visitNeighbour, oriented);
    }

    // If we got here, then there is no path.
    return NO_PATH;

    function visitNeighbour(otherNode, link) {
      var otherSearchState = nodeState.get(otherNode.id);
      if (!otherSearchState) {
        otherSearchState = pool.createNewState(otherNode);
        nodeState.set(otherNode.id, otherSearchState);
      }

      if (otherSearchState.closed) {
        // Already processed this node.
        return;
      }
      if (otherSearchState.open === 0) {
        // Remember this node.
        openSet.push(otherSearchState);
        otherSearchState.open = 1;
      }

      var tentativeDistance = cameFrom.distanceToSource + distance(otherNode, cameFrom.node, link);
      if (tentativeDistance >= otherSearchState.distanceToSource) {
        // This would only make our path longer. Ignore this route.
        return;
      }

      // bingo! we found shorter path:
      otherSearchState.parent = cameFrom;
      otherSearchState.distanceToSource = tentativeDistance;
      otherSearchState.fScore = tentativeDistance + heuristic(otherSearchState.node, to);

      openSet.updateItem(otherSearchState.heapIndex);
    }
  }
}

function goalReached(searchState, targetNode) {
  return searchState.node === targetNode;
}

function reconstructPath(searchState) {
  var path = [searchState.node];
  var parent = searchState.parent;

  while (parent) {
    path.push(parent.node);
    parent = parent.parent;
  }

  return path;
}


/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Performs suboptimal, greed A Star path finding.
 * This finder does not necessary finds the shortest path. The path
 * that it finds is very close to the shortest one. It is very fast though.
 */
module.exports = aStarBi;

var NodeHeap = __webpack_require__(4);
var makeSearchStatePool = __webpack_require__(7);
var heuristics = __webpack_require__(5);
var defaultSettings = __webpack_require__(6);

var BY_FROM = 1;
var BY_TO = 2;
var NO_PATH = defaultSettings.NO_PATH;

module.exports.l2 = heuristics.l2;
module.exports.l1 = heuristics.l1;

/**
 * Creates a new instance of pathfinder. A pathfinder has just one method:
 * `find(fromId, toId)`, it may be extended in future.
 * 
 * NOTE: Algorithm implemented in this code DOES NOT find optimal path.
 * Yet the path that it finds is always near optimal, and it finds it very fast.
 * 
 * @param {ngraph.graph} graph instance. See https://github.com/anvaka/ngraph.graph
 * 
 * @param {Object} options that configures search
 * @param {Function(a, b)} options.heuristic - a function that returns estimated distance between
 * nodes `a` and `b`.  Defaults function returns 0, which makes this search equivalent to Dijkstra search.
 * @param {Function(a, b)} options.distance - a function that returns actual distance between two
 * nodes `a` and `b`. By default this is set to return graph-theoretical distance (always 1);
 * @param {Boolean} options.oriented - whether graph should be considered oriented or not.
 * 
 * @returns {Object} A pathfinder with single method `find()`.
 */
function aStarBi(graph, options) {
  options = options || {};
  // whether traversal should be considered over oriented graph.
  var oriented = options.oriented;

  var heuristic = options.heuristic;
  if (!heuristic) heuristic = defaultSettings.heuristic;

  var distance = options.distance;
  if (!distance) distance = defaultSettings.distance;
  var pool = makeSearchStatePool();

  return {
    find: find
  };

  function find(fromId, toId) {
    // Not sure if we should return NO_PATH or throw. Throw seem to be more
    // helpful to debug errors. So, throwing.
    var from = graph.getNode(fromId);
    if (!from) throw new Error('fromId is not defined in this graph: ' + fromId);
    var to = graph.getNode(toId);
    if (!to) throw new Error('toId is not defined in this graph: ' + toId);

    if (from === to) return [from]; // trivial case.

    pool.reset();

    var callVisitor = oriented ? orientedVisitor : nonOrientedVisitor;

    // Maps nodeId to NodeSearchState.
    var nodeState = new Map();

    var openSetFrom = new NodeHeap({
      compare: defaultSettings.compareFScore,
      setNodeId: defaultSettings.setHeapIndex
    });

    var openSetTo = new NodeHeap({
      compare: defaultSettings.compareFScore,
      setNodeId: defaultSettings.setHeapIndex
    });


    var startNode = pool.createNewState(from);
    nodeState.set(fromId, startNode);

    // For the first node, fScore is completely heuristic.
    startNode.fScore = heuristic(from, to);
    // The cost of going from start to start is zero.
    startNode.distanceToSource = 0;
    openSetFrom.push(startNode);
    startNode.open = BY_FROM;

    var endNode = pool.createNewState(to);
    endNode.fScore = heuristic(to, from);
    endNode.distanceToSource = 0;
    openSetTo.push(endNode);
    endNode.open = BY_TO;

    // Cost of the best solution found so far. Used for accurate termination
    var lMin = Number.POSITIVE_INFINITY;
    var minFrom;
    var minTo;

    var currentSet = openSetFrom;
    var currentOpener = BY_FROM;

    while (openSetFrom.length > 0 && openSetTo.length > 0) {
      if (openSetFrom.length < openSetTo.length) {
        // we pick a set with less elements
        currentOpener = BY_FROM;
        currentSet = openSetFrom;
      } else {
        currentOpener = BY_TO;
        currentSet = openSetTo;
      }

      var current = currentSet.pop();

      // no need to visit this node anymore
      current.closed = true;

      if (current.distanceToSource > lMin) continue;

      graph.forEachLinkedNode(current.node.id, callVisitor);

      if (minFrom && minTo) {
        // This is not necessary the best path, but we are so greedy that we
        // can't resist:
        return reconstructBiDirectionalPath(minFrom, minTo);
      }
    }

    return NO_PATH; // No path.

    function nonOrientedVisitor(otherNode, link) {
      return visitNode(otherNode, link, current);
    }

    function orientedVisitor(otherNode, link) {
      // For oritned graphs we need to reverse graph, when traveling
      // backwards. So, we use non-oriented ngraph's traversal, and 
      // filter link orientation here.
      if (currentOpener === BY_FROM) {
        if (link.fromId === current.node.id) return visitNode(otherNode, link, current)
      } else if (currentOpener === BY_TO) {
        if (link.toId === current.node.id) return visitNode(otherNode, link, current);
      }
    }

    function canExit(currentNode) {
      var opener = currentNode.open
      if (opener && opener !== currentOpener) {
        return true;
      }

      return false;
    }

    function reconstructBiDirectionalPath(a, b) {
      var pathOfNodes = [];
      var aParent = a;
      while(aParent) {
        pathOfNodes.push(aParent.node);
        aParent = aParent.parent;
      }
      var bParent = b;
      while (bParent) {
        pathOfNodes.unshift(bParent.node);
        bParent = bParent.parent
      }
      return pathOfNodes;
    }

    function visitNode(otherNode, link, cameFrom) {
      var otherSearchState = nodeState.get(otherNode.id);
      if (!otherSearchState) {
        otherSearchState = pool.createNewState(otherNode);
        nodeState.set(otherNode.id, otherSearchState);
      }

      if (otherSearchState.closed) {
        // Already processed this node.
        return;
      }

      if (canExit(otherSearchState, cameFrom)) {
        // this node was opened by alternative opener. The sets intersect now,
        // we found an optimal path, that goes through *this* node. However, there
        // is no guarantee that this is the global optimal solution path.

        var potentialLMin = otherSearchState.distanceToSource + cameFrom.distanceToSource;
        if (potentialLMin < lMin) {
          minFrom = otherSearchState;
          minTo = cameFrom
          lMin = potentialLMin;
        }
        // we are done with this node.
        return;
      }

      var tentativeDistance = cameFrom.distanceToSource + distance(otherSearchState.node, cameFrom.node, link);

      if (tentativeDistance >= otherSearchState.distanceToSource) {
        // This would only make our path longer. Ignore this route.
        return;
      }

      // Choose target based on current working set:
      var target = (currentOpener === BY_FROM) ? to : from;
      var newFScore = tentativeDistance + heuristic(otherSearchState.node, target);
      if (newFScore >= lMin) {
        // this can't be optimal path, as we have already found a shorter path.
        return;
      }
      otherSearchState.fScore = newFScore;

      if (otherSearchState.open === 0) {
        // Remember this node in the current set
        currentSet.push(otherSearchState);
        currentSet.updateItem(otherSearchState.heapIndex);

        otherSearchState.open = currentOpener;
      }

      // bingo! we found shorter path:
      otherSearchState.parent = cameFrom;
      otherSearchState.distanceToSource = tentativeDistance;
    }
  }
}


/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = nba;

var NodeHeap = __webpack_require__(4);
var heuristics = __webpack_require__(5);
var defaultSettings = __webpack_require__(6);
var makeNBASearchStatePool = __webpack_require__(16);

var NO_PATH = defaultSettings.NO_PATH;

module.exports.l2 = heuristics.l2;
module.exports.l1 = heuristics.l1;

/**
 * Creates a new instance of pathfinder. A pathfinder has just one method:
 * `find(fromId, toId)`.
 * 
 * This is implementation of the NBA* algorithm described in 
 * 
 *  "Yet another bidirectional algorithm for shortest paths" paper by Wim Pijls and Henk Post
 * 
 * The paper is available here: https://repub.eur.nl/pub/16100/ei2009-10.pdf
 * 
 * @param {ngraph.graph} graph instance. See https://github.com/anvaka/ngraph.graph
 * @param {Object} options that configures search
 * @param {Function(a, b)} options.heuristic - a function that returns estimated distance between
 * nodes `a` and `b`. This function should never overestimate actual distance between two
 * nodes (otherwise the found path will not be the shortest). Defaults function returns 0,
 * which makes this search equivalent to Dijkstra search.
 * @param {Function(a, b)} options.distance - a function that returns actual distance between two
 * nodes `a` and `b`. By default this is set to return graph-theoretical distance (always 1);
 * 
 * @returns {Object} A pathfinder with single method `find()`.
 */
function nba(graph, options) {
  options = options || {};
  // whether traversal should be considered over oriented graph.
  var oriented = options.oriented;
  var quitFast = options.quitFast;

  var heuristic = options.heuristic;
  if (!heuristic) heuristic = defaultSettings.heuristic;

  var distance = options.distance;
  if (!distance) distance = defaultSettings.distance;

  // During stress tests I noticed that garbage collection was one of the heaviest
  // contributors to the algorithm's speed. So I'm using an object pool to recycle nodes.
  var pool = makeNBASearchStatePool();

  return {
    /**
     * Finds a path between node `fromId` and `toId`.
     * @returns {Array} of nodes between `toId` and `fromId`. Empty array is returned
     * if no path is found.
     */
    find: find
  };

  function find(fromId, toId) {
    // I must apologize for the code duplication. This was the easiest way for me to
    // implement the algorithm fast.
    var from = graph.getNode(fromId);
    if (!from) throw new Error('fromId is not defined in this graph: ' + fromId);
    var to = graph.getNode(toId);
    if (!to) throw new Error('toId is not defined in this graph: ' + toId);

    pool.reset();

    // I must also apologize for somewhat cryptic names. The NBA* is bi-directional
    // search algorithm, which means it runs two searches in parallel. One is called
    // forward search and it runs from source node to target, while the other one
    // (backward search) runs from target to source.

    // Everywhere where you see `1` it means it's for the forward search. `2` is for 
    // backward search.

    // For oriented graph path finding, we need to reverse the graph, so that
    // backward search visits correct link. Obviously we don't want to duplicate
    // the graph, instead we always traverse the graph as non-oriented, and filter
    // edges in `visitN1Oriented/visitN2Oritented`
    var forwardVisitor = oriented ? visitN1Oriented : visitN1;
    var reverseVisitor = oriented ? visitN2Oriented : visitN2;

    // Maps nodeId to NBASearchState.
    var nodeState = new Map();

    // These two heaps store nodes by their underestimated values.
    var open1Set = new NodeHeap({
      compare: defaultSettings.compareF1Score,
      setNodeId: defaultSettings.setH1
    });
    var open2Set = new NodeHeap({
      compare: defaultSettings.compareF2Score,
      setNodeId: defaultSettings.setH2
    });

    // This is where both searches will meet.
    var minNode;

    // The smallest path length seen so far is stored here:
    var lMin = Number.POSITIVE_INFINITY;

    // We start by putting start/end nodes to the corresponding heaps
    // If variable names like `f1`, `g1` are too confusing, please refer
    // to makeNBASearchStatePool.js file, which has detailed description.
    var startNode = pool.createNewState(from);
    nodeState.set(fromId, startNode); 
    startNode.g1 = 0;
    var f1 = heuristic(from, to);
    startNode.f1 = f1;
    open1Set.push(startNode);

    var endNode = pool.createNewState(to);
    nodeState.set(toId, endNode);
    endNode.g2 = 0;
    var f2 = f1; // they should agree originally
    endNode.f2 = f2;
    open2Set.push(endNode)

    // the `cameFrom` variable is accessed by both searches, so that we can store parents.
    var cameFrom;

    // this is the main algorithm loop:
    while (open2Set.length && open1Set.length) {
      if (open1Set.length < open2Set.length) {
        forwardSearch();
      } else {
        reverseSearch();
      }

      if (quitFast && minNode) break;
    }

    var path = reconstructPath(minNode);
    return path; // the public API is over

    function forwardSearch() {
      cameFrom = open1Set.pop();
      if (cameFrom.closed) {
        return;
      }

      cameFrom.closed = true;

      if (cameFrom.f1 < lMin && (cameFrom.g1 + f2 - heuristic(from, cameFrom.node)) < lMin) {
        graph.forEachLinkedNode(cameFrom.node.id, forwardVisitor);
      }

      if (open1Set.length > 0) {
        // this will be used in reverse search
        f1 = open1Set.peek().f1;
      } 
    }

    function reverseSearch() {
      cameFrom = open2Set.pop();
      if (cameFrom.closed) {
        return;
      }
      cameFrom.closed = true;

      if (cameFrom.f2 < lMin && (cameFrom.g2 + f1 - heuristic(cameFrom.node, to)) < lMin) {
        graph.forEachLinkedNode(cameFrom.node.id, reverseVisitor);
      }

      if (open2Set.length > 0) {
        // this will be used in forward search
        f2 = open2Set.peek().f2;
      }
    }

    function visitN1(otherNode, link) {
      var otherSearchState = nodeState.get(otherNode.id);
      if (!otherSearchState) {
        otherSearchState = pool.createNewState(otherNode);
        nodeState.set(otherNode.id, otherSearchState);
      }

      if (otherSearchState.closed) return;

      var tentativeDistance = cameFrom.g1 + distance(cameFrom.node, otherNode, link);

      if (tentativeDistance < otherSearchState.g1) {
        otherSearchState.g1 = tentativeDistance;
        otherSearchState.f1 = tentativeDistance + heuristic(otherSearchState.node, to);
        otherSearchState.p1 = cameFrom;
        if (otherSearchState.h1 < 0) {
          open1Set.push(otherSearchState);
        } else {
          open1Set.updateItem(otherSearchState.h1);
        }
      }
      var potentialMin = otherSearchState.g1 + otherSearchState.g2;
      if (potentialMin < lMin) { 
        lMin = potentialMin;
        minNode = otherSearchState;
      }
    }

    function visitN2(otherNode, link) {
      var otherSearchState = nodeState.get(otherNode.id);
      if (!otherSearchState) {
        otherSearchState = pool.createNewState(otherNode);
        nodeState.set(otherNode.id, otherSearchState);
      }

      if (otherSearchState.closed) return;

      var tentativeDistance = cameFrom.g2 + distance(cameFrom.node, otherNode, link);

      if (tentativeDistance < otherSearchState.g2) {
        otherSearchState.g2 = tentativeDistance;
        otherSearchState.f2 = tentativeDistance + heuristic(from, otherSearchState.node);
        otherSearchState.p2 = cameFrom;
        if (otherSearchState.h2 < 0) {
          open2Set.push(otherSearchState);
        } else {
          open2Set.updateItem(otherSearchState.h2);
        }
      }
      var potentialMin = otherSearchState.g1 + otherSearchState.g2;
      if (potentialMin < lMin) {
        lMin = potentialMin;
        minNode = otherSearchState;
      }
    }

    function visitN2Oriented(otherNode, link) {
      // we are going backwards, graph needs to be reversed. 
      if (link.toId === cameFrom.node.id) return visitN2(otherNode, link);
    }
    function visitN1Oriented(otherNode, link) {
      // this is forward direction, so we should be coming FROM:
      if (link.fromId === cameFrom.node.id) return visitN1(otherNode, link);
    }
  }
}

function reconstructPath(searchState) {
  if (!searchState) return NO_PATH;

  var path = [searchState.node];
  var parent = searchState.p1;

  while (parent) {
    path.push(parent.node);
    parent = parent.p1;
  }

  var child = searchState.p2;

  while (child) {
    path.unshift(child.node);
    child = child.p2;
  }
  return path;
}


/***/ }),
/* 16 */
/***/ (function(module, exports) {

module.exports = makeNBASearchStatePool;

/**
 * Creates new instance of NBASearchState. The instance stores information
 * about search state, and is used by NBA* algorithm.
 *
 * @param {Object} node - original graph node
 */
function NBASearchState(node) {
  /**
   * Original graph node.
   */
  this.node = node;

  /**
   * Parent of this node in forward search
   */
  this.p1 = null;

  /**
   * Parent of this node in reverse search
   */
  this.p2 = null;

  /**
   * If this is set to true, then the node was already processed
   * and we should not touch it anymore.
   */
  this.closed = false;

  /**
   * Actual distance from this node to its parent in forward search
   */
  this.g1 = Number.POSITIVE_INFINITY;

  /**
   * Actual distance from this node to its parent in reverse search
   */
  this.g2 = Number.POSITIVE_INFINITY;


  /**
   * Underestimated distance from this node to the path-finding source.
   */
  this.f1 = Number.POSITIVE_INFINITY;

  /**
   * Underestimated distance from this node to the path-finding target.
   */
  this.f2 = Number.POSITIVE_INFINITY;

  // used to reconstruct heap when fScore is updated. TODO: do I need them both?

  /**
   * Index of this node in the forward heap.
   */
  this.h1 = -1;

  /**
   * Index of this node in the reverse heap.
   */
  this.h2 = -1;
}

/**
 * As path-finding is memory-intensive process, we want to reduce pressure on
 * garbage collector. This class helps us to recycle path-finding nodes and significantly
 * reduces the search time (~20% faster than without it).
 */
function makeNBASearchStatePool() {
  var currentInCache = 0;
  var nodeCache = [];

  return {
    /**
     * Creates a new NBASearchState instance
     */
    createNewState: createNewState,

    /**
     * Marks all created instances available for recycling.
     */
    reset: reset
  };

  function reset() {
    currentInCache = 0;
  }

  function createNewState(node) {
    var cached = nodeCache[currentInCache];
    if (cached) {
      // TODO: This almost duplicates constructor code. Not sure if
      // it would impact performance if I move this code into a function
      cached.node = node;

      // How we came to this node?
      cached.p1 = null;
      cached.p2 = null;

      cached.closed = false;

      cached.g1 = Number.POSITIVE_INFINITY;
      cached.g2 = Number.POSITIVE_INFINITY;
      cached.f1 = Number.POSITIVE_INFINITY;
      cached.f2 = Number.POSITIVE_INFINITY;

      // used to reconstruct heap when fScore is updated.
      cached.h1 = -1;
      cached.h2 = -1;
    } else {
      cached = new NBASearchState(node);
      nodeCache[currentInCache] = cached;
    }
    currentInCache++;
    return cached;
  }
}


/***/ }),
/* 17 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "mage", function() { return mage; });
/* harmony import */ var _character__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(10);
/* harmony import */ var _trade__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);
/* harmony import */ var _functions__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(0);



const DIFFICULT = 10;
const MEDIUM = 20;
const EASY = 30;
const SPECIAL = 500;
class Mage extends _character__WEBPACK_IMPORTED_MODULE_0__[/* Character */ "a"] {
    constructor() {
        super(...arguments);
        this.targetPriority = {
            "arcticbee": {
                "priority": EASY
            },
            "armadillo": {
                "priority": EASY
            },
            "bat": {
                "priority": EASY,
                "farmingPosition": {
                    "map": "cave",
                    "x": 1250,
                    "y": -800
                }
            },
            "bbpompom": {
                "coop": ["priest"],
                "holdPositionFarm": true,
                "holdAttackWhileMoving": true,
                "priority": DIFFICULT,
                "farmingPosition": {
                    "map": "winter_cave",
                    "x": 0,
                    "y": -100
                }
            },
            "bee": {
                "priority": EASY
            },
            "bigbird": {
                "priority": DIFFICULT,
                "holdAttackWhileMoving": true,
                "holdPositionFarm": true,
                "farmingPosition": {
                    "map": "main",
                    "x": 1450,
                    "y": -20
                }
            },
            "boar": {
                "priority": DIFFICULT,
                "holdAttackWhileMoving": true
            },
            "booboo": {
                "coop": ["priest"],
                "priority": DIFFICULT,
                "holdAttackWhileMoving": true,
                "holdPositionFarm": true,
                farmingPosition: {
                    "map": "spookytown",
                    "x": 250,
                    "y": -550
                }
            },
            "cgoo": {
                "holdAttackWhileMoving": true,
                "holdAttackInEntityRange": true,
                "priority": DIFFICULT
            },
            "crab": {
                "priority": EASY
            },
            "crabx": {
                "priority": MEDIUM
            },
            "croc": {
                "priority": EASY
            },
            "fireroamer": {
                "coop": ["priest", "warrior"],
                "priority": 0,
                "holdPositionFarm": true,
                "holdAttackWhileMoving": true,
                "farmingPosition": {
                    "map": "desertland",
                    "x": 150,
                    "y": -650
                }
            },
            "frog": {
                "priority": EASY
            },
            "ghost": {
                "coop": ["priest"],
                "priority": 0,
                "holdAttackWhileMoving": true,
                "holdPositionFarm": true,
                "farmingPosition": {
                    "map": "halloween",
                    "x": 300,
                    "y": -1200
                }
            },
            "goldenbat": {
                "priority": SPECIAL,
                "farmingPosition": {
                    "map": "cave",
                    "x": 1250,
                    "y": -800
                }
            },
            "goo": {
                "priority": EASY,
            },
            "greenjr": {
                "priority": DIFFICULT,
                "holdAttackInEntityRange": true,
                "holdAttackWhileMoving": true
            },
            "hen": {
                "priority": EASY
            },
            "iceroamer": {
                "holdAttackWhileMoving": true,
                "priority": DIFFICULT
            },
            "jr": {
                "priority": DIFFICULT,
                "holdAttackInEntityRange": true,
                "holdAttackWhileMoving": true
            },
            "mechagnome": {
                "coop": ["priest", "ranger"],
                "holdPositionFarm": true,
                "holdAttackWhileMoving": true,
                "priority": DIFFICULT,
                "farmingPosition": {
                    "map": "cyberland",
                    "x": 100,
                    "y": -150
                }
            },
            "minimush": {
                "priority": EASY
            },
            "mrgreen": {
                "priority": SPECIAL
            },
            "mrpumpkin": {
                "priority": SPECIAL
            },
            "osnake": {
                "priority": EASY
            },
            "mvampire": {
                priority: 0,
                "coop": ["priest"]
            },
            "phoenix": {
                "priority": SPECIAL
            },
            "pinkgoo": {
                "priority": 1000
            },
            "plantoid": {
                "priority": DIFFICULT,
                "holdAttackInEntityRange": true,
                "holdAttackWhileMoving": true
            },
            "poisio": {
                "priority": EASY
            },
            "porcupine": {
                "priority": EASY
            },
            "prat": {
                "holdAttackWhileMoving": true,
                "holdPositionFarm": true,
                "holdAttackInEntityRange": true,
                "priority": DIFFICULT,
                farmingPosition: {
                    "map": "level1",
                    "x": -296.5,
                    "y": 557.5
                }
            },
            "rat": {
                "priority": EASY
            },
            "rooster": {
                "priority": EASY
            },
            "scorpion": {
                "priority": MEDIUM
            },
            "snake": {
                "priority": EASY,
                farmingPosition: {
                    "map": "main",
                    "x": -74,
                    "y": 1904
                }
            },
            "snowman": {
                "priority": SPECIAL
            },
            "spider": {
                "priority": MEDIUM
            },
            "squig": {
                "priority": EASY,
            },
            "squigtoad": {
                "priority": EASY
            },
            "stoneworm": {
                "holdAttackInEntityRange": true,
                "holdAttackWhileMoving": true,
                "priority": DIFFICULT
            },
            "tortoise": {
                "priority": EASY
            },
            "wolf": {
                "coop": ["priest", "warrior"],
                "priority": 0,
                "holdPositionFarm": true,
                "holdAttackWhileMoving": true,
                "farmingPosition": {
                    "map": "winterland",
                    "x": 375,
                    "y": -2475
                }
            },
            "wolfie": {
                "priority": 0,
                "holdAttackInEntityRange": true,
                "holdAttackWhileMoving": true
            },
            "xscorpion": {
                "priority": DIFFICULT,
                "holdAttackInEntityRange": true,
                "holdAttackWhileMoving": true,
                "holdPositionFarm": true,
                farmingPosition: {
                    "map": "halloween",
                    "x": -230,
                    "y": 570
                }
            }
        };
        this.mainTarget = "prat";
    }
    async run() {
        await super.run();
        this.energizeLoop();
        this.cburstLoop();
    }
    async mainLoop() {
        try {
            Object(_trade__WEBPACK_IMPORTED_MODULE_1__[/* transferItemsToMerchant */ "j"])("earthMer", this.itemsToKeep);
            Object(_trade__WEBPACK_IMPORTED_MODULE_1__[/* transferGoldToMerchant */ "i"])("earthMer", 100000);
            Object(_trade__WEBPACK_IMPORTED_MODULE_1__[/* sellUnwantedItems */ "h"])(this.itemsToSell);
            await super.mainLoop();
        }
        catch (error) {
            console.error(error);
            setTimeout(async () => { this.mainLoop(); }, 250);
        }
    }
    cburstLoop() {
        try {
            const targets = [];
            let manaUse = G.skills.cburst.mp;
            for (const target of this.getTargets(10, parent.character.range)) {
                if (target.hp > 100)
                    continue;
                if (!this.wantToAttack(target, "cburst"))
                    continue;
                const manaCost = target.hp / G.skills.cburst.ratio;
                if (manaUse + manaCost > parent.character.mp)
                    break;
                manaUse += manaCost;
                targets.push([target.id, manaCost]);
            }
            if (Object(_functions__WEBPACK_IMPORTED_MODULE_2__[/* isAvailable */ "n"])("cburst") && targets.length) {
                use_skill("cburst", targets);
                reduce_cooldown("cburst", Math.min(...parent.pings));
            }
        }
        catch (error) {
            console.error(error);
        }
        setTimeout(() => { this.cburstLoop(); }, Object(_functions__WEBPACK_IMPORTED_MODULE_2__[/* getCooldownMS */ "f"])("cburst"));
    }
    energizeLoop() {
        try {
            if (Object(_functions__WEBPACK_IMPORTED_MODULE_2__[/* isAvailable */ "n"])("energize")) {
                const partyMembers = Object(_functions__WEBPACK_IMPORTED_MODULE_2__[/* getEntities */ "i"])({ isPartyMember: true, isWithinDistance: G.skills["energize"].range, isRIP: false }).sort((a, b) => {
                    return (a.mp / a.max_mp) < (b.mp / b.max_mp) ? -1 : 1;
                });
                for (const entity of partyMembers) {
                    use_skill("energize", entity);
                    reduce_cooldown("energize", Math.min(...parent.pings));
                    break;
                }
            }
        }
        catch (error) {
            console.error(error);
        }
        setTimeout(() => { this.energizeLoop(); }, Object(_functions__WEBPACK_IMPORTED_MODULE_2__[/* getCooldownMS */ "f"])("energize"));
    }
}
const mage = new Mage();



/***/ })
/******/ ]);