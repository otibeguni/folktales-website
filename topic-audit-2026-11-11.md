# Topic audit — last 20 commits

**Date:** 2026-11-11  
**Range:** `a2e6d4d` → `eab0739` (20 commits)  
**Scope:** topic files newly added in that range  
**Verdict:** 32 removed (17 strong + 15 judgment calls); 18 judgment calls remain; 43 kept

**Status:** All 32 approved candidates were removed on 2026-11-11 in two passes (27, then 5 single-use figures). The topic graph now has 293 topics; `validate all` reports no issues. The sections below preserve the original audit and mark what was removed.

## Method

- Listed every `src/content/topics/*.md` added in the 20 commits.
- **100** unique topic files were added. **7** were already removed by the pruning commit `ea233a5` (`bengali-folklore`, `chandramukhi-puthi`, `delaramer-puthi`, `haji-yasin`, `mayarshi-duchhra`, `muhammad-khalil`, `munshi-garibullah`), leaving **93** live topics.
- Checked each live topic against the repo's own `topic-guide.md` criteria, then measured how many stories link it and how many topic relations touch it.
- Ran `content validate topic`: **no validation issues**.

### Baseline

Single-story use is normal here, so it is not a flag by itself:

- 325 topics total; 197 are used by exactly one story, 50 by none.
- All 93 new topics have **0 topic relations**. They were added only as story tags, not as connected graph nodes.
- Most new topics have exactly **1 story link**. Deletion is therefore cheap: typically one `storyMetadata` reference and no relations.

### Where the density came from

New-in-window topics now on each enriched story:

| Story | New topics | Total topics |
|---|---:|---:|
| nimai-sanyas | 19 | 24 |
| gule-bakawali | 10 | 15 |
| merchant-amir-and-bhelua | 8 | 15 |
| komol-the-merchant | 8 | 12 |
| how-alcohol-came-to-be | 7 | 9 |
| the-chronicles-of-dulal | 7 | 9 |
| kolaboti-konna | 7 | 8 |
| well-of-mathin | 7 | 8 |
| kanu-the-milkman-and-the-curse-of-manik-pir | 5 | 9 |
| the-girl-who-was-raised-by-bears | 5 | 7 |
| the-tale-of-delaram | 4 | 7 |
| the-tale-of-bahram-badshah | 4 | 6 |
| the-witchs-dinner | 4 | 4 |
| king-khaybar-jung | 3 | 8 |
| the-tale-of-chandramukhi | 3 | 8 |
| mohon-mala | 3 | 6 |
| the-song-of-grapes-and-guavas | 2 | 7 |
| the-tale-of-madhob-and-maloncho | 2 | 7 |
| mayaroshi | 2 | 3 |
| the-tale-of-two-sister-birds | 2 | 2 |

## A. Removed in this pass — 17 strong candidates

These failed the guide's explicit exclusions: unique characters invented for one plot, fictional places that exist only in one tale, one-off objects, or catch-all labels. All 17 were deleted.

### One-off characters (7)

| Topic | Category | Story | Why |
|---|---|---|---|
| `delbar-laksha` | Person / Other | gule-bakawali | Supporting merchant queen invented for this romance; a plot device, not a recurring figure. |
| `hammala` | Supernatural being / Other / individual | gule-bakawali | One-off daitya guardian of the Bakawali garden; the existing `daitya-asura` class already covers the type. |
| `ruh-afza` | Supernatural being / Spirit / individual | gule-bakawali | One-off fairy cousin; the existing `pari` class already covers the type. |
| `khaybar-jung` | Person / Ruler | king-khaybar-jung | Eponymous king of a single tale; unique protagonist, not a recurring legendary figure. |
| `shukradeva` | Person / Ruler | how-alcohol-came-to-be | Framing king of one Tripuri origin tale; no recurrence. |
| `bahram-badshah` | Person / Ruler | the-tale-of-bahram-badshah | Eponymous emperor of a single kissa; unique protagonist. |
| `salim-badshah` | Person / Ruler | the-chronicles-of-dulal | Generic stock emperor who appears only in the Alal-Dulal story. |

### One-off fictional places (2)

| Topic | Category | Story | Why |
|---|---|---|---|
| `firdous-nagar` | Realm / Other | gule-bakawali | Fictional city that exists only in this romance; the guide excludes single-tale fictional places. |
| `shorkostan` | Realm / Other | gule-bakawali | Fictional kingdom that exists only in this romance; same exclusion. |

### One-off or plot-specific objects (5)

| Topic | Category | Story | Why |
|---|---|---|---|
| `bakawali-flower` | Object / Magical object | gule-bakawali | The flower is a plot device of one romance; the princess `bakawali` is the reusable character, not the flower. |
| `pitha-tree` | Object / Magical object | the-witchs-dinner | Hyper-specific one-tale wonder-tree; `pitha` already covers the food tradition. |
| `gumchak-fruit` | Object | kolaboti-konna | One-off mundane fruit used as a bride-quest token; not magical, and there is no mundane-substance subtype. |
| `sonar-kathi` | Object / Magical object | the-girl-who-was-raised-by-bears | One half of a paired one-tale object. Merge with `rupar-kathi` or drop both. |
| `rupar-kathi` | Object / Magical object | the-girl-who-was-raised-by-bears | Other half of the same pair. Merge or drop both. |

