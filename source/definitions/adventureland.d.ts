// This file is from https://github.com/saevarb/adventureland-typescript-starter/blob/master/src/definitions/game.d.ts
type ItemName = string;
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
  items: (ItemInfo)[];
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
}

export type EntityId = string;

export interface Drawing {
  destroy: () => void;
}

export interface ItemInfo {
  level?: number;
  q?: number;
  name: string;
  g?: number;
  grades?: number[];
  type?: "weapon" | "chest" | "shoes" | string;
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
  map?: string;
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

export interface GameInfo {
  geometry: {
    [id: string]: {
      min_x: number,
      min_y: number,
      max_x: number,
      max_y: number,
      x_lines: number[][],
      y_lines: number[][],
      groups: number[][][]
    }
  }
  npcs: { [T in string]: any }; // TODO: Better info typing
  maps: { [T in MapName]: any }; // TODO: Better info typing
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
    S: { [eventMonsterName: string]: any };
    party_list: string[];
    party: { [name: string]: ICharacter };
    npcs: any[];
    entities: { [id: string]: Entity };
    next_skill: { [T in SkillName]: number };
    socket: SocketIO.Socket;
    start_runner(): void;
    stop_runner(): void;
  }
  var $: any;
  var character: ICharacter;
  var smart: {
    moving: boolean;
  }
  var game_logs: any[];
  var G: GameInfo;
  var clear_game_logs: () => void;
  var handle_death: () => void;
  function respawn(): void;
  function bank_deposit(gold: number);
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
  | "tarot_5swords"
  | "tarot_magician"
  | "tarot_hierophant"
  | "tarot_3cups"
  | "tarot_devil"
  | "marked"
  | "blink"
  | "tarot_hangman"
  | "tarot_judgment"
  | "mluck"
  | "stoned"
  | "tarot_4cups"
  | "darkblessing"
  | "tarot_pagewands"
  | "tarot_fool"
  | "tarot_8swords"
  | "tarot_death"
  | "sugarrush"
  | "tarot_8wands"
  | "tarot_acecups"
  | "tarot_knightpentacles"
  | "authfail"
  | "tarot_6cups"
  | "tarot_knightswords"
  | "mlifesteal"
  | "tarot_fortune"
  | "tarot_8pentacles"
  | "phasedout"
  | "tarot_justice"
  | "tarot_2swords"
  | "tarot_6swords"
  | "rspeed"
  | "monsterhunt"
  | "weakness"
  | "tarot_priestess"
  | "tarot_3pentacles"
  | "easterluck"
  | "tarot_kingcups"
  | "tarot_6pentacles"
  | "tarot_star"
  | "fingered"
  | "tarot_10swords"
  | "tarot_strength"
  | "tarot_emperor"
  | "charmed"
  | "tarot_acepentacles"
  | "tarot_9wands"
  | "tarot_lovers"
  | "tarot_knightwands"
  | "tarot_9pentacles"
  | "tarot_pagecups"
  | "tarot_3swords"
  | "slowness"
  | "withdrawal"
  | "eheal"
  | "poisoned"
  | "tarot_kingwands"
  | "xmas"
  | "tarot_kingpentacles"
  | "tarot_2pentacles"
  | "tarot_9cups"
  | "tarot_8cups"
  | "tarot_10pentacles"
  | "tarot_4swords"
  | "tarot_knightcups"
  | "tarot_tower"
  | "tarot_4pentacles"
  | "fullguard"
  | "warcry"
  | "tarot_sun"
  | "mcourage"
  | "tarot_queenswords"
  | "xmas2"
  | "tarot_3wands"
  | "tarot_7cups"
  | "eburn"
  | "tarot_2wands"
  | "poisonous"
  | "tarot_empress"
  | "tarot_7wands"
  | "tarot_7pentacles"
  | "tarot_hermit"
  | "notverified"
  | "tarot_aceswords"
  | "stun"
  | "charging"
  | "tarot_10wands"
  | "tarot_kingswords"
  | "tarot_moon"
  | "tarot_6wands"
  | "tarot_theworld"
  | "tarot_9swords"
  | "tarot_chariot"
  | "tarot_queencups"
  | "tarot_4wands"
  | "tarot_queenpentacles"
  | "tarot_10cups"
  | "tarot_pagepentacles"
  | "stack"
  | "licenced"
  | "energized"
  | "tarot_pageswords"
  | "reflection"
  | "tarot_acewands"
  | "tarot_queenwands"
  | "tarot_5wands"
  | "tarot_5pentacles"
  | "tarot_2cups"
  | "tangled"
  | "tarot_7swords"
  | "tarot_5cups"
  | "tarot_temperance"
  | "hardshell"

export type SkillName =
  | "mentalburst"
  | "move_down"
  | "burst"
  | "use_town"
  | "toggle_inventory"
  | "toggle_stats"
  | "agitate"
  | "blink"
  | "poisonarrow"
  | "mluck"
  | "warcry"
  | "toggle_run_code"
  | "mcourage"
  | "gm"
  | "tangle"
  | "move_up"
  | "darkblessing"
  | "5shot"
  | "use_hp"
  | "curse"
  | "toggle_character"
  | "move_left"
  | "piercingshot"
  | "travel"
  | "phaseout"
  | "interact"
  | "revive"
  | "stack"
  | "supershot"
  | "charge"
  | "partyheal"
  | "esc"
  | "3shot"
  | "absorb"
  | "quickpunch"
  | "attack"
  | "heal"
  | "rspeed"
  | "track"
  | "taunt"
  | "stomp"
  | "toggle_code"
  | "stop"
  | "cleave"
  | "portal"
  | "move_right"
  | "open_snippet"
  | "cburst"
  | "throw"
  | "invis"
  | "stone"
  | "shadowstrike"
  | "energize"
  | "light"
  | "pure_eval"
  | "snippet"
  | "self_healing"
  | "4fingers"
  | "use_mp"
  | "quickstab"
  | "magiport"
  | "pcoat"
  | "charm"
  | "hardshell"
  | "scare"
  | "huntersmark";