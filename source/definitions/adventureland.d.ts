declare global {
  interface Window {
    close_merchant();
    distance(from: IPosition | PositionReal, to: IPosition | PositionReal): number;
    exchange(inventoryPosition: number);
    open_merchant(standInventoryPostion: number);

    character: CharacterEntity;
    chests: {
      [id: string]: ChestInfo;
    };
    entities: { [id: string]: Entity };
    next_skill: { [T in SkillName]?: Date };
    npcs: GMapsNPC[];
    party: { [T in string]: IPosition & {
      level: number;
      /** This number refers to the percent of gold you get when one of the party members loots a chest */
      share: number;
      type: CharacterType;
    } };
    /** Contains the name of every character in your party */
    party_list: string[];
    /** Contains a list of the last 40 ping response times */
    pings: number[];
    server_identifier: ServerIdentifier;
    server_region: ServerRegion;
    socket: SocketIO.Socket;
    S: { [T in MonsterName]?: IPosition & {
      map: string;
      live: boolean;
      hp: number;
      max_hp: number;
      /** The character name that the monster is currently attacking */
      target?: string;
    } } & {
      valentines?: boolean;
    };
  }

  /**
   * Contains information about what bank packs are available.
   * [0]: The map where you can access this bank pack
   * [1]: The cost to unlock this bank pack if you buy with gold
   * [2]: The cost to unlock this bank pack if you buy with shells
   */
  const bank_packs: { [T in BankPackType]: [MapName, number, number] }

  /**
   * Accept a magiport request from a mage
   * @param name The name of the mage offering a magiport
   */
  function accept_magiport(name: string): void
  /**
   * Accept the party invititation of another character (i.e. join their party)
   * @param name The name of the character offering a party invite
   */
  function accept_party_invite(name: string): void
  /**
   * Accept the request of another character to join your party (i.e. let them join your party)
   * @param name The name of the character to allow in to your party
   */
  function accept_party_request(name: string): void
  /**
   * Activate an item (likely a booster)
   * @param inventoryPosition The position of the item in your inventory
   */
  function activate(inventoryPosition: number): void
  /**
   * Attack another monster or a player with your normal attack
   * @param target The target entity to attack (`parent.entities`)
   * @returns A promise containing information about the attack, such as the projectile, or a promise cointaining the error why the attack didn't work
   */
  // TODO: Change the "any" to the promise that this function returns
  function attack(target: Entity): Promise<any>
  /**
   * Crafts the given item if you can craft that item, you have the required items, and you have enough gold.
   * @param name The name of the item to craft (`G.craft`)
   * @returns A string containing the basic reason it failed, or nothing upon success
   */
  function auto_craft(name: ItemName): string | void
  /**
   * Deposits the given amount of gold in the bank. You must be in the bank to actually deposit gold.
   * @param amount The amount of gold to deposit
   */
  function bank_deposit(amount: number): void
  /**
   * Deposits the given item in to the given bank. If no `pack` and `packPosition` is given, the game will try to deposit in to the first available slot. You must be in the bank to actually deposit items.
   * @param inventoryPosition The position of the item in your inventory
   * @param pack The bank pack that you want to deposit the item in to
   * @param packPosition The position of the item in the bank pack you want to deposit the item in to
   */
  function bank_store(inventoryPosition: number, pack?: BankPackType, packPosition?: number): void
  /**
   * Withdraws the given amount of gold from the bank. You must be in the bank to actually withdraw gold.
   * @param amount The amount of gold to withdraw
   */
  function bank_withdraw(amount: number): void
  /**
   * Buy an item from an NPC. This function can buy things with gold or shells.
   * @param item The name of the item you wish to purchase (`G.items`)
   * @param quantity How many items to buy. The default is to buy one item
   */
  // TODO: Change the "any" to the promise that this function returns
  function buy(item: ItemName, quantity?: number): Promise<any>
  /**
   * Buy an item from an NPC using only gold. If you want to buy things with shells, use `buy_with_shells`.
   * @param item The name of the item you wish to purchase (`G.items`)
   * @param quantity How many items to buy. The default is to buy one item
   */
  // TODO: Change the "any" to the promise that this function returns
  function buy_with_gold(item: ItemName, quantity?: number): Promise<any>
  /**
   * Buy an item from an NPC using only shells. If you want to buy things with gold, use `buy_with_gold`
   * @param item The name of the item you wish to purchase (`G.items`)
   * @param quantity How many items to buy. The default is to buy one item
   */
  // TODO: Change the "any" to the promise that this function returns
  function buy_with_shells(item: ItemName, quantity?: number): Promise<any>
  /**
   * Check if you can attack the given target. This function also checks status conditions by calling `parent.is_disabled(character)` which checks statuses such as `rip` and `stunned`.
   * NOTE: If you just want to check the cooldown, consider using `is_on_cooldown("attack")`
   * @param target The target entity to check if you can attack (`parent.entities`)
   * @returns TRUE if the target is attackable, FALSE otherwise.
   */
  function can_attack(target: Entity): boolean
  /**
   * Check if you can heal the given target.
   * @param target The target entity to check if you can heal (`parent.entities`)
   */
  function can_heal(target: Entity): boolean
  /**
   * Checks if the you can move from `[position.x, position.y] to [position.going_x, position.going_y]
   * @param entity The position you want to check is movable
   * @returns TRUE if you can move there, FALSE otherwise
   */
  function can_move(position: PositionMovable & { base: any }): boolean
  /**
   * Checks if you can move your character to the given destination on your current map
   * @param destination A position object containing the destination coordinates
   * @returns TRUE if you can move there, FALSE otherwise
   */
  function can_move_to(destination: { real_x: number, real_y: number }): boolean
  /**
   * Checks if you can move your character to the given destination on your current map
   * @param x The x-coordinate that you want to move to
   * @param y The y-coordinate that you want to move to
   * @returns TRUE if you can move there, FALSE otherwise
   */
  function can_move_to(x: number, y: number): boolean
  /**
   * Checks if the given entity can transport. If given your own character, it will also check if you are already transporting
   * @param entity The entity to check
   * @returns TRUE if you are not currently transporting, and can transport, FALSE otherwise
   */
  function can_transport(entity: Entity): boolean
  /**
   * Checks if the skill is usable by the given character. Also checks if the given skill is on cooldown.
   * @param skill The skill to check
   * @param returns TRUE if not on cooldown, FALSE otherwise.
   */
  function can_use(skill: SkillName): boolean
  /**
   * Checks if you can use the given door from the given position
   * @param map A given map (from `G.maps`)
   * @param door The given door (from `G.maps[map].doors`)
   * @param x The x position on the map
   * @param y The y position on the map
   * @returns TRUE if the door can be used from the given position, FALSE otherwise
   */
  function can_use_door(map: MapName, door: DoorInfo, x: number, y: number): boolean
  /**
   * Checks if the given entity can walk (i.e. move). If given your own character, it will also check if you are already transporting.
   * @param entity The entity to check
   * @returns TRUE if you are not currently transporting, and can walk, FALSE otherwise
   */
  function can_walk(entity: Entity): boolean
  /**
   * Changes servers. This will reload the page (the URL will change to match the server given), which means your code will also reload.
   * @param region The region to change to (e.g. ASIA)
   * @param identifier The server identifier to change to (e.g. PVP)
   */
  function change_server(region: ServerRegion, identifier: ServerIdentifier): void
  /**
   * Changes the target of the player. Use in association with `get_targeted_monster()`.
   * @param target A given target (from `parent.entities`)
   * @param public If true, it will send the new target to the server.
   */
  function change_target(target: Entity, public: boolean): void
  /**
   * Clears all drawings from the window. Use this function to clean up `draw_circle` and `draw_line`.
   */
  function clear_drawings(): void
  /**
   * Runs the given code snippet for the given character.
   * @param character The name of the character
   * @param code The code snippet to run
   */
  // TODO: I think the code snippet is the actual code, not the name of a saved piece of code, but I need to confirm.
  function command_character(character: string, code: string): void
  /**
   * Compounds the three items for a chance at obtaining 1 higher level item of the same kind.
   * @param item1 The inventory position of the first item
   * @param item2 The inventory position of the second item
   * @param item3 The inventory position of the third item
   * @param scroll The inventory position of the scroll to use to combine the three items
   * @param offering The inventory position of the offering (e.g. Primordial Essence) to use
   */
  // TODO: Change the "any" to the promise that this function returns
  function compound(item1: number, item2: number, item3: number, scroll: number, offering?: number): Promise<any>
  /**
   * Consumes the given item (e.g. Candy Pop)
   * @param item The inventory position of the item
   */
  function consume(item: number): void
  /**
   * Crafts the given items. Note: Some recipes might require gold to craft, too.
   * @param item0 The inventory position of the item to be put in the top left crafting slot
   * @param item1 The inventory position of the item to be put in the top middle crafting slot
   * @param item2 The inventory position of the item to be put in the top right crafting slot
   * @param item3 The inventory position of the item to be put in the center left crafting slot
   * @param item4 The inventory position of the item to be put in the center middle crafting slot
   * @param item5 The inventory position of the item to be put in the center right crafting slot
   * @param item6 The inventory position of the item to be put in the bottom left crafting slot
   * @param item7 The inventory position of the item to be put in the bottom middle crafting slot
   * @param item8 The inventory position of the item to be put in the bottom right crafting slot
   */
  function craft(item0: number, item1?: number, item2?: number, item3?: number, item4?: number, item5?: number, item6?: number, item7?: number, item8?: number): void
  /**
   * Overrides the character to walk at `Math.min(parent.character.speed, cruise_speed)` speed.
   * @param speed The speed at which to walk at
   */
  function cruise(speed: number): void
  /** Feed this function a value like (character.apiercing - target.armor) and it spits out a multiplier so you can adjust your expected damage */
  function damage_multiplier(difference: number): number
  function distance(from: IPosition | PositionReal, to: IPosition | PositionReal): number
  /** Draws a circle on the map */
  function draw_circle(x: number, y: number, radius: number, size: number, color: number)
  function equip(inventoryPostion: number, slot?: SlotType)
  function exchange(inventoryPosition: number)
  function game_log(message: string, color?: string)
  function get_targeted_monster(): Entity
  function heal(target: Entity)
  /** Checks whether or not we can attack other players */
  function is_pvp(): boolean
  function is_transporting(entity: Entity): boolean
  /** 0 = normal, 1 = high, 2 = rare */
  function item_grade(item: ItemInfo): -1 | 0 | 1 | 2
  /** Returns the inventory position of the item, or -1 if it's not found */
  function locate_item(item: ItemName): number
  /**
   * The promise returned is not upon arrival at the destination, it's upon the server confirming it recieved your request.
   * @param x 
   * @param y 
   */
  function move(x: number, y: number): Promise<void>
  function reduce_cooldown(skill: SkillName, ms: number): void
  function respawn()
  /** Quantity defaults to 1 if not set */
  function sell(inventoryPostion: number, quantity?: number)
  function send_cm(to: string, data: any)
  function send_gold(to: string, amount: number)
  function send_item(to: string, inventoryPostion: number, quantity?: number)
  function send_local_cm(to: string, data: any)
  /** If isRequest is set to true, it will send a party request */
  function send_party_invite(name: string, isRequest?: boolean)
  function send_party_request(name: string)
  function set_message(text: string, color?: string)
  function simple_distance(from: IPosition | PositionReal, to: IPosition | PositionReal): number
  function smart_move(destination: IPosition | MapName | MonsterName, callback?: () => void)
  function start_character(name: string, codeName?: string)
  function stop(action?: string)
  function stop_character(name: string)
  /** Swap the position of two items in the player's inventory */
  function swap(index1: number, index2: number)
  /** For buying things off players' merchants */
  function trade_buy(target: Entity, trade_slot: number)
  function transport(map: MapName, spawn?: number)
  function unequip(slot: SlotType | TradeSlotType)
  function upgrade(itemInventoryPosition: number, scrollInventoryPosition: number, offeringInventoryPosition?: number): Promise<any>
  function use_skill(name: "3shot" | "5shot", targets: Entity[]): Promise<any>[]
  /** For destination, it's an array of [x, y] */
  function use_skill(name: "blink", destination: [number, number])
  /** The string is the ID of the target, the number is how much mana to spend on the attack */
  function use_skill(name: "cburst", targets: [string, number][]): Promise<any>
  function use_skill(name: "energize", target: Entity, mp: number): Promise<any>
  function use_skill(name: "magiport", target: string): Promise<any>
  function use_skill(name: "throw", target: Entity, inventoryPostion: number): Promise<any>
  function use_skill(name: "town"): Promise<any>
  function use_skill(name: SkillName, target?: Entity, extraArg?: any): Promise<any>
  function trade(inventoryPosition: number, tradeSlot: number | TradeSlotType, price: number, quantity: number): void
  /** This function uses move() if it can, otherwise it uses smart_move() */
  function xmove(x: number, y: number)

  /** Contains information about smart_move() */
  let smart: IPosition & {
    /** If searching and false, we are still searching. If  */
    found: boolean;
    /** If .moving == true, we are moving or searching */
    moving: boolean;
    plot: PositionSmart[];
    /** If ().moving == false && .searching == true), we are searching for a path. */
    searching: boolean;
    start_x: number;
    start_y: number;
    /** A settable flag. If true, smart_move will use town teleports to move around */
    use_town: boolean;
  }

  let G: GData
}

