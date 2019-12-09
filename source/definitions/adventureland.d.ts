// This file is from https://github.com/saevarb/adventureland-typescript-starter/blob/master/src/definitions/game.d.ts
export interface ICharacter extends Entity {
  /**
   * MP cost of attacking
   */
  mp_cost: number;
  party?: string;
  name: string;
  range: number;
  xrange: number;
  apiercing: number;
  bank: {
    items0: ItemInfo[];
    items1?: ItemInfo[];
    items2?: ItemInfo[];
    items3?: ItemInfo[];
    gold: number;
  }
  /**
   *  Contains things in inventory
   */
  items: ItemInfo[];
  /** 
   * Contains things that are equipped
   */
  slots: { [T in Slot]: ItemInfo }
  ctype: ClassName;
  rip: boolean;
  gold: number;
  /**
   * Time is in ms.
   */
  ping?: number;
  xp: number;
  max_xp: number;
  moving: boolean;
  /**
   * Contains information about progressed actions (i.e. upgrades, compounds, exchanges)
   */
  q: {
    upgrade?: any;
    compound?: any;
    exchange?: any;
  }; // TODO: Change this from 'any' to something useful
  /**
   * True when we are under the status effect "stoned", otherwise it is undefined.
   */
  stoned?: boolean;
}

export type EntityId = string;

export interface Drawing {
  destroy: () => void;
}

// TODO: This combines the inventory info, and the G.items info. They're fairly different, we should split them in to two.
export interface ItemInfo {
  /**
   * The item's level
   */
  level?: number;
  /**
   * The item's quantity for stackable objects
   */
  q?: number;
  name: ItemName;
  id?: ItemName;
  g?: number;
  /**
   * Shows if the item be stacked.
   */
  s?: boolean;
  grades?: number[];
  tier?: number;
  type?: "weapon" | "chest" | "shoes" | string; // TODO: Other types of items
  stat_type?: "dex" | "str" | "int" | "vit" | string; // TODO: There should be a couple more stat types, like fortitude?
  /**
   * Contains info about what benefits you get from upgrading
   */
  upgrade?: any;
  /**
   * Contains info about what benefits you get from compounding
   */
  compound?: any;
}

export interface BuffInfo {
  /**
   * If the buff is a monsterhunt, c contains the amount of monsters left to kill.
   */
  c?: number;
  f: string;
  // duration in ms
  ms: number;
  /**
   * If the buff is a monsterhunt, target contains the mtype to hunt.
   */
  id?: MonsterName;
}

export interface ALPosition {
  map?: MapName;
  x: number;
  y: number;
  real_x?: number;
  real_y?: number;
  going_x?: number;
  going_y?: number;
}

export interface Entity extends ALPosition {
  aggro: number;
  /**
   * NPCs have roles. Players do not.
   */
  role: string;
  /**
   * Returns true if the entity is another player.
   */
  player?: boolean;
  speed: number;
  name?: string;
  armor: number;
  frequency: number;
  id?: string;
  hp: number;
  max_hp: number;
  mp: number;
  max_mp: number;
  attack: number;
  target: string;
  xp: number;
  range: number;
  type: string; // TODO: can be one of 'monster', 'character'
  transform?: any;
  dead: boolean;
  /**
   * Contains the NPC's id.
   */
  npc?: string;
  mtype?: MonsterName;
  /**
   * A list of conditions affecting the character
   */
  s?: { [T in SkillName | ConditionName]: BuffInfo };
}

export interface Monster extends Entity {
  mtype: MonsterName;
}

export interface SkillInfo {
  mp?: number;
  name: number;
  cooldown: number;
  ratio?: number;
  range?: number;
}

export interface MapInfo {
  /**
   * Not sure what this is, but if it's true, we don't smart move there.
   */
  instance: boolean;
  monsters: {
    count: number;
    boundary?: [number, number, number, number];
    boundaries?: [MapName, number, number, number, number][];
    type: MonsterName;
    grow?: Boolean;
  }[],
  ref: {
    [id: string]: ALPosition
  }
}

