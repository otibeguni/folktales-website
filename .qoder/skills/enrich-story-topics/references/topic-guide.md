# Topic Guide

Authoritative sources: `src/utils/topic-taxonomy.mjs` (categories, subtypes, validation)
and `src/content.config.ts` (Zod schema). This guide summarizes them and adds curation judgment.
Re-read the source files if they change.

## 1. What counts as a topic (selection criteria)

A topic is a **reusable entity that can appear in, or be referenced by, other stories** in the
collection — not a fixture of a single plot. This skill processes **one story per run**: a new
topic starts with one story link and is not back-filled onto stories processed earlier. That
makes the future-use question, not the current link count, the deciding test.

Target these categories:

- **Significant figures** (`Person`): saints/mystics, prophets, other religious figures, and
  recurring legendary heroes (e.g. Hatim Al-Tai). Not the unique protagonist, eponymous ruler,
  or supporting character of one tale.
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
  Aab-e Hayat. Create the reusable motif, not a one-off plot prop.

**Exclude:**

- One-off characters invented for a single story's plot: protagonists, antagonists, eponymous
  rulers, and supporting cast. A story named after a character is not evidence of reuse.
- Fictional places that exist only in that one tale.
- One-off plot props whose only function is to resolve this story.
- Villages, wards, upazilas, and single landmarks when a city/region hub already covers the
  setting; a place that exists as a topic only because of one legend.
- Mundane food, drink, or clothing modeled as `Object` — `Object` is only for magical
  objects/substances.
- Relative/associate figures from one hagiographic story; keep only figures with independent
  significance outside the plot.

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

**Litmus test (one-story runs):** Name a **specific unprocessed or planned story** in the
collection that would link this entity. If you cannot, skip it — "it might recur" and "the wider
tradition knows it" are not enough. If it only exists to serve this narrative → skip it. If it
describes where the story was published or who wrote it down rather than what the story is about
→ skip it.

### Class before individual

Before naming an individual, search for its type: `pari`, `daitya-asura`, `rakshasa`, `jinn`,
`pir`, `zamindar`, `badshah`. If the graph already has the class, link the class unless the
individual has independent significance outside the plot (a saint with a cult, a prophet, a
recurring legendary hero). An individual created in a one-story run may stay a one-story node
forever.

Example: `gule-bakawali` already had `pari`, `daitya-asura`, `azdaha`, `god-indra`, and
`patala`. The right enrichment was to link those; Bakawali and Ruh Afza are instances of `pari`,
and Hammala is an instance of `daitya-asura`.

### Worked example (the pattern to emulate)

`gazi-kalu-chompaboti` links ten content topics: `sundarbans` (Landscape/Forest),
`gazi-pir` (Person/Saint or mystic), `dakshin-rai` (Deity/Folk deity), `khidr`
(Person/Prophet), `god-shiva`, `goddess-parvati`, `rahu`, and `ganga-devi` (Deity),
`patala` (Realm/Cosmological realm), and `mecca` (Settlement/City). Its source puthi and
compiler live in `source_slug` / book metadata (`name`, `author`) and are deliberately not
topics.

### Worked anti-example (the pattern to avoid)

A single puthi can tempt a topic-per-character list. `gule-bakawali` already had `pari`,
`daitya-asura`, `azdaha`, `god-indra`, and `patala`. Creating `bakawali`, `ruh-afza`, `hammala`,
`delbar-laksha`, `tajul-muluk`, `firdous-nagar`, `shorkostan`, and `bakawali-flower` added no
reusable connections; all were removed in the 2026-11 audit. The durable additions were the
existing class/realm links plus `indrasabha` and `fakir` where they genuinely fit.

### Anti-patterns from the 2026-11 audit

| Pattern | Removed examples | Instead |
|---|---|---|
| Fictional lead or eponymous hero | `khaybar-jung`, `bahram-badshah`, `tajul-muluk`, `bakawali`, `alal`, `dulal` | Link the tale's existing class/theme; do not create the individual. |
| Supporting cast | `delbar-laksha`, `hammala`, `ruh-afza`, `salim-badshah`, `jagai-madhai` | Use `pari` / `daitya-asura` or omit. |
| One-tale fictional place | `firdous-nagar`, `shorkostan` | Omit; the story page carries the setting. |
| Granular real place | `ekachakra`, `katwa`, `khardaha`, `teknaf-upazila`, `tetulia-upazila`, `mathiners-well` | Link the city/region hub or omit. |
| Plot prop | `bakawali-flower`, `pitha-tree`, `sonar-kathi`, `rupar-kathi` | Create the generic motif only if reusable; otherwise omit. |
| Mundane item forced into `Object` | `alcohol`, `gumchak-fruit` | Use `Tradition / Folk tradition` if it is a custom, or omit. |
| Continental label | `hindustan` | Use a concrete region or omit. |
| Relative/associate overload | `lakshmipriya`, `vishnupriya`, `vishvarupa`, `shachidevi` | Keep only figures with independent significance. |

### Place granularity

Use the coarsest node that carries the story's geography. A village scene usually needs the
city, district, or region, not the village. Do not create a topic for a landmark whose only
claim is one legend. Retained examples: `nabadwip`, `kolkata`, `gaya`, `misr`, `isfahan`,
`naf-river`, `bay-of-bengal`. Removed: `ekachakra`, `katwa`, `khardaha`, `teknaf-upazila`,
`tetulia-upazila`, `mathiners-well`.

### Object discipline

`Object` is only for magical objects/substances. Create the reusable motif (`jadu-aaina` Magic
Mirror, `magic-gourd`, `life-token-tree`, `sky-reaching-tree`), not the named prop
(`bakawali-flower`, `pitha-tree`, `sonar-kathi`, `rupar-kathi`). Mundane items (`alcohol`,
`gumchak-fruit`, `rinai`) are not Objects; model a custom under `Tradition / Folk tradition` or
omit it.

### Broad labels must anchor something

A broad node is acceptable only if it anchors concrete children or spans multiple stories:
`pir` anchors `gazi-pir`, `manik-pir`, and `madar-pir`; `fakir` spans six stories. `hindustan`
and `alcohol` anchor nothing and were removed. Substances, abstract activities, and continental
labels are not topics.

### Soft budget

Aim for **4–6 new topics per story**. If you have more candidates, rank them by (1) the concrete
future story that would link them, (2) class/hub coverage, and (3) concreteness, then keep the
strongest. Density was the leading indicator of one-offs in the audit: `nimai-sanyas` 19 new,
`gul-e-bakawali` 10, `well-of-mathin` 7.

## 2. Always search existing topics first

Many topics already exist. Reuse instead of duplicating; watch for slug variants.

```bash
node tools/content-cli/cli.mjs search topic --query "<name or Bengali label>" --json
node tools/content-cli/cli.mjs list topic --category Landscape --json
node tools/content-cli/cli.mjs get topic <slug> --json
```

Match candidates by `item`, `item_bn`, and `wikidata_id`, not just slug. Also search the type
vocabulary (`fairy`, `pari`, `daitya`, `rakshasa`, `pir`, `zamindar`) so an existing class is not
missed. If a topic exists, **link it** rather than creating a near-duplicate.

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

`Object` means magical object or substance; do not use it for mundane food, drink, or clothing.
`Supernatural being` is for spirits and mythic creatures; a real animal does not belong there
unless the tale makes it genuinely mythical.

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