export type GData = {
  base_gold: { [T in MonsterName]?: {
    /** The base amount of gold this monster drops if you kill it in the given map */
    [T in MapName]?: number
  } };
  classes: { [T in CharacterType]: {
    /** A list of items that the character can equip using both hands */
    doublehand: { [T in WeaponType]?: {
      /** Modifier on the given stat for equipping this type of item */
      [T in StatType]?: number
    } };
    /** A list of items that the character can equip in its mainhand */
    mainhand: { [T in WeaponType]?: {
      /** Modifier on the given stat for equipping this type of item */
      [T in StatType]?: number
    } };
    /** A list of items that the character can equip in its offhand */
    offhand: { [T in WeaponType]?: {
      /** Modifier on the given stat for equipping this type of item */
      [T in StatType]?: number
    } };
  } };
  conditions: { [T in ConditionName]: {
    /** Indicates whether the condition is a penalty or not */
    bad: boolean;
    buff: boolean;
    /** The length the condition lasts in ms */
    duration: number;
  } & {
      [T in StatType]?: number
    } };
  dismantle: { [T in ItemName]?: {
    /** The cost of dismantling the item */
    cost: number;
    /** A list of items you will get if you dismantle. If the number is < 1, it indicates the probability of getting that item. */
    items: [number, ItemName][];
  } };
  items: { [T in ItemName]: GItem };
  geometry: {
    [T in MapName]: {
      max_x: number;
      max_y: number;
      min_x: number;
      min_y: number;
      /* The line is from ([0], [1]) to ([0], [2]) */
      x_lines: [number, number, number][];
      /* The line is from ([1], [0]) to ([2], [0]) */
      y_lines: [number, number, number][];
    }
  };
  maps: { [T in MapName]: {
    doors: DoorInfo[];
    /** The name of the map, if this changes, the map layout probably changed. */
    key: string;
    ignore?: boolean;
    instance?: boolean;
    irregular?: boolean;
    monsters: {
      count: number;
      boundary?: [number, number, number, number];
      boundaries?: [MapName, number, number, number, number][];
      type: MonsterName;
    }[];
    /** Not sure what this means. Might mean that only one character of the players can be here at a time. */
    mount: boolean;
    no_bounds?: boolean;
    npcs: GMapsNPC[];
    on_death: number;
    ref: {
      [id: string]: IPosition & {
        map: MapName;
        in: MapName;
        id: string;
      };
    };
    /**
     * [0]: x position where you spawn
     * [1]: y position where you spawn
     * [2]: Direction to face the character when you spawn
     */
    spawns: [number, number, number?][];
  } };
  monsters: { [T in MonsterName]: GMonster };
  npcs: { [T in NPCType]: {
    id: NPCType;
    /** Full name of NPC */
    name: string;
    /** A list of places you can transport to with this NPC. The number is the spawn */
    places?: {
      [T in MapName]?: number
    };
    role: NPCRole;
  } };
  // TODO: Get list of quest names
  quests: { [T in string]: PositionReal & {
    id: NPCType;
  } };
  skills: { [T in SkillName]: {
    apiercing?: number;
    class?: CharacterType[];
    cooldown: number;
    cooldown_multiplier?: number;
    damage_multiplier?: number;
    level?: number;
    /** Can we use this skill on monsters? */
    monster?: boolean;
    /** MP Cost for skill */
    mp?: number;
    /** The name of the skill */
    name: string;
    range?: number;
    range_multiplier?: number;
    /** For MP use skills on the mage, 1 mp will equal this much damage */
    ratio?: number;
    /** The cooldown this skill shares with another skill */
    share?: SkillName;
    /** The item(s) required to use this skill */
    slot?: [SlotType, ItemName][];
    /** Does this skill require a single target? (Don't use an array) */
    target?: boolean;
    /** Does this skill require multiple targets? (Use an array) */
    targets?: boolean;
    /** The weapon type needed to use this skill */
    wtype?: WeaponType;
  } };
}

