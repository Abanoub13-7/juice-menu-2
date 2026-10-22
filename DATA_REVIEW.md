# DATA_REVIEW — City Drink Alharam Menu

This file lists every place where the source PDF (`كتالوج_سيتي_درينك_الهرم...pdf`,
16 pages) produced two different readings for the same product, or where the
product/price relationship was not 100% certain from the extracted text. In
every case below, the app currently shows one of the plausible readings and
marks the product with a small "السعر قيد المراجعة اليدوية" (price pending
manual review) tag — **please check these against the physical menu / design
file and correct `src/data/menu.ts` before publishing.**

## Why this happened

Each page of the PDF was supplied twice in the extracted text: once as the
rendered page image (read in strict visual top‑to‑bottom, right‑to‑left
order) and once as a secondary OCR pass of the same page. On page 3 (قصب),
the two passes disagreed on the price row for 3 of the 11 sugarcane items —
everywhere else in the document the two passes agreed, which is why only
this page and two isolated items elsewhere are flagged.

## Flagged items

| Category | Product | Shown in app (J / XL / L) | Alternative reading found | Notes |
|---|---|---|---|---|
| قصب | قصب بالحلاوة الطحينية | 30 / 25 / 20 | 30 / 25 / 15 | Two OCR passes of page 3 disagreed only on the L price. |
| قصب | قصب بالجزر | 30 / 25 / 15 | 35 / 30 / 20 | Passes disagreed on all three sizes; row may have been swapped with "قصب بالبرتقال". |
| قصب | قصب بالبرتقال | 35 / 30 / 20 | 30 / 25 / 20 | Likely the counterpart swap to the قصب بالجزر row above — please confirm which row belongs to which product. |
| دايت زون | دواء للسمنة | 85 / 70 / 50 (single product) | Could be two separate products | The PDF lists two ingredient lines under one heading — "موز + كيوي + أناناس" **and** "جريب فروت + ليمون + تفاح" — with only one set of prices shown. It's unclear whether this is one recipe with two ingredient options or two menu items that should each get their own row/price. |
| أطباق وحلويات | قنبلة حص ك / قنبلة حص ص | 60 (ك) / 40 (ص) | — | The PDF labels these "قنبلة ح ك" and "قنبلة ح ص" with a single price each (no ص/ك split visible on the item itself, unlike the desserts below them which do show ص/ك). Confirm whether "ح" stands for a size or an ingredient (e.g. حلاوة) and whether 60/40 are two sizes of the same dessert or two different desserts. |

## Items to double-check even though no numeric conflict was found

- **علبة كنتالوب** and **علبة بطيخ** (fruit boxes): the PDF only shows a single
  "ك" (large) price for these two, unlike every other fruit box which has
  both ص and ك. This has been preserved as-is (single size), but please
  confirm a small size simply isn't offered for these two fruits rather than
  being missing from the scan.
- **چركن تمر** vs **چركن تمر طبيعي** (jugs): the PDF appears to list both a
  plain "تمر" jug and a "تمر طبيعي" jug with different prices. Both have been
  kept as separate products — please confirm they are in fact two distinct
  offerings and not a duplicate/correction of the same row.

## Not flagged

Every other product in the menu (172 of 180 items) had a single, consistent
price reading across both extraction passes and required no assumptions.
