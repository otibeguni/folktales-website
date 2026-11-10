# Topic Guide

Authoritative sources: `src/utils/topic-taxonomy.mjs` (categories, subtypes, validation)
and `src/content.config.ts` (Zod schema). This guide summarizes them and adds curation judgment.
Re-read the source files if they change.

## 1. What counts as a topic (selection criteria)

A topic is a **reusable entity that can appear in, or be referenced by, other stories** in the
collection — not a fixture of a single plot.

Target these categories:

- **Significant figures** (`Person`): saints/mystics, prophets, other religious figures, rulers,
  and recurring legendary heroes (e.g. Hatim Al-Tai). Not the unique protagonist of one tale.
- **Communities and groups** (`Group`): ethnic/religious/social groups and named collectives
  (Bede, Chakma, Brahmin, Baro-Bhuiyan).
- **Places**, using the place categories: `Landscape` (rivers, hills, forests, islands,
  wetlands, seas), `Settlement` (cities, towns, localities), `Region` (districts, administrative
  areas, geographic regions), `Polity` (kingdoms and other historic states), `Site` (shrines,
  temples, archaeological sites), and `Realm` (recurring mythic realms such as Mount Qaf,
  Patala, Swarga, Kshira Sagara).
- **Deities** (`Deity`): gods/goddesses, avatars, and folk deities (Bonbibi, Dakshin Rai,
  Manasa, Shiva).
- **Supernatural beings** (`Supernatural being`): classes (rakshasa, pari, jinn, byangoma) or
  named recurring beings (Raymoni), with `being_kind` set to `class` or `individual`.
- **Traditions / religions** (`Tradition`): religions, rituals, devotional schools, and folk
  traditions (Sanamahism, Islam, annaprashan).
- **Events** (`Event` → `Conflict`): named battles, conquests, and conflicts that recur across
  stories (e.g. the Conquest of Sylhet).
- **Texts within the story world** (`Work`): a scripture a character quotes, an epic a tale
  retells, a poem recited on-page. This is not the collection the story is published in —
  see the exclusions below.
- **Recurring magical objects** (`Object` → `Magical object or substance`): e.g. Parashmani,
  Aab-e Hayat.

**Exclude:**

- One-off characters invented for a single story's plot.
- Fictional places that exist only in that one tale.

**Never create:**

- **Source collections / works** — the book, anthology, puthi, jhuli, or sangrahamala a story
  comes from (e.g. Thakurmar Jhuli, Maimansingha Gitika, Chandramukhi Puthi). Provenance is
  already modelled in story metadata (`source_slug`, `source_text_slug`) and in `books` /
  `storyCollections`; duplicating it as a topic adds no connection between stories.
- **Authors, collectors, compilers, translators, editors** (`Person` → `Author or collector`).
  Credit belongs in the story/resource metadata, not in the topic graph.
- **Catch-all culture or corpus topics** — broad labels such as "Bengali folklore", "Chakma
  folklore", "Indian mythology", or "puthi literature". They are too general to relate specific
  stories; link or create the concrete entity (a deity, people, place, or specific tradition)
  instead.

An existing collection/author topic may still be linked, but only when the text or person is
actually part of the story's subject matter — never just because the story belongs to that
collection or credits that person. Likewise, don't add an existing catch-all culture/corpus
topic; propose the specific entity instead.

**Litmus test:** "Could this entity plausibly show up in another story here?" If yes → topic.
If it only exists to serve this one narrative → skip it. If it describes where the story was
published or who wrote it down, rather than what the story is about → skip it.

### Worked example (the pattern to emulate)

`gazi-kalu-chompaboti` links ten content topics: `sundarbans` (Landscape/Forest),
`gazi-pir` (Person/Saint or mystic), `dakshin-rai` (Deity/Folk deity), `khidr`
(Person/Prophet), `god-shiva`, `goddess-parvati`, `rahu`, and `ganga-devi` (Deity),
`patala` (Realm/Cosmological realm), and `mecca` (Settlement/City). Its source puthi and
compiler live in `source_slug` / book metadata (`name`, `author`) and are deliberately not
topics.

## 2. Always search existing topics first

Many topics already exist. Reuse instead of duplicating; watch for slug variants.

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

Place categories (`Landscape`, `Settlement`, `Region`, `Polity`, `Site`, `Realm`) require a
subtype. Every other category's subtype is optional: omit it when no listed value fits
(`Deity`, `Group`, `Tradition`, and `Event` have no `Other` subtype, so many topics leave it
empty). `Supernatural being` also requires `being_kind` (`class` or `individual`); `being_kind`
is invalid on every other category. The old `types` tag field was removed — writing it fails
validation.

The schema also allows `Work` and `Person / Author or collector`. Use them only for texts or
people that are part of the story world, never for the story's source collection or its
compiler (§1).

## 4. Frontmatter fields

| Field | Required | Notes |
|---|---|---|
| `slug` | yes | kebab-case; follow existing conventions (see below) |
| `item` | yes | English display label |
| `item_bn` | no | Bengali label — include when known |
| `wikidata_id` | no | `Q...` — **only if verified; never fabricate.** Omit if unsure |
| `category` | yes | one category from the table above |
| `subtype` | conditional | required for the six place categories; optional elsewhere |
| `being_kind` | conditional | required for supernatural beings; invalid on other categories |
| `types` | never | removed legacy tag list — use `category` + `subtype` |
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

# Group (community)
node tools/content-cli/cli.mjs create topic --slug bede-people --item "Bede People" \
  --item_bn "বেদে" --category Group --subtype Community \
  --description "Itinerant river-faring communities whose boats, healers, and snake charmers recur in Bengali tales."
```

There is deliberately no `Work`/`Collection` or `Person`/`Author or collector` example here:
do not create provenance topics for the source work or its compiler (§1).

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