// TODO: Get a better name for this.
// TODO: Get a better naming convention for G data
export type GMapsNPC = {
  id: NPCType;
  name?: string;
  position: [number, number];
}

export type GMonster = {
  attack: number;
  damage_type: DamageType;
  frequency: number;
  hp: number;
  range: number;
  speed: number;
  xp: number;
}

export type GItem = {
  buy?: boolean;
  /** Contains information about what stats the item will gain with each compound level. Set if the item is compoundable. */
  compound?: {
    [T in StatType]?: number
  };
  damage?: DamageType;
  /** Refers to how many items are needed to exchange (see .quest as well!) */
  e?: number;
  /** Cost of the item in gold, if an NPC were to sell this item */
  g: number;
  /** The first number refers to what level the item begins being "high" grade, the second for "rare" */
  grades?: [number, number];
  /** The full name of the item */
  name: string;
  id: ItemName;
  // TODO: Add a type for quests
  /** Indicates the "quest" that this item is needed to complete */
  quest: string;
  /** Indicates how many of this items you can stack. Set if the item is stackable. */
  s: number;
  /** Contains information about what stats the item will gain with each upgrade level. Set if the item is upgradable. */
  upgrade?: {
    [T in StatType]?: number
  };
  type: ItemType;
  wtype: WeaponType;
} & { [T in StatType]?: number }

/**
* For the current character
*/
export type CharacterEntity = Entity & {
  bank?: BankInfo;
  /** Channeling actions */
  c: {
    town?: {
      ms: number;
    };
  };
  ctype: CharacterType;
  items: ItemInfo[];
  /** Amount of gold the player has in its inventory */
  gold: number;
  /** Gold multiplier */
  goldm: number;
  /** Luck multiplier. */
  luckm: number;
  ping: number;
  // TODO: Actually figure this out
  q: {
    compound?: {

    };
    upgrade?: {
      ms: number;
      len: number;
      num: number;
    };
    exchange?: {

    };
  };
  /** A bit of extra range that we can use to attack further monsters. It's variable. If you attack a monster using this extra range, it decreases for the next attack. */
  xrange: number;
}

export type Entity = PositionMovable & {
  /** If set, attacks only do 1 damage */
  "1hp": number;
  /** Only set if the entity is a monster */
  aggro: number;
  apiercing: number;
  armor: number;
  attack: number;
  base: {
    "h": number;
    "v": number;
    "vn": number;
  };
  cooperative: boolean;
  ctype: CharacterType | NPCType;
  damage_type?: DamageType;
  /** A percent chance to avoid physical attacks */
  evasion: number;
  /** Related to attack speed, I think it's equal to attacks per second */
  frequency: number;
  hp: number;
  /** This value is also the key for the object in parent.entities */
  id: string;
  immune: boolean;
  /** When were the ms values last updated? */
  last_ms: Date;
  level: number;
  max_hp: number;
  max_mp: number;
  /** Is the character currently moving? */
  moving: boolean;
  mp: number;
  /** The MP cost for doing an attack */
  mp_cost: number;
  /** If the entity is a monster, it is set */
  mtype?: MonsterName;
  /** Contains the full name of the monster */
  name: string;
  /** Is set if the entity is an NPC, undefined otherwise */
  npc?: string;
  /** Attack range */
  range: number;
  real_x: number;
  real_y: number;
  resistance: number;
  /** Only set if the entity is a character. If true, the player is dead. */
  rip?: boolean;
  rpiercing: number;
  s: StatusInfo;
  /** Set if the entity is a player */
  slots: SlotInfo;
  speed: number;
  // TODO: Add the parameters to this object
  /** If set, the merchant has a stand open */
  standed?: any;
  /** Set if we are under the status effect "stoned" */
  stoned?: boolean;
  /** Set if the player or monster is targeting something */
  target: string;
  type: "character" | "monster";
  vx: number;
  vy: number;
}

export type BankInfo = {
  [T in Exclude<BankPackType, "gold">]?: ItemInfo[]
} & {
  gold: number;
}

export type ChestInfo = PositionReal & {
  alpha: number;
  skin: "chest3" | string;
}

export type ItemInfo = {
  /** If true, the entity is buying this item */
  b?: boolean;
  /** Set if the item is compoundable or upgradable */
  level?: number;
  name: ItemName;
  /** How many of this item we have. Set if the item is stackable. */
  q?: number;
  /** If set, name == placeholder, and we are upgrading or compounding something */
  p?: {
    chance: number;
    name: ItemName;
    level: number;
    scroll: ItemName;
    nums: number[];
  } | "shiny" | "glitched" | "superfast";
  /** If set, the item is for sale, or purchase */
  rid?: string;
}

export type SlotInfo = {
  [T in SlotType]: ItemInfo
} & {
    [T in TradeSlotType]?: ItemInfo & {
      /** Number of minutes remaining for giveaway items */
      giveaway?: number;
      /** List of character IDs that are in the giveaway */
      list: string[];
      price: number;
      rid: string;
    }
  }

/**
 * Contains elements that describe a door
 * [0]: The x-position of the door
 * [1]: The y-position of the door
 * [2]: The width of the door
 * [3]: The height of the door
 * [4]: The map that this door leads to (use in combination with [5] (spawn))
 * [5]: The spawn that this door leads to (use in combination with [4] (map))
 * [6]: The spawn that this door is close to on the current map
 * [7]: ??? Maybe "locked" or "ulocked"?
 * [8]: ??? There's reference to "complicated" in smart_move?
 */
export type DoorInfo = [number, number, number, number, MapName, number?, number?, string?, string?]