export interface GameInfo {
  geometry: {
    [id: string]: {
      min_x: number,
      min_y: number,
      max_x: number,
      max_y: number,
      x_lines: [number, number, number][],
      y_lines: [number, number, number][],
      groups: number[][][]
    }
  }
  npcs: { [T in string]: any }; // TODO: Better info typing
  maps: { [T in MapName]: MapInfo }; // TODO: Better info typing
  skills: { [T in SkillName]: SkillInfo };
  items: { [T in ItemName]: ItemInfo };
  monsters: { [id: string]: Monster };
}

declare global {
  interface Window {
    clear_game_logs(): void;
    distance(position1: ALPosition, position2: ALPosition)
    character: ICharacter;
    chests: { [chestID: string]: any };
    S: { [eventMonsterName in MonsterName]: any };
    party_list: string[];
    party: { [name: string]: ICharacter };
    npcs: any[];
    entities: { [id: string]: Entity };
    next_skill: { [T in SkillName]: number };
    socket: SocketIO.Socket;
    /**
     * Opens the merchant stall
     *
     * @param {number} slot Inventory slot # containing the merchant stall
     */
    open_merchant(slot: number): void;
    /**
     * Closes the merchant stall
     */
    close_merchant(): void;
    start_runner(): void;
    stop_runner(): void;
  }
  var $: any;
  var character: ICharacter;
  var smart: ALPosition & {
    moving: boolean;
    searching: boolean;
  }
  var game_logs: any[];
  var G: GameInfo;
  var clear_game_logs: () => void;
  var handle_death: () => void;
  function respawn(): void;
  function bank_deposit(gold: number);
  function bank_withdraw(gold: number);
  function bank_store(inventoryPosition: number, bankPack?: string, bankPackPosition?: number);
  function damage_multiplier(armor: number);
  function start_character(name: string, script: string): void;
  function stop_character(name: string, script: string): void;
  function map_key(key: string, thing: string, arg?: string): void;
  function can_use(skill: SkillName): boolean;
  function can_attack(entity: Entity): boolean;
  function buy_with_gold(item: ItemName, q: number): void;
  /**
   * Compounds three items to an item of a higher level.
   *
   * @param {number} item1 The inventory position of the first item
   * @param {number} item2 The inventory position of the second item
   * @param {number} item3 The inventory position of the third item
   * @param {number} scroll The inventory position of the scroll
   * @param {number} [offering] The inventory position of the offering
   */
  function compound(item1: number, item2: number, item3: number, scroll: number, offering?: number): void;
  function use(skill: SkillName, target?: Entity): void;
  function use_skill(skill: SkillName, target?: Entity | string): void;
  /**
   * Equips an item to the player
   *
   * @param {number} itemPos The position of the item in the inventory
   * @param {string} [slotName] The slot that we should equip the item in
   */
  function equip(itemPos: number, slotName?: string);
  function heal(entity: Entity): void;
  function attack(entity: Entity): Promise<any>;
  function loot(): void;
  /**
   * Returns true if you can attack other players.
   */
  function is_pvp(): boolean;
  /**
   * Returns true if the entity is an NPC
   */
  function is_npc(entity: Entity): boolean;
  function find_npc(id: string): ALPosition;
  function upgrade(itemPos: number, scrollPos: number, offeringPos?: number): void;
  function load_code(foo: string): void;
  function send_local_cm(to: string, data: any): void;
  function send_cm(to: string, data: any): void;
  function game_log(msg: string, color?: string): void;
  function accept_party_invite(from: string): void;
  function send_party_invite(to: string): void;
  function request_party_invite(to: string): void;
  function set_message(msg: string): void;
  function get_player(name: string): Entity | undefined;
  function change_target(target: Entity, send?: boolean): void;
  function get_targeted_monster(): Entity;
  function get_target_of(entity: Entity): Entity;
  function distance(position1: ALPosition, position2: ALPosition): number;
  function smart_move(destination: ALPosition | MonsterName | string, callback?: () => void);
  function move(x: number, y: number): void;
  function xmove(x: number, y: number): void;
  function show_json(stuff: any): void;
  /**
   *
   *
   * @param {number} item The inventory position of the item to sell
   * @param {number} quantity
   */
  function sell(item: number, quantity: number): void;
  /**
   *
   *
   * @param {string} receiver
   * @param {number} item The inventory position of the item to transfer
   * @param {number} quantity
   */
  function send_item(receiver: string, item: number, quantity: number): void;
  function send_gold(receiver: string, amount: number): void;
  function can_move_to(x: number, y: number): boolean;
  function stop(what: string): void;
  function reduce_cooldown(name: SkillName, ms: number): void;

  function draw_circle(x: number, y: number, radius: number, size?: number, color?: number): Drawing;
  function draw_line(x: number, y: number, x2: number, y2: number, size?: number, color?: number): Drawing;

  var handle_command: undefined | ((command: string, args: string) => void);
  var on_cm: undefined | ((from: string, data: any) => void);
  // var on_map_click: undefined | ((x: number, y: number) => boolean);
  var on_party_invite: undefined | ((from: string) => void);
  var on_party_request: undefined | ((from: string) => void);
}

