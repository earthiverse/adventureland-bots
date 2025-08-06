import { Game } from "alclient";
import { getGFromCache } from "../../../src/plugins/g_cache.js";
import { calculateItemScore, calculateSkillScore } from "../../../src/setups/regen/simple.js";

let game: Game;
beforeAll(async () => {
  const cachedG = getGFromCache();
  if (cachedG !== undefined) {
    game = new Game({ G: cachedG });
  } else {
    game = new Game();
    await game.updateG();
  }
}, 15_000);

test("`calculateItemScore()` sanity checks", () => {
  // A character with full MP should have a better score for mp
  let character = { game, hp: 10, max_hp: 100, mp: 100, max_mp: 100 };
  let hpot0Score = calculateItemScore("hpot0", character);
  let mpot0Score = calculateItemScore("mpot0", character);
  expect(hpot0Score).toBeGreaterThan(mpot0Score);

  // A character with full HP should have a better score for hp
  character = { game, hp: 100, max_hp: 100, mp: 10, max_mp: 100 };
  hpot0Score = calculateItemScore("hpot0", character);
  mpot0Score = calculateItemScore("mpot0", character);
  expect(mpot0Score).toBeGreaterThan(hpot0Score);

  // A character missing a lot of HP should have a better score with hpot1
  character = { game, hp: 100, max_hp: 1000, mp: 100, max_mp: 100 };
  hpot0Score = calculateItemScore("hpot0", character);
  let hpot1Score = calculateItemScore("hpot1", character);
  expect(hpot1Score).toBeGreaterThan(hpot0Score);

  // A character missing just a bit of HP should have a better score with hpot0
  character = { game, hp: 95, max_hp: 100, mp: 100, max_mp: 100 };
  hpot0Score = calculateItemScore("hpot0", character);
  hpot1Score = calculateItemScore("hpot1", character);
  expect(hpot0Score).toBeGreaterThan(hpot1Score);

  // A character with no MP should have a better score for mp
  character = { game, hp: 50, max_hp: 1000, mp: 0, max_mp: 1000 };
  hpot0Score = calculateItemScore("hpot0", character);
  mpot0Score = calculateItemScore("mpot0", character);
  expect(mpot0Score).toBeGreaterThan(hpot0Score);
});

test("`calculateSkillScore()` sanity checks", () => {
  // A character with full MP should have a better score for HP
  let character = { hp: 10, max_hp: 100, mp: 100, max_mp: 100 };
  let regenHpScore = calculateSkillScore("regen_hp", character);
  let regenMpScore = calculateSkillScore("regen_mp", character);
  expect(regenHpScore).toBeGreaterThan(regenMpScore);

  // A character with full HP should have a better score for MP
  character = { hp: 100, max_hp: 100, mp: 10, max_mp: 100 };
  regenHpScore = calculateSkillScore("regen_hp", character);
  regenMpScore = calculateSkillScore("regen_mp", character);
  expect(regenMpScore).toBeGreaterThan(regenHpScore);

  // A character with no MP should have a better score for MP
  character = { hp: 50, max_hp: 1000, mp: 0, max_mp: 1000 };
  regenHpScore = calculateSkillScore("regen_hp", character);
  regenMpScore = calculateSkillScore("regen_mp", character);
  expect(regenMpScore).toBeGreaterThan(regenHpScore);
});