### Too broad, or wrong category (3)

| Topic | Category | Story | Why |
|---|---|---|---|
| `alcohol` | Object (no subtype) | how-alcohol-came-to-be | A broad substance, not an entity. `Object` only offers "Magical object or substance", which does not fit liquor. |
| `hindustan` | Region / Geographic region | the-tale-of-delaram | Continental catch-all label; too broad to connect specific stories, and overlaps real region nodes. |
| `mathiners-well` | Site / Other | well-of-mathin | Real local well, but it exists as a topic only because of one legend; no plausible reuse. |

## B. Judgment calls — 18 remaining

The original list had 33. Fifteen were removed: the 10 rows marked **Remove** in the first pass, plus the five single-use figures `tajul-muluk`, `bakawali`, `alal`, `dulal`, and `jagai-madhai` in the second. The 18 rows marked **Keep** remain and are the current judgment-call set.

| Topic | Category | Story | Why flagged | Lean |
|---|---|---|---|---|
| `tajul-muluk` | Person / Other | gule-bakawali | Protagonist of one puthi, but a famous romance hero. | Removed (2nd pass) |
| `bakawali` | Supernatural being / Spirit / individual | gule-bakawali | Famous puthi heroine; existing `pari` class also covers her type. | Removed (2nd pass) |
| `alal` | Person / Other | the-chronicles-of-dulal | Stock figure of the Alal-Dulal cycle; description claims cross-variant recurrence. | Removed (2nd pass) |
| `dulal` | Person / Other | the-chronicles-of-dulal | Proverbial hero of the same cycle. | Removed (2nd pass) |
| `jagai-madhai` | Group / Named collective | nimai-sanyas | Famous pair in Chaitanya lore; one story here, but plausible in hagiographic tales. | Removed (2nd pass) |
| `lakshmipriya` | Person / Other Religious Figure | nimai-sanyas | One-story wife figure; adds little next to `vishnupriya`. | Remove |
| `vishnupriya` | Person / Other Religious Figure | nimai-sanyas | One-story wife figure; functional duplicate of `lakshmipriya`. | Remove |
| `vishvarupa` | Person / Other Religious Figure | nimai-sanyas | One-story brother figure with a minor plot function. | Remove |
| `shachidevi` | Person / Other Religious Figure | nimai-sanyas | One-story mother figure; meaningful in the tale, no reuse. | Remove |
| `ekachakra` | Settlement / Locality | nimai-sanyas | Granular birthplace village; `nabadwip` is the usable hub. | Remove |
| `katwa` | Settlement / Town | nimai-sanyas | Granular sannyas site; could fold into `nabadwip`/Nadia. | Remove |
| `khardaha` | Settlement / Locality | nimai-sanyas | Minor locality tied to Nityananda; one story. | Remove |
| `teknaf-upazila` | Region / Administrative area | well-of-mathin | Administrative unit used only to express "Teknaf to Tetulia"; too granular. | Remove |
| `tetulia-upazila` | Region / Administrative area | well-of-mathin | Same, the northern pole of the expression. | Remove |
| `naf-river` | Landscape / River | well-of-mathin | Real border river; plausible in regional/coastal tales, one story now. | Keep |
| `isfahan` | Settlement / City | the-tale-of-delaram | Real puthi setting; likely to recur across puthi romances. | Keep |
| `gaya` | Settlement / City | nimai-sanyas | Major pilgrimage city tied to `shraddha`; plausible reuse. | Keep |
| `misr` | Region / Geographic region | the-tale-of-chandramukhi | Egypt as a puthi setting; plausible reuse. | Keep |
| `jadu-aaina` | Object / Magical object | kolaboti-konna | Generic magic-mirror motif; reusable class even though one story now. | Keep |
| `magic-gourd` | Object / Magical object | kolaboti-konna | Generic wonder-object motif; reusable. | Keep |
| `mayakathi` | Object / Magical object | the-song-of-grapes-and-guavas | Generic magic-wand motif; reusable. | Keep |
| `sky-reaching-tree` | Object / Magical object | the-tale-of-two-sister-birds | Generic motif; reusable. | Keep |
| `life-token-tree` | Object / Magical object | the-girl-who-was-raised-by-bears | Generic life-token motif; reusable. | Keep |
| `golden-fish` | Supernatural being / Animal-like / class | kolaboti-konna | Generic spirit-in-fish motif; reusable. | Keep |
| `white-elephant` | Supernatural being / Animal-like / class | komol-the-merchant | Reusable motif, but white elephants are real animals; category is a stretch. | Keep + fix |
| `qissa` | Tradition / Folk tradition | the-girl-who-was-raised-by-bears, the-tale-of-bahram-badshah | Broad genre, but distinct from `puthi`; two stories. | Keep |
| `mantra` | Tradition / Ritual | how-alcohol-came-to-be, nimai-sanyas | Broad ritual concept, but recurring; two stories. | Keep |
| `tantra` | Tradition / Devotional school | how-alcohol-came-to-be | Broad tradition; overlaps `tantrik`, but tradition vs practitioners is a valid split. | Keep |
| `pir` | Group / Social group | kanu-the-milkman... | Broad class, but anchors existing `gazi-pir`, `manik-pir`, `madar-pir`. | Keep |
| `rishi` | Group / Social group | the-girl-who-was-raised-by-bears | Broad class; reusable in Indic tales. | Keep |
| `zamindar` | Group / Social group | well-of-mathin | Broad class; recurring rural social backdrop. | Keep |
| `rinai` | Tradition / Folk tradition | kolaboti-konna | A single garment, not a tradition; poor category fit, one story. | Remove |
| `sea-god` | Deity / Folk deity | komol-the-merchant | Folk-deity class; reusable in seafaring tales. | Keep |