export type Slot =
  | "ring1"
  | "ring2"
  | "earring1"
  | "earring2"
  | "belt"
  | "mainhand"
  | "offhand"
  | "helmet"
  | "chest"
  | "pants"
  | "shoes"
  | "gloves"
  | "amulet"
  | "orb"
  | "elixir"
  | "cape";

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
  | "bow3"
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
  | "cscale"
  | "cscroll0"
  | "cscroll1"
  | "cscroll2"
  | "cscroll3"
  | "cshell"
  | "ctristone"
  | "cupid"
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
  | "figurine"
  | "fireblade"
  | "firecrackers"
  | "firestaff"
  | "flute"
  | "forscroll"
  | "frankypants"
  | "frequencyscroll"
  | "frogt"
  | "froststaff"
  | "frozenstone"
  | "ftrinket"
  | "funtoken"
  | "fury"
  | "gbow"
  | "gem0"
  | "gem1"
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
  | "rattail"
  | "redenvelope"
  | "redenvelopev2"
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
  | "solitaire"
  | "spear"
  | "speedscroll"
  | "spidersilk"
  | "spores"
  | "sshield"
  | "sstinger"
  | "staff"
  | "staffofthedead"
  | "stand0"
  | "stand1"
  | "starkillers"
  | "stealthcape"
  | "stick"
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
  | "swirlipop"
  | "swordofthedead"
  | "t2bow"
  | "t2dexamulet"
  | "t2intamulet"
  | "t2quiver"
  | "t2stramulet"
  | "talkingskull"
  | "test"
  | "test2"
  | "throwingstars"
  | "tracker"
  | "trinkets"
  | "tristone"
  | "troll"
  | "tshell"
  | "vblood"
  | "vitearring"
  | "vitring"
  | "vitscroll"
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
  | "xshield";

export type MapName =
  | "tunnel"
  | "abtesting"
  | "resort_e"
  | "goobrawl"
  | "level2s"
  | "winter_inn"
  | "dungeon0"
  | "cgallery"
  | "halloween"
  | "winterland"
  | "old_bank"
  | "level1"
  | "level2"
  | "level3"
  | "level4"
  | "level2n"
  | "spookytown"
  | "mansion"
  | "cyberland"
  | "woffice"
  | "batcave"
  | "bank"
  | "arena"
  | "hut"
  | "old_main"
  | "resort"
  | "tavern"
  | "desertland"
  | "cave"
  | "level2e"
  | "winter_inn_rooms"
  | "duelland"
  | "original_main"
  | "jail"
  | "winter_cave"
  | "test"
  | "main"
  | "level2w"
  | "shellsisland"

export type ClassName =
  | "mage"
  | "merchant"
  | "priest"
  | "warrior"
  | "ranger"
  | "rogue"

