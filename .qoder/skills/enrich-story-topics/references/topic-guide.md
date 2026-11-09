# Topic Guide

Authoritative sources: `src/utils/topic-taxonomy.mjs` (categories, subtypes, validation)
and `src/content.config.ts` (Zod schema). This guide summarizes them and adds curation judgment.
Re-read the source files if they change.

## 1. What counts as a topic (selection criteria)

A topic is a **reusable entity that can appear in, or be referenced by, other stories** in the
collection — not a fixture of a single plot.

Target these categories:

- **Significant figures** (`Person`): saints/mystics, prophets, rulers, and recurring legendary
  heroes (e.g. Hatim Al-Tai). Not the unique protagonist of one tale.
- **Communities** (`People` → Group): ethnic/religious/social groups, named collectives.
- **Places** (`Place`/`Site`/`Kingdom`): real regions, rivers, cities, sacred sites, shrines,
  historic polities, and **recurring mythic realms** (Mount Qaf, Patala, Swarga, Kshira Sagara).
- **Traditions / religions** (`Tradition`): e.g. Sanamahism, devotional schools, rituals.
- **Deities** (`Deity`): gods/goddesses and folk deities (Bonbibi, Dakshin Rai, Manasa, Shiva).
- **Supernatural beings** (`Supernatural being`): classes (rakshasa, pari, jinn, byangoma) or
  named recurring beings (Raymoni).
- **Source works and scripture** (`Work`): the collection or poem a story belongs
  to (Thakurmar Jhuli, Maimansingha Gitika, Bonobibi Jahuranama, Vedas).
- **Recurring magical objects** (`Object`): e.g. Parashmani, Aab-e Hayat.

**Exclude:**

- One-off characters invented for a single story's plot.
- Fictional places that exist only in that one tale.

**Litmus test:** "Could this entity plausibly show up in another story here?" If yes → topic.
If it only exists to serve this one narrative → skip it.

### Worked example (the pattern to emulate)

`bonobibi-jahuranama` links nine topics, including `bonbibi-deity` and `dakshin-rai` (Deity),
`shah-jongoli` (Person/Saint or mystic),
`prophet-muhammad` (Person/Prophet), `sundarbans` (Landscape/Forest),
`ganges-river` (Landscape/River), `mecca` and `medina` (Settlement/City),
and `bonobibi-jahuranama` (Work). Gulal Bibi, Berahim, Phulbibi, and Raymoni appear in the story text.

## 2. Always search existing topics first

~198 topics already exist. Reuse instead of duplicating; watch for slug variants.

```bash
node tools/content-cli/cli.mjs search topic --query "<name or Bengali label>" --json
node tools/content-cli/cli.mjs list topic --category Landscape --json
node tools/content-cli/cli.mjs get topic <slug> --json
```

Match candidates by `item`, `item_bn`, and `wikidata_id`, not just slug. If a topic exists,
**link it** rather than creating a near-duplicate.

## 3. Taxonomy

Each topic has one `category`. The subtype must belong to that category.

| Category | Valid subtypes |
|---|---|
| Landscape | River, Hill or mountain, Island, Wetland, Sea, Forest, Other |
| Settlement | City, Town, Locality, Other |
| Region | District, Administrative area, Geographic region, Other |
| Polity | Kingdom, Other |
| Site | Shrine / mazar, Temple, Archaeological site, Other |
| Realm | Cosmological realm, Other |
| Deity | Folk deity, Avatar |
| Person | Saint or mystic, Prophet, Other Religious Figure, Ruler, Author or collector, Other |
| Group | Community, Social group, Named collective |
| Supernatural being | Spirit, Animal-like being, Other |
| Work | Collection, Puthi, Epic, Narrative poetry, Scripture, Other |
| Tradition | Religion, Ritual, Devotional school, Folk tradition |
| Event | Conflict |
| Object | Magical object or substance |

