/* Showdown Team Viewer */
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ShowdownViewerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var NATURE_MODS = {
  hardy: { plus: null, minus: null },
  docile: { plus: null, minus: null },
  serious: { plus: null, minus: null },
  bashful: { plus: null, minus: null },
  quirky: { plus: null, minus: null },
  lonely: { plus: "atk", minus: "def" },
  brave: { plus: "atk", minus: "spe" },
  adamant: { plus: "atk", minus: "spa" },
  naughty: { plus: "atk", minus: "spd" },
  bold: { plus: "def", minus: "atk" },
  relaxed: { plus: "def", minus: "spe" },
  impish: { plus: "def", minus: "spa" },
  lax: { plus: "def", minus: "spd" },
  timid: { plus: "spe", minus: "atk" },
  hasty: { plus: "spe", minus: "def" },
  jolly: { plus: "spe", minus: "spa" },
  naive: { plus: "spe", minus: "spd" },
  modest: { plus: "spa", minus: "atk" },
  mild: { plus: "spa", minus: "def" },
  quiet: { plus: "spa", minus: "spe" },
  rash: { plus: "spa", minus: "spd" },
  calm: { plus: "spd", minus: "atk" },
  gentle: { plus: "spd", minus: "def" },
  sassy: { plus: "spd", minus: "spe" },
  careful: { plus: "spd", minus: "spa" }
};
var STAT_LABEL = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe"
};
var STAT_ORDER = ["hp", "atk", "def", "spa", "spd", "spe"];
var API_STAT_MAP = {
  hp: "hp",
  attack: "atk",
  defense: "def",
  "special-attack": "spa",
  "special-defense": "spd",
  speed: "spe"
};
function parseEvLine(line) {
  const result = {};
  const parts = line.replace(/^EVs:\s*/i, "").split("/");
  for (const part of parts) {
    const m = part.trim().match(/^(\d+)\s+(\w+)$/);
    if (!m) continue;
    const val = parseInt(m[1], 10);
    const label = m[2].toLowerCase();
    const map = {
      hp: "hp",
      atk: "atk",
      def: "def",
      spa: "spa",
      spd: "spd",
      spe: "spe"
    };
    if (label in map) result[map[label]] = val;
  }
  return result;
}
function parseIvLine(line) {
  return parseEvLine(line.replace(/^IVs:/i, "EVs:"));
}
function parseFirstLine(line) {
  let rest = line.trim();
  let item = null;
  const atIdx = rest.indexOf(" @ ");
  if (atIdx !== -1) {
    item = rest.slice(atIdx + 3).trim();
    rest = rest.slice(0, atIdx).trim();
  }
  let gender = null;
  const genderMatch = rest.match(/\(([MF])\)\s*$/);
  if (genderMatch) {
    gender = genderMatch[1];
    rest = rest.slice(0, rest.lastIndexOf(genderMatch[0])).trim();
  }
  const parenMatch = rest.match(/^(.+?)\s+\(([^)]+)\)\s*$/);
  if (parenMatch) {
    return { nickname: parenMatch[1].trim(), species: parenMatch[2].trim(), gender, item };
  }
  return { nickname: null, species: rest.trim(), gender, item };
}
function parseShowdownSet(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const first = parseFirstLine(lines[0]);
  const set = __spreadProps(__spreadValues({}, first), {
    ability: null,
    level: 100,
    evs: {},
    ivs: {},
    nature: null,
    moves: []
  });
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("Ability:")) {
      set.ability = line.replace(/^Ability:\s*/i, "").trim();
    } else if (line.startsWith("Level:")) {
      set.level = parseInt(line.replace(/^Level:\s*/i, ""), 10) || 100;
    } else if (line.startsWith("EVs:")) {
      set.evs = parseEvLine(line);
    } else if (line.startsWith("IVs:")) {
      set.ivs = parseIvLine(line);
    } else if (/Nature$/i.test(line)) {
      set.nature = line.replace(/\s*Nature$/i, "").trim().toLowerCase();
    } else if (line.startsWith("- ")) {
      set.moves.push(line.slice(2).trim());
    }
  }
  return set;
}
function calcStats(base, set) {
  var _a;
  const mods = set.nature ? (_a = NATURE_MODS[set.nature]) != null ? _a : { plus: null, minus: null } : { plus: null, minus: null };
  const level = set.level;
  const calc = (key) => {
    var _a2, _b;
    const b = base[key];
    const iv = (_a2 = set.ivs[key]) != null ? _a2 : 31;
    const ev = (_b = set.evs[key]) != null ? _b : 0;
    if (key === "hp") {
      return Math.floor((2 * b + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
    }
    let stat = Math.floor(Math.floor((2 * b + iv + Math.floor(ev / 4)) * level / 100) + 5);
    if (mods.plus === key) stat = Math.floor(stat * 1.1);
    if (mods.minus === key) stat = Math.floor(stat * 0.9);
    return stat;
  };
  return {
    hp: calc("hp"),
    atk: calc("atk"),
    def: calc("def"),
    spa: calc("spa"),
    spd: calc("spd"),
    spe: calc("spe")
  };
}
var apiCache = /* @__PURE__ */ new Map();
function fetchPokemon(species) {
  return __async(this, null, function* () {
    const key = species.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    if (apiCache.has(key)) return apiCache.get(key);
    try {
      const res = yield (0, import_obsidian.requestUrl)(`https://pokeapi.co/api/v2/pokemon/${key}`);
      const data = res.json;
      apiCache.set(key, data);
      return data;
    } catch (e) {
      return null;
    }
  });
}
function extractBaseStats(data) {
  var _a, _b, _c, _d, _e, _f;
  const block = {};
  for (const s of data.stats) {
    const key = API_STAT_MAP[s.stat.name];
    if (key) block[key] = s.base_stat;
  }
  return {
    hp: (_a = block.hp) != null ? _a : 0,
    atk: (_b = block.atk) != null ? _b : 0,
    def: (_c = block.def) != null ? _c : 0,
    spa: (_d = block.spa) != null ? _d : 0,
    spd: (_e = block.spd) != null ? _e : 0,
    spe: (_f = block.spe) != null ? _f : 0
  };
}
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function renderSet(set, container) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d;
    const card = container.createEl("div", { cls: "sdv-card" });
    const loader = card.createEl("div", { cls: "sdv-loader", text: "Loading\u2026" });
    const data = yield fetchPokemon(set.species);
    loader.remove();
    const header = card.createEl("div", { cls: "sdv-header" });
    const spriteUrl = (_b = (_a = data == null ? void 0 : data.sprites) == null ? void 0 : _a.front_default) != null ? _b : null;
    if (spriteUrl) {
      header.createEl("img", { cls: "sdv-sprite", attr: { src: spriteUrl, alt: set.species } });
    }
    const info = header.createEl("div", { cls: "sdv-info" });
    const nameLine = info.createEl("div", { cls: "sdv-name" });
    nameLine.createEl("span", { cls: "sdv-species", text: set.nickname ? `${set.nickname} (${set.species})` : set.species });
    if (set.gender) nameLine.createEl("span", { cls: `sdv-gender sdv-gender-${set.gender.toLowerCase()}`, text: ` (${set.gender})` });
    if (set.item) info.createEl("div", { cls: "sdv-item", text: `@ ${set.item}` });
    if (set.ability) info.createEl("div", { cls: "sdv-ability", text: `Ability: ${set.ability}` });
    const natureLine = info.createEl("div", { cls: "sdv-nature" });
    if (set.nature) {
      const mods = NATURE_MODS[set.nature];
      natureLine.createEl("span", { text: `${capitalize(set.nature)} Nature` });
      if (mods == null ? void 0 : mods.plus) natureLine.createEl("span", { cls: "sdv-plus", text: ` (+${STAT_LABEL[mods.plus]})` });
      if (mods == null ? void 0 : mods.minus) natureLine.createEl("span", { cls: "sdv-minus", text: ` (\u2212${STAT_LABEL[mods.minus]})` });
    }
    if (data) {
      const base = extractBaseStats(data);
      const final = calcStats(base, set);
      const mods = set.nature ? (_c = NATURE_MODS[set.nature]) != null ? _c : { plus: null, minus: null } : { plus: null, minus: null };
      const statsEl = card.createEl("div", { cls: "sdv-stats" });
      for (const key of STAT_ORDER) {
        const ev = (_d = set.evs[key]) != null ? _d : 0;
        let labelCls = "sdv-stat-label";
        if (mods.plus === key) labelCls += " sdv-plus";
        if (mods.minus === key) labelCls += " sdv-minus";
        statsEl.createEl("span", { cls: labelCls, text: STAT_LABEL[key] });
        statsEl.createEl("span", { cls: "sdv-stat-base", text: String(base[key]) });
        const pct = Math.round(base[key] / 255 * 100);
        const color = pct >= 66 ? "var(--sdv-bar-high)" : pct >= 33 ? "var(--sdv-bar-mid)" : "var(--sdv-bar-low)";
        const track = statsEl.createEl("div", { cls: "sdv-bar-track" });
        track.createEl("div", { cls: "sdv-bar-fill", attr: { style: `width:${pct}%;background:${color}` } });
        statsEl.createEl("span", { cls: "sdv-stat-final", text: String(final[key]) });
        if (ev > 0) statsEl.createEl("span", { cls: "sdv-stat-ev", text: `(${ev} EV)` });
      }
    }
    if (set.moves.length > 0) {
      const movesEl = card.createEl("div", { cls: "sdv-moves" });
      for (const move of set.moves) {
        movesEl.createEl("div", { cls: "sdv-move", text: move });
      }
    }
  });
}
var ShowdownViewerPlugin = class extends import_obsidian.Plugin {
  onload() {
    return __async(this, null, function* () {
      this.registerMarkdownCodeBlockProcessor("showdown", (source, el) => __async(this, null, function* () {
        const container = el.createEl("div", { cls: "sdv-container" });
        const rawSets = source.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
        for (const raw of rawSets) {
          const set = parseShowdownSet(raw);
          if (!set) {
            container.createEl("div", { cls: "sdv-error", text: `Could not parse set:
${raw}` });
            continue;
          }
          yield renderSet(set, container);
        }
      }));
    });
  }
};