export type MonsterName =
  | "snowman"
  | "wolfie"
  | "fireroamer"
  | "greenfairy"
  | "skeletor"
  | "nerfedmummy"
  | "prat"
  | "mrpumpkin"
  | "scorpion"
  | "jrat"
  | "porcupine"
  | "target_ar900"
  | "bbpompom"
  | "snake"
  | "target_a750"
  | "bat"
  | "crabx"
  | "xscorpion"
  | "target_ar500red"
  | "felemental"
  | "nelemental"
  | "puppy4"
  | "spider"
  | "chestm"
  | "puppy3"
  | "croc"
  | "gscorpion"
  | "goo"
  | "mummy"
  | "dknight2"
  | "pinkgoo"
  | "squigtoad"
  | "pppompom"
  | "mvampire"
  | "jr"
  | "stompy"
  | "osnake"
  | "target_r750"
  | "tortoise"
  | "wolf"
  | "mrgreen"
  | "ligerx"
  | "frog"
  | "eelemental"
  | "boar"
  | "franky"
  | "poisio"
  | "kitty4"
  | "kitty1"
  | "kitty3"
  | "kitty2"
  | "crab"
  | "plantoid"
  | "hen"
  | "redfairy"
  | "wabbit"
  | "target_r500"
  | "puppy1"
  | "armadillo"
  | "puppy2"
  | "bluefairy"
  | "goblin"
  | "fvampire"
  | "welemental"
  | "target"
  | "iceroamer"
  | "bee"
  | "minimush"
  | "squig"
  | "rooster"
  | "rat"
  | "mole"
  | "rudolph"
  | "ent"
  | "target_a500"
  | "mechagnome"
  | "stoneworm"
  | "phoenix"
  | "arcticbee"
  | "oneeye"
  | "booboo"
  | "greenjr"
  | "ghost"
  | "cgoo"
  | "bigbird"
  | "goldenbat"

export type ConditionName =
  "authfail"
  | "blink"
  | "charging"
  | "charmed"
  | "darkblessing"
  | "easterluck"
  | "eburn"
  | "eheal"
  | "energized"
  | "fingered"
  | "fullguard"
  | "hardshell"
  | "holidayspirit"
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
  | "reflection"
  | "rspeed"
  | "slowness"
  | "stack"
  | "stoned"
  | "stunned"
  | "sugarrush"
  | "tangled"
  | "tarot_10cups"
  | "tarot_10pentacles"
  | "tarot_10swords"
  | "tarot_10wands"
  | "tarot_2cups"
  | "tarot_2pentacles"
  | "tarot_2swords"
  | "tarot_2wands"
  | "tarot_3cups"
  | "tarot_3pentacles"
  | "tarot_3swords"
  | "tarot_3wands"
  | "tarot_4cups"
  | "tarot_4pentacles"
  | "tarot_4swords"
  | "tarot_4wands"
  | "tarot_5cups"
  | "tarot_5pentacles"
  | "tarot_5swords"
  | "tarot_5wands"
  | "tarot_6cups"
  | "tarot_6pentacles"
  | "tarot_6swords"
  | "tarot_6wands"
  | "tarot_7cups"
  | "tarot_7pentacles"
  | "tarot_7swords"
  | "tarot_7wands"
  | "tarot_8cups"
  | "tarot_8pentacles"
  | "tarot_8swords"
  | "tarot_8wands"
  | "tarot_9cups"
  | "tarot_9pentacles"
  | "tarot_9swords"
  | "tarot_9wands"
  | "tarot_acecups"
  | "tarot_acepentacles"
  | "tarot_aceswords"
  | "tarot_acewands"
  | "tarot_chariot"
  | "tarot_death"
  | "tarot_devil"
  | "tarot_emperor"
  | "tarot_empress"
  | "tarot_fool"
  | "tarot_fortune"
  | "tarot_hangman"
  | "tarot_hermit"
  | "tarot_hierophant"
  | "tarot_judgment"
  | "tarot_justice"
  | "tarot_kingcups"
  | "tarot_kingpentacles"
  | "tarot_kingswords"
  | "tarot_kingwands"
  | "tarot_knightcups"
  | "tarot_knightpentacles"
  | "tarot_knightswords"
  | "tarot_knightwands"
  | "tarot_lovers"
  | "tarot_magician"
  | "tarot_moon"
  | "tarot_pagecups"
  | "tarot_pagepentacles"
  | "tarot_pageswords"
  | "tarot_pagewands"
  | "tarot_priestess"
  | "tarot_queencups"
  | "tarot_queenpentacles"
  | "tarot_queenswords"
  | "tarot_queenwands"
  | "tarot_star"
  | "tarot_strength"
  | "tarot_sun"
  | "tarot_temperance"
  | "tarot_theworld"
  | "tarot_tower"
  | "warcry"
  | "weakness"
  | "withdrawal"

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
  | "open_snippet"
  | "partyheal"
  | "pcoat"
  | "phaseout"
  | "piercingshot"
  | "poisonarrow"
  | "portal"
  | "pure_eval"
  | "quickpunch"
  | "quickstab"
  | "reflection"
  | "revive"
  | "rspeed"
  | "scare"
  | "self_healing"
  | "shadowstrike"
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
  | "warcry";