Landscape, Settlement, Region, Polity, Site, and Realm require a subtype.
Supernatural beings also require `being_kind`. Use `class` for a type such as
jinn and `individual` for a named being such as Duldul.

## 4. Frontmatter fields

| Field | Required | Notes |
|---|---|---|
| `slug` | yes | kebab-case; follow existing conventions (see below) |
| `item` | yes | English display label |
| `item_bn` | no | Bengali label — include when known |
| `wikidata_id` | no | `Q...` — **only if verified; never fabricate.** Omit if unsure |
| `category` | yes | one category from the table above |
| `subtype` | conditional | required for place categories |
| `being_kind` | conditional | required for supernatural beings only |
| `description` | no | 1–2 sentences, single line: what it is + why it recurs |
| `latitude` / `longitude` | no | numbers; real places only |

**Slug conventions** (mirror existing topics): prefixes `god-`, `goddess-`, `prophet-`,
`hazrat-`; suffixes `-people`, `-district`, `-division`, `-city`, `-upazila`, `-river`,
`-deity`, `-mazar`, `-dargah`, `-kingdom`, `-pir`; plain names for supernatural beings
(`rakshasa`, `pari`, `jinn`) and mythic places (`mount-qaf`, `patala`, `swarga-heaven`).

## 5. Create commands (illustrative — these topics already exist; adapt for new entities)

Flags use **underscores** (`--item_bn`, `--wikidata_id`, `--being_kind`).
Keep `--description` a single line and mind shell quoting.

```bash
# Supernatural being (class)
node tools/content-cli/cli.mjs create topic --slug pari --item "Pari" --item_bn "পরী" \
  --wikidata_id Q1542990 --category "Supernatural being" --subtype Spirit --being_kind class \
  --description "Winged spirits of Persian and Bengali folklore, recurring across many tales."

# Person (prophet)
node tools/content-cli/cli.mjs create topic --slug prophet-muhammad --item "Prophet Muhammad" \
  --category Person --subtype Prophet

# Region (district, with coordinates)
node tools/content-cli/cli.mjs create topic --slug barishal --item "Barishal" \
  --category Region --subtype District --latitude 22.8 --longitude 90.37 \
  --description "A riverine district in southern Bengal, a setting for regional legends."

# Site (shrine)
node tools/content-cli/cli.mjs create topic --slug kutub-shah-mazar --item "Kutub Shah Mazar" \
  --category Site --subtype "Shrine / mazar" \
  --description "A Sylhet shrine dedicated to Shah Jalal's companion Kutub Shah."

# Tradition / religion
node tools/content-cli/cli.mjs create topic --slug sanamahism --item "Sanamahism" \
  --category Tradition --subtype Religion \
  --description "The Meitei religious tradition behind the Sidaba Mapu and Helloi stories."

# Work (source collection)
node tools/content-cli/cli.mjs create topic --slug thakurmar-jhuli --item "Thakurmar Jhuli" \
  --item_bn "ঠাকুরমার ঝুলি" --wikidata_id Q3350396 --category Work --subtype "Collection" \
  --description "Dakshinaranjan Mitra Majumder's collection of Bengali folk and fairy tales."
```

If a description needs embedded quotes or multiple lines, create with the core flags, then
edit `src/content/topics/<slug>.md` directly and re-validate.

## 6. Link topics to a story

```bash
node tools/content-cli/cli.mjs update story <routeSlug> --add topic_slugs=<topic-slug>
```

Repeat `--add topic_slugs=...` for multiple topics. This edits the shared `storyMetadata`
record, so it applies to both `en` and `bn` translations. Add `--language en` only if you need
to disambiguate the story file.

## 7. Validate

```bash
node tools/content-cli/cli.mjs validate topic
node tools/content-cli/cli.mjs validate story
node tools/content-cli/cli.mjs get story <routeSlug> --json   # confirm links.topics
```

Expect no issues. `validate` exits non-zero if any classification or reference is broken.
