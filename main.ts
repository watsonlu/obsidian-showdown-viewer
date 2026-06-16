import { Plugin } from "obsidian";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatBlock {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

interface ShowdownSet {
  nickname: string | null;
  species: string;
  gender: string | null;
  item: string | null;
  ability: string | null;
  level: number;
  evs: Partial<StatBlock>;
  ivs: Partial<StatBlock>;
  nature: string | null;
  moves: string[];
}

interface PokeApiPokemon {
  sprites: { front_default: string | null };
  stats: Array<{ base_stat: number; stat: { name: string } }>;
}

// ─── Nature table ─────────────────────────────────────────────────────────────

type StatKey = keyof StatBlock;

const NATURE_MODS: Record<string, { plus: StatKey | null; minus: StatKey | null }> = {
  hardy:   { plus: null,  minus: null  },
  docile:  { plus: null,  minus: null  },
  serious: { plus: null,  minus: null  },
  bashful: { plus: null,  minus: null  },
  quirky:  { plus: null,  minus: null  },
  lonely:  { plus: "atk", minus: "def" },
  brave:   { plus: "atk", minus: "spe" },
  adamant: { plus: "atk", minus: "spa" },
  naughty: { plus: "atk", minus: "spd" },
  bold:    { plus: "def", minus: "atk" },
  relaxed: { plus: "def", minus: "spe" },
  impish:  { plus: "def", minus: "spa" },
  lax:     { plus: "def", minus: "spd" },
  timid:   { plus: "spe", minus: "atk" },
  hasty:   { plus: "spe", minus: "def" },
  jolly:   { plus: "spe", minus: "spa" },
  naive:   { plus: "spe", minus: "spd" },
  modest:  { plus: "spa", minus: "atk" },
  mild:    { plus: "spa", minus: "def" },
  quiet:   { plus: "spa", minus: "spe" },
  rash:    { plus: "spa", minus: "spd" },
  calm:    { plus: "spd", minus: "atk" },
  gentle:  { plus: "spd", minus: "def" },
  sassy:   { plus: "spd", minus: "spe" },
  careful: { plus: "spd", minus: "spa" },
};

const STAT_LABEL: Record<StatKey, string> = {
  hp:  "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

const STAT_ORDER: StatKey[] = ["hp", "atk", "def", "spa", "spd", "spe"];

const API_STAT_MAP: Record<string, StatKey> = {
  hp:               "hp",
  attack:           "atk",
  defense:          "def",
  "special-attack": "spa",
  "special-defense":"spd",
  speed:            "spe",
};

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseEvLine(line: string): Partial<StatBlock> {
  const result: Partial<StatBlock> = {};
  const parts = line.replace(/^EVs:\s*/i, "").split("/");
  for (const part of parts) {
    const m = part.trim().match(/^(\d+)\s+(\w+)$/);
    if (!m) continue;
    const val = parseInt(m[1], 10);
    const label = m[2].toLowerCase();
    const map: Record<string, StatKey> = {
      hp: "hp", atk: "atk", def: "def",
      spa: "spa", spd: "spd", spe: "spe",
    };
    if (label in map) result[map[label]] = val;
  }
  return result;
}

function parseIvLine(line: string): Partial<StatBlock> {
  return parseEvLine(line.replace(/^IVs:/i, "EVs:"));
}

function parseFirstLine(line: string): Pick<ShowdownSet, "nickname" | "species" | "gender" | "item"> {
  let rest = line.trim();
  let item: string | null = null;

  const atIdx = rest.indexOf(" @ ");
  if (atIdx !== -1) {
    item = rest.slice(atIdx + 3).trim();
    rest = rest.slice(0, atIdx).trim();
  }

  let gender: string | null = null;
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

function parseShowdownSet(text: string): ShowdownSet | null {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const first = parseFirstLine(lines[0]);
  const set: ShowdownSet = {
    ...first,
    ability: null,
    level: 100,
    evs: {},
    ivs: {},
    nature: null,
    moves: [],
  };

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

// ─── Stat calculation ─────────────────────────────────────────────────────────

function calcStats(base: StatBlock, set: ShowdownSet): StatBlock {
  const mods = set.nature ? (NATURE_MODS[set.nature] ?? { plus: null, minus: null }) : { plus: null, minus: null };
  const level = set.level;

  const calc = (key: StatKey): number => {
    const b = base[key];
    const iv = set.ivs[key] ?? 31;
    const ev = set.evs[key] ?? 0;
    if (key === "hp") {
      return Math.floor((2 * b + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
    }
    let stat = Math.floor((Math.floor((2 * b + iv + Math.floor(ev / 4)) * level / 100) + 5));
    if (mods.plus === key)  stat = Math.floor(stat * 1.1);
    if (mods.minus === key) stat = Math.floor(stat * 0.9);
    return stat;
  };

  return {
    hp:  calc("hp"),
    atk: calc("atk"),
    def: calc("def"),
    spa: calc("spa"),
    spd: calc("spd"),
    spe: calc("spe"),
  };
}

// ─── PokéAPI ──────────────────────────────────────────────────────────────────

const apiCache = new Map<string, PokeApiPokemon>();

async function fetchPokemon(species: string): Promise<PokeApiPokemon | null> {
  const key = species.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  if (apiCache.has(key)) return apiCache.get(key)!;
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${key}`);
    if (!res.ok) return null;
    const data: PokeApiPokemon = await res.json();
    apiCache.set(key, data);
    return data;
  } catch {
    return null;
  }
}

function extractBaseStats(data: PokeApiPokemon): StatBlock {
  const block: Partial<StatBlock> = {};
  for (const s of data.stats) {
    const key = API_STAT_MAP[s.stat.name];
    if (key) block[key] = s.base_stat;
  }
  return {
    hp:  block.hp  ?? 0,
    atk: block.atk ?? 0,
    def: block.def ?? 0,
    spa: block.spa ?? 0,
    spd: block.spd ?? 0,
    spe: block.spe ?? 0,
  };
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function statBar(value: number, max = 255): string {
  const pct = Math.round((value / max) * 100);
  const color = pct >= 66 ? "var(--sdv-bar-high)" : pct >= 33 ? "var(--sdv-bar-mid)" : "var(--sdv-bar-low)";
  return `<div class="sdv-bar-track"><div class="sdv-bar-fill" style="width:${pct}%;background:${color}"></div></div>`;
}

async function renderSet(set: ShowdownSet, container: HTMLElement): Promise<void> {
  const card = container.createEl("div", { cls: "sdv-card" });

  const loader = card.createEl("div", { cls: "sdv-loader", text: "Loading…" });
  const data = await fetchPokemon(set.species);
  loader.remove();

  // ── Header ──
  const header = card.createEl("div", { cls: "sdv-header" });

  const spriteUrl = data?.sprites?.front_default ?? null;
  if (spriteUrl) {
    header.createEl("img", { cls: "sdv-sprite", attr: { src: spriteUrl, alt: set.species } });
  }

  const info = header.createEl("div", { cls: "sdv-info" });

  const nameLine = info.createEl("div", { cls: "sdv-name" });
  nameLine.createEl("span", { cls: "sdv-species", text: set.nickname ? `${set.nickname} (${set.species})` : set.species });
  if (set.gender) nameLine.createEl("span", { cls: `sdv-gender sdv-gender-${set.gender.toLowerCase()}`, text: ` (${set.gender})` });
  if (set.item)   info.createEl("div", { cls: "sdv-item",    text: `@ ${set.item}` });
  if (set.ability)info.createEl("div", { cls: "sdv-ability", text: `Ability: ${set.ability}` });

  const natureLine = info.createEl("div", { cls: "sdv-nature" });
  if (set.nature) {
    const mods = NATURE_MODS[set.nature];
    natureLine.createEl("span", { text: `${capitalize(set.nature)} Nature` });
    if (mods?.plus)  natureLine.createEl("span", { cls: "sdv-plus",  text: ` (+${STAT_LABEL[mods.plus]})` });
    if (mods?.minus) natureLine.createEl("span", { cls: "sdv-minus", text: ` (−${STAT_LABEL[mods.minus]})` });
  }

  // ── Stats ──
  if (data) {
    const base = extractBaseStats(data);
    const final = calcStats(base, set);
    const mods = set.nature ? (NATURE_MODS[set.nature] ?? { plus: null, minus: null }) : { plus: null, minus: null };

    const statsEl = card.createEl("div", { cls: "sdv-stats" });
    for (const key of STAT_ORDER) {
      const ev  = set.evs[key] ?? 0;
      const row = statsEl.createEl("div", { cls: "sdv-stat-row" });

      let labelCls = "sdv-stat-label";
      if (mods.plus  === key) labelCls += " sdv-plus";
      if (mods.minus === key) labelCls += " sdv-minus";

      row.createEl("span", { cls: labelCls, text: STAT_LABEL[key] });
      row.createEl("span", { cls: "sdv-stat-base",  text: String(base[key]) });
      row.innerHTML += statBar(base[key]);
      row.createEl("span", { cls: "sdv-stat-final", text: String(final[key]) });
      if (ev > 0) row.createEl("span", { cls: "sdv-stat-ev", text: `(${ev} EV)` });
    }
  }

  // ── Moves ──
  if (set.moves.length > 0) {
    const movesEl = card.createEl("div", { cls: "sdv-moves" });
    for (const move of set.moves) {
      movesEl.createEl("div", { cls: "sdv-move", text: move });
    }
  }
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default class ShowdownViewerPlugin extends Plugin {
  async onload() {
    this.registerMarkdownCodeBlockProcessor("showdown", async (source, el) => {
      const container = el.createEl("div", { cls: "sdv-container" });

      const rawSets = source.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);

      for (const raw of rawSets) {
        const set = parseShowdownSet(raw);
        if (!set) {
          container.createEl("div", { cls: "sdv-error", text: `Could not parse set:\n${raw}` });
          continue;
        }
        await renderSet(set, container);
      }
    });
  }
}