export type StatusInfo = {
  [T in ConditionName]?: {
    /** How many ms left before this condition expires */
    ms: number;
  } } & {
    coop?: {
      id: string;
      ms: number;
      p: number;
    };
    mluck?: {
      ms: number;
      /** The ID of the merchant who cast mluck */
      f: string;
    };
    monsterhunt?: {
      ms: number;
      /** The server ID where the monster hunt is valid */
      sn: string;
      /** Number of monsters remaining to kill */
      c: number;
      /** What monster we have to kill */
      id: MonsterName;
    };
    citizen0aura?: {
      ms: number;
      luck: number;
    };
    citizen4aura?: {
      ms: number;
      gold: number;
    };
  }

export type PositionReal = IPosition & {
  map: MapName;
  real_x?: number;
  real_y?: number;
}

export type PositionMovable = PositionReal & {
  from_x?: number;
  from_y?: number;
  going_x: number;
  going_y: number;
}

export type PositionSmart = IPosition & {
  map: MapName;
  transport?: boolean;
  i?: number;
  s?: number;
}

export type IPosition = {
  /**
   * Contains the name of the map
   */
  map?: MapName;
  x: number;
  y: number;
}

// TODO: Get all types (from G?)
export type CharacterType =
  | "mage"
  | "merchant"
  | "paladin"
  | "priest"
  | "ranger"
  | "rogue"
  | "warrior"

// TODO: Get all types (from G?)
export type DamageType =
  | "magical"
  | "physical"

// TODO: Get all types
export type ItemType =
  | "box"
  | "cape"
  | "gem"
  | "material"
  | "misc"
  | "quest"

// TODO: Get all stat types
export type StatType =
  | "armor"
  | "attack"
  | "dex"
  | "for"
  | "frequency"
  | "gold"
  | "hp"
  | "int"
  | "lifesteal"
  | "luck"
  | "mp_cost"
  | "range"
  | "resistance"
  | "speed"
  | "str"
  | "vit"

export type WeaponType =
  | "axe"
  | "basher"
  | "bow"
  | "crossbow"
  | "dagger"
  | "dartgun"
  | "fist"
  | "mace"
  | "pmace"
  | "rapier"
  | "short_sword"
  | "spear"
  | "staff"
  | "stars"
  | "sword"
  | "wand"
  | "wblade"

export type MonsterName =
  | "arcticbee"
  | "armadillo"
  | "bat"
  | "bbpompom"
  | "bee"
  | "bigbird"
  | "bluefairy"
  | "boar"
  | "booboo"
  | "cgoo"
  | "chestm"
  | "crab"
  | "crabx"
  | "croc"
  | "d_wiz"
  | "dknight2"
  | "dragold"
  | "eelemental"
  | "ent"
  | "felemental"
  | "fireroamer"
  | "franky"
  | "frog"
  | "fvampire"
  | "ghost"
  | "goblin"
  | "goldenbat"
  | "goo"
  | "greenfairy"
  | "greenjr"
  | "grinch"
  | "gscorpion"
  | "hen"
  | "iceroamer"
  | "jr"
  | "jrat"
  | "kitty1"
  | "kitty2"
  | "kitty3"
  | "kitty4"
  | "ligerx"
  | "mechagnome"
  | "minimush"
  | "mole"
  | "mrgreen"
  | "mrpumpkin"
  | "mummy"
  | "mvampire"
  | "nelemental"
  | "nerfedmummy"
  | "oneeye"
  | "osnake"
  | "phoenix"
  | "pinkgoblin"
  | "pinkgoo"
  | "plantoid"
  | "poisio"
  | "porcupine"
  | "pppompom"
  | "prat"
  | "puppy1"
  | "puppy2"
  | "puppy3"
  | "puppy4"
  | "rat"
  | "redfairy"
  | "rooster"
  | "rudolph"
  | "scorpion"
  | "skeletor"
  | "snake"
  | "snowman"
  | "spider"
  | "squig"
  | "squigtoad"
  | "stompy"
  | "stoneworm"
  | "target"
  | "target_a500"
  | "target_a750"
  | "target_ar500red"
  | "target_ar900"
  | "target_r500"
  | "target_r750"
  | "tortoise"
  | "wabbit"
  | "welemental"
  | "wolf"
  | "wolfie"
  | "xscorpion"

export type BankPackType =
  | "gold"
  | "items0"
  | "items1"
  | "items10"
  | "items11"
  | "items12"
  | "items13"
  | "items14"
  | "items15"
  | "items16"
  | "items17"
  | "items18"
  | "items19"
  | "items2"
  | "items20"
  | "items21"
  | "items22"
  | "items23"
  | "items24"
  | "items25"
  | "items26"
  | "items27"
  | "items28"
  | "items29"
  | "items3"
  | "items30"
  | "items31"
  | "items32"
  | "items33"
  | "items34"
  | "items35"
  | "items36"
  | "items37"
  | "items38"
  | "items39"
  | "items4"
  | "items40"
  | "items41"
  | "items42"
  | "items43"
  | "items44"
  | "items45"
  | "items46"
  | "items47"
  | "items5"
  | "items6"
  | "items7"
  | "items8"
  | "items9"

export type SlotType =
  | "amulet"
  | "belt"
  | "cape"
  | "chest"
  | "earring1"
  | "earring2"
  | "elixir"
  | "gloves"
  | "helmet"
  | "mainhand"
  | "offhand"
  | "orb"
  | "pants"
  | "ring1"
  | "ring2"
  | "shoes"

export type TradeSlotType =
  | "trade1"
  | "trade2"
  | "trade3"
  | "trade4"
  | "trade5"
  | "trade6"
  | "trade7"
  | "trade8"
  | "trade9"
  | "trade10"
  | "trade11"
  | "trade12"
  | "trade13"
  | "trade14"
  | "trade15"
  | "trade16"