## C. Keep — 43

These either have real reuse or name a concrete, reusable entity. Single-story use is noted but not treated as a defect.

- **Reuse across 2+ stories:** `fakir` (6), `saudagar` (4), `daini` (4), `dasi-handmaiden` (2), `sannyasi` (2), `vaishnavism` (2), `bay-of-bengal` (2), `tripura-kingdom` (2).
- **Chaitanya figures with standalone significance:** `nityananda`, `gadadhar`, `ishwar-puri`.
- **Specific traditions/rituals (not catch-all labels):** `annaprashan`, `baromasi`, `kirtan`, `nara-bali`, `pitha`, `rajtilak`, `shraddha`, `sindoor`, `sinni`, `zikr`, `puthi` (intentionally retained).
- **Social/occupational groups:** `ganak`, `ghosh-people`, `halwai`, `morol`, `nazir`, `qazi`, `rakhal`, `tantrik`.
- **Reusable supernatural classes:** `apsara`, `gandharva`, `jolpari`, `khokkas`, `moyna-bird`.
- **Specific objects/texts/realms/places:** `sudarsana-chakra`, `tabej`, `quran`, `indrasabha`, `gramadevata`, `nabadwip`, `kolkata`, `north-bengal`.

## D. Merge and reclassify opportunities

1. **`sonar-kathi` + `rupar-kathi`** — a paired set from one story. If kept, model as one topic ("golden and silver sticks") rather than two nodes. Currently both are strong removals.
2. **`bakawali` + `bakawali-flower`** — keep the princess, remove the flower.
3. **`pitha` + `pitha-tree`** — keep the food tradition, remove the plot tree.
4. **`tantra` + `tantrik`** — one story each; consider folding the practitioners into the tradition, or keep both only if tantric tales expand.
5. **`nabadwip` + `ekachakra` + `katwa` + `khardaha`** — collapse the three villages into Nabadwip/Nadia unless Chaitanya hagiography becomes a real sub-collection.
6. **Well-of-Mathin cluster** — keep at most two of `bay-of-bengal`, `naf-river`, `teknaf-upazila`, `tetulia-upazila`, `mathiners-well`. The two administrative units are the weakest.
7. **`alal` + `dulal` + `salim-badshah`** — keep the two stock heroes, drop the generic emperor.
8. **`pir` vs `fakir`** — overlapping categories; `fakir` has six stories, `pir` one. Keep `pir` only if it is meant as the class anchor for the individual pir topics.

### Metadata smells

- `alcohol` and `gumchak-fruit` are `Object` with no subtype; the only Object subtype is "Magical object or substance", so mundane items do not really fit.
- `white-elephant` is modeled as a supernatural being, but white elephants are real animals. Keep only if the tale's elephant is intended as mythical.
- `rinai` models a garment as a Tradition. Folk tradition is arguable, but if kept it is the weakest fit in that category.

## E. What I deliberately did not flag

- Real cities/regions that are single-use here but plausibly recur: `kolkata`, `gaya`, `misr`, `isfahan`, `naf-river`.
- Reusable motif classes even when used once: magic mirror, magic gourd, magic wand, sky-reaching tree, life-token tree, golden fish, sea god.
- Specific traditions and social groups, even at one story, because they name a concrete practice/role rather than a catch-all label.
- `puthi` — retained deliberately per the earlier pruning decision.

If you want a stricter rule ("only topics used by 2+ stories survive"), then the single-use traditions and groups in **C** also become candidates. That would be a much larger cut; I have not assumed it.

## F. Post-removal status

Removal is complete:

- 32 topics deleted across two passes. Each cascade removed exactly one `storyMetadata` reference; no books, resources, or topic relations were affected.
- Topic count: 325 → 293.
- `validate all`: no issues.

The 18 remaining judgment calls are the rows marked **Keep** in section B. If you want to tighten further, the next decisions are:

1. Drop the single-use motif objects (`jadu-aaina`, `magic-gourd`, `mayakathi`, `sky-reaching-tree`, `life-token-tree`, `golden-fish`, `white-elephant`) if motifs should not be pre-created.
2. Keep the real places and broad groups, which are the most likely to gain a second story.