export type ConditionName =
  | "authfail"
  | "blink"
  | "burned"
  | "charging"
  | "charmed"
  | "darkblessing"
  | "easterluck"
  | "eburn"
  | "eheal"
  | "energized"
  | "fingered"
  | "frozen"
  | "fullguard"
  | "hardshell"
  | "holidayspirit"
  | "invincible"
  | "licenced"
  | "marked"
  | "mcourage"
  | "mlifesteal"
  | "mluck"
  | "monsterhunt"
  | "notverified"
  | "phasedout"
  | "poisoned"
  | "poisonous"
  | "power"
  | "reflection"
  | "rspeed"
  | "slowness"
  | "stack"
  | "stoned"
  | "stunned"
  | "sugarrush"
  | "tangled"
  | "warcry"
  | "weakness"
  | "withdrawal"
  | "xpower"
  | "xshotted"

export type ItemName =
  | "5bucks"
  | "ale"
  | "amuletofm"
  | "angelwings"
  | "apiercingscroll"
  | "apologybox"
  | "armorbox"
  | "armorring"
  | "armorscroll"
  | "ascale"
  | "axe3"
  | "bandages"
  | "basher"
  | "basketofeggs"
  | "bataxe"
  | "bcandle"
  | "bcape"
  | "beewings"
  | "bfang"
  | "bfur"
  | "blade"
  | "blue"
  | "bottleofxp"
  | "bow"
  | "bow4"
  | "bowofthedead"
  | "bronzeingot"
  | "bronzenugget"
  | "brownegg"
  | "btusk"
  | "bugbountybox"
  | "bunnyears"
  | "bunnyelixir"
  | "bwing"
  | "cake"
  | "candy0"
  | "candy0v2"
  | "candy0v3"
  | "candy1"
  | "candy1v2"
  | "candy1v3"
  | "candycane"
  | "candycanesword"
  | "candypop"
  | "cape"
  | "carrot"
  | "carrotsword"
  | "cclaw"
  | "cdarktristone"
  | "cdragon"
  | "charmer"
  | "chrysalis0"
  | "claw"
  | "coal"
  | "coat"
  | "coat1"
  | "cocoon"
  | "computer"
  | "confetti"
  | "cosmo0"
  | "cosmo1"
  | "cosmo2"
  | "cosmo3"
  | "cosmo4"
  | "crabclaw"
  | "critscroll"
  | "crossbow"
  | "cscale"
  | "cscroll0"
  | "cscroll1"
  | "cscroll2"
  | "cscroll3"
  | "cshell"
  | "ctristone"
  | "cupid"
  | "cxjar"
  | "dagger"
  | "daggerofthedead"
  | "darktristone"
  | "dartgun"
  | "dexamulet"
  | "dexbelt"
  | "dexearring"
  | "dexring"
  | "dexscroll"
  | "dragondagger"
  | "drapes"
  | "dreturnscroll"
  | "dstones"
  | "ecape"
  | "ectoplasm"
  | "eears"
  | "egg0"
  | "egg1"
  | "egg2"
  | "egg3"
  | "egg4"
  | "egg5"
  | "egg6"
  | "egg7"
  | "egg8"
  | "eggnog"
  | "electronics"
  | "elixirdex0"
  | "elixirdex1"
  | "elixirdex2"
  | "elixirint0"
  | "elixirint1"
  | "elixirint2"
  | "elixirluck"
  | "elixirstr0"
  | "elixirstr1"
  | "elixirstr2"
  | "elixirvit0"
  | "elixirvit1"
  | "elixirvit2"
  | "emptyheart"
  | "emptyjar"
  | "epyjamas"
  | "eslippers"
  | "espresso"
  | "essenceofether"
  | "essenceoffire"
  | "essenceoffrost"
  | "essenceoflife"
  | "essenceofnature"
  | "evasionscroll"
  | "fclaw"
  | "feather0"
  | "fierygloves"
  | "figurine"
  | "fireblade"
  | "firebow"
  | "firecrackers"
  | "firestaff"
  | "flute"
  | "forscroll"
  | "frankypants"
  | "frequencyscroll"
  | "frogt"
  | "frostbow"
  | "froststaff"
  | "frozenstone"
  | "fsword"
  | "ftrinket"
  | "funtoken"
  | "fury"
  | "gbow"
  | "gem0"
  | "gem1"
  | "gem2"
  | "gem3"
  | "gemfragment"
  | "ghatb"
  | "ghatp"
  | "gift0"
  | "gift1"
  | "glitch"
  | "gloves"
  | "gloves1"
  | "goldbooster"
  | "goldenegg"
  | "goldenpowerglove"
  | "goldingot"
  | "goldnugget"
  | "goldscroll"
  | "gphelmet"
  | "greenbomb"
  | "gslime"
  | "gum"
  | "hammer"
  | "handofmidas"
  | "harbringer"
  | "harmor"
  | "hboots"
  | "hbow"
  | "helmet"
  | "helmet1"
  | "hgloves"
  | "hhelmet"
  | "hotchocolate"
  | "hpamulet"
  | "hpants"
  | "hpbelt"
  | "hpot0"
  | "hpot1"
  | "hpotx"
  | "ijx"
  | "ink"
  | "intamulet"
  | "intbelt"
  | "intearring"
  | "intring"
  | "intscroll"
  | "jacko"
  | "jewellerybox"
  | "kitty1"
  | "lantern"
  | "lbelt"
  | "leather"
  | "ledger"
  | "licence"
  | "lifestealscroll"
  | "lostearring"
  | "lotusf"
  | "lspores"
  | "luckbooster"
  | "luckscroll"
  | "luckyt"
  | "maceofthedead"
  | "mageshood"
  | "manastealscroll"
  | "mcape"
  | "mcarmor"
  | "mcboots"
  | "mcgloves"
  | "mchat"
  | "mcpants"
  | "merry"
  | "mistletoe"
  | "mittens"
  | "mmarmor"
  | "mmgloves"
  | "mmhat"
  | "mmpants"
  | "mmshoes"
  | "molesteeth"
  | "monsterbox"
  | "monstertoken"
  | "mparmor"
  | "mpcostscroll"
  | "mpgloves"
  | "mphat"
  | "mpot0"
  | "mpot1"
  | "mpotx"
  | "mppants"
  | "mpshoes"
  | "mrarmor"
  | "mrboots"
  | "mrgloves"
  | "mrhood"
  | "mrnarmor"
  | "mrnboots"
  | "mrngloves"
  | "mrnhat"
  | "mrnpants"
  | "mrpants"
  | "mshield"
  | "mushroomstaff"
  | "mwarmor"
  | "mwboots"
  | "mwgloves"
  | "mwhelmet"
  | "mwpants"
  | "mysterybox"
  | "networkcard"
  | "nheart"
  | "offering"
  | "offeringx"
  | "oozingterror"
  | "orbg"
  | "orbofdex"
  | "orbofint"
  | "orbofsc"
  | "orbofstr"
  | "orbofvit"
  | "ornament"
  | "ornamentstaff"
  | "outputscroll"
  | "pants"
  | "pants1"
  | "partyhat"
  | "phelmet"
  | "pico"
  | "pinkie"
  | "placeholder"
  | "platinumingot"
  | "platinumnugget"
  | "pleather"
  | "pmace"
  | "poison"
  | "poker"
  | "powerglove"
  | "pstem"
  | "pumpkinspice"
  | "puppy1"
  | "puppyer"
  | "pvptoken"
  | "pyjamas"
  | "qubics"
  | "quiver"
  | "rabbitsfoot"
  | "rapier"
  | "rattail"
  | "redenvelope"
  | "redenvelopev2"
  | "redenvelopev3"
  | "rednose"
  | "reflectionscroll"
  | "resistancering"
  | "resistancescroll"
  | "rfangs"
  | "rfur"
  | "ringofluck"
  | "ringsj"
  | "rpiercingscroll"
  | "santasbelt"
  | "scroll0"
  | "scroll1"
  | "scroll2"
  | "scroll3"
  | "scroll4"
  | "seashell"
  | "shadowstone"
  | "shield"
  | "shoes"
  | "shoes1"
  | "slimestaff"
  | "smoke"
  | "smush"
  | "snakefang"
  | "snakeoil"
  | "snring"
  | "solitaire"
  | "spear"
  | "speedscroll"
  | "spidersilk"
  | "spores"
  | "sshield"
  | "sstinger"
  | "staff"
  | "staff2"
  | "staff3"
  | "staff4"
  | "staffofthedead"
  | "stand0"
  | "stand1"
  | "starkillers"
  | "stealthcape"
  | "stick"
  | "stinger"
  | "stonekey"
  | "stoneofgold"
  | "stoneofluck"
  | "stoneofxp"
  | "storagebox"
  | "stramulet"
  | "strbelt"
  | "strearring"
  | "strring"
  | "strscroll"
  | "suckerpunch"
  | "supermittens"
  | "svenom"
  | "swifty"
  | "swirlipop"
  | "sword"
  | "swordofthedead"
  | "t2bow"
  | "t2dexamulet"
  | "t2intamulet"
  | "t2quiver"
  | "t2stramulet"
  | "t3bow"
  | "talkingskull"
  | "test"
  | "test2"
  | "throwingstars"
  | "tracker"
  | "trinkets"
  | "tristone"
  | "troll"
  | "tshell"
  | "tshirt0"
  | "tshirt1"
  | "tshirt2"
  | "tshirt3"
  | "tshirt4"
  | "tshirt6"
  | "tshirt7"
  | "tshirt8"
  | "tshirt88"
  | "tshirt9"
  | "vblood"
  | "vitearring"
  | "vitring"
  | "vitscroll"
  | "wand"
  | "warmscarf"
  | "warpvest"
  | "watercore"
  | "wattire"
  | "wblade"
  | "wbook0"
  | "wbook1"
  | "wbreeches"
  | "wcap"
  | "weaponbox"
  | "wgloves"
  | "whiskey"
  | "whiteegg"
  | "wine"
  | "wingedboots"
  | "woodensword"
  | "wshield"
  | "wshoes"
  | "x0"
  | "x1"
  | "x2"
  | "x3"
  | "x4"
  | "x5"
  | "x6"
  | "x7"
  | "x8"
  | "xarmor"
  | "xboots"
  | "xbox"
  | "xgloves"
  | "xhelmet"
  | "xmashat"
  | "xmaspants"
  | "xmasshoes"
  | "xmassweater"
  | "xpants"
  | "xpbooster"
  | "xpscroll"
  | "xptome"
  | "xshield"
  | "xshot"

export type MapName =
  | "abtesting"
  | "arena"
  | "bank"
  | "bank_b"
  | "bank_u"
  | "batcave"
  | "cave"
  | "cgallery"
  | "cyberland"
  | "d2"
  | "d_a1"
  | "d_a2"
  | "d_b1"
  | "d_e"
  | "d_g"
  | "desertland"
  | "duelland"
  | "dungeon0"
  | "goobrawl"
  | "halloween"
  | "hut"
  | "jail"
  | "level1"
  | "level2"
  | "level2e"
  | "level2n"
  | "level2s"
  | "level2w"
  | "level3"
  | "level4"
  | "main"
  | "mansion"
  | "mtunnel"
  | "old_bank"
  | "old_main"
  | "original_main"
  | "resort"
  | "resort_e"
  | "shellsisland"
  | "ship0"
  | "spookytown"
  | "tavern"
  | "test"
  | "tunnel"
  | "winter_cave"
  | "winter_inn"
  | "winter_inn_rooms"
  | "winterland"
  | "woffice"

export type NPCName =
  | "Ace"
  | "Alia"
  | "Angel"
  | "Baron"
  | "Bean"
  | "Bobo"
  | "Caroline"
  | "Christie"
  | "Christina"
  | "Cole"
  | "Crun"
  | "Cue"
  | "Daisy"
  | "Divian"
  | "Ernis"
  | "Faith"
  | "Fredric"
  | "Gabriel"
  | "Gabriella"
  | "Gabrielle"
  | "Garwyn"
  | "Gn. Spence"
  | "Green"
  | "Grundur"
  | "Guard"
  | "Haila"
  | "Jane"
  | "Janet"
  | "Jaqk"
  | "Jayson"
  | "Kane"
  | "Kilgore"
  | "Landon"
  | "Ledia"
  | "Leo"
  | "Lidia"
  | "Lilith"
  | "Lucas"
  | "Lucy"
  | "Marven"
  | "Mine Heathcliff"
  | "Mr. Dworf"
  | "Mr. Rich"
  | "New Year Tree"
  | "Pete"
  | "Pink"
  | "Ponty"
  | "Princess"
  | "Purple"
  | "Reny"
  | "Ron"
  | "Rose"
  | "Santa"
  | "Scarf"
  | "Smith"
  | "Stewart"
  | "Timmy"
  | "Tricksy"
  | "Tristian"
  | "Twig"
  | "Violet"
  | "Warin"
  | "Witch"
  | "Wizard"
  | "Wogue"
  | "Wynifreed"
  | "Wyr"
  | "Xyn"
  | "Z"

export type NPCRole =
  | "announcer"
  | "blocker"
  | "bouncer"
  | "citizen"
  | "companion"
  | "compound"
  | "craftsman"
  | "cx"
  | "daily_events"
  | "exchange"
  | "funtokens"
  | "gold"
  | "guard"
  | "items"
  | "jailer"
  | "locksmith"
  | "lostandfound"
  | "lottery"
  | "mcollector"
  | "merchant"
  | "monstertokens"
  | "newupgrade"
  | "newyear_tree"
  | "petkeeper"
  | "premium"
  | "pvp_announcer"
  | "pvptokens"
  | "quest"
  | "repeater"
  | "resort"
  | "santa"
  | "secondhands"
  | "shells"
  | "ship"
  | "shrine"
  | "standmerchant"
  | "tavern"
  | "tease"
  | "thesearch"
  | "transport"
  | "witch"

export type NPCType =
  | "antip2w"
  | "appearance"
  | "armors"
  | "basics"
  | "bean"
  | "beans"
  | "bouncer"
  | "citizen0"
  | "citizen1"
  | "citizen10"
  | "citizen11"
  | "citizen12"
  | "citizen13"
  | "citizen14"
  | "citizen15"
  | "citizen2"
  | "citizen3"
  | "citizen4"
  | "citizen5"
  | "citizen6"
  | "citizen7"
  | "citizen8"
  | "citizen9"
  | "compound"
  | "craftsman"
  | "exchange"
  | "fancypots"
  | "firstc"
  | "fisherman"
  | "funtokens"
  | "gemmerchant"
  | "goldnpc"
  | "guard"
  | "holo"
  | "holo0"
  | "holo1"
  | "holo2"
  | "holo3"
  | "holo4"
  | "holo5"
  | "items0"
  | "items1"
  | "items2"
  | "items3"
  | "items4"
  | "items5"
  | "items6"
  | "items7"
  | "jailer"
  | "leathermerchant"
  | "lichteaser"
  | "locksmith"
  | "lostandfound"
  | "lotterylady"
  | "mcollector"
  | "mistletoe"
  | "monsterhunter"
  | "newupgrade"
  | "newyear_tree"
  | "ornaments"
  | "pete"
  | "pots"
  | "premium"
  | "princess"
  | "pvp"
  | "pvpblocker"
  | "pvptokens"
  | "pwincess"
  | "santa"
  | "scrolls"
  | "secondhands"
  | "shellsguy"
  | "ship"
  | "shrine"
  | "standmerchant"
  | "tavern"
  | "tbartender"
  | "thief"
  | "transporter"
  | "wbartender"
  | "weapons"
  | "witch"
  | "wizardrepeater"
  | "wnpc"

// TODO: Confirm that PVP is actually the identifier for PVP servers
export type ServerIdentifier =
  | "HARDCORE"
  | "I"
  | "II"
  | "PVP"

export type ServerRegion =
  | "ASIA"
  | "US"
  | "EU"

export type SkillName =
  | "3shot"
  | "4fingers"
  | "5shot"
  | "absorb"
  | "agitate"
  | "alchemy"
  | "attack"
  | "blink"
  | "burst"
  | "cburst"
  | "charge"
  | "charm"
  | "cleave"
  | "curse"
  | "darkblessing"
  | "energize"
  | "entangle"
  | "esc"
  | "gm"
  | "hardshell"
  | "heal"
  | "huntersmark"
  | "interact"
  | "invis"
  | "light"
  | "magiport"
  | "mcourage"
  | "mentalburst"
  | "mluck"
  | "move_down"
  | "move_left"
  | "move_right"
  | "move_up"
  | "mshield"
  | "multi_burn"
  | "open_snippet"
  | "partyheal"
  | "pcoat"
  | "phaseout"
  | "piercingshot"
  | "poisonarrow"
  | "portal"
  | "power"
  | "pure_eval"
  | "quickpunch"
  | "quickstab"
  | "reflection"
  | "regen_hp"
  | "regen_mp"
  | "revive"
  | "rspeed"
  | "scare"
  | "self_healing"
  | "shadowstrike"
  | "sheal"
  | "snippet"
  | "stack"
  | "stomp"
  | "stone"
  | "stop"
  | "supershot"
  | "tangle"
  | "taunt"
  | "throw"
  | "toggle_character"
  | "toggle_code"
  | "toggle_inventory"
  | "toggle_run_code"
  | "toggle_stats"
  | "track"
  | "travel"
  | "use_hp"
  | "use_mp"
  | "use_town"
  | "warcry"
  | "warp"
  | "xpower"