# CAS catalog verification

Reviewed: 2026-09-30. The site displays CAS numbers for identified substances and explicitly labeled main ingredients, but not the component numbers of the SM210 mixed resin. Search accepts the formatted number, digits without hyphens, and a `CAS No.` prefix in Korean and English. Citric acid lists two possible hydration forms; neither is asserted to be the form of a particular stocked batch.

## Scope and source

`data/cas-catalog.json` is the editable source of catalog identifiers. The static locale builder renders applicable numbers into both HTML catalogs, excluding mixed-resin component identifiers. The public pages remain legible and indexable without JavaScript. The build validates CAS check digits and that every mapped card exists.

The following identifiers were checked on 2026-09-30 against the corresponding US National Library of Medicine PubChem records using the [official PUG REST property API](https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest) (`/rest/pug/compound/name/{CAS}/property/IUPACName,MolecularFormula/JSON`). The returned compound identities matched the listed substance names. This confirms *substance identity*, not the composition of every supplier batch or a supplied product's SDS.

| Catalog description | CAS No. | PubChem CID |
| --- | --- | ---: |
| IPA / isopropanol | 67-63-0 | [3776](https://pubchem.ncbi.nlm.nih.gov/compound/3776) |
| MEK / butanone | 78-93-3 | [6569](https://pubchem.ncbi.nlm.nih.gov/compound/6569) |
| Chloroform | 67-66-3 | [6212](https://pubchem.ncbi.nlm.nih.gov/compound/6212) |
| Acetone | 67-64-1 | [180](https://pubchem.ncbi.nlm.nih.gov/compound/180) |
| Glycerol | 56-81-5 | [753](https://pubchem.ncbi.nlm.nih.gov/compound/753) |
| MEG / ethylene glycol | 107-21-1 | [174](https://pubchem.ncbi.nlm.nih.gov/compound/174) |
| Hydrogen chloride (hydrochloric acid main ingredient) | 7647-01-0 | [313](https://pubchem.ncbi.nlm.nih.gov/compound/313) |
| Water / distilled water | 7732-18-5 | [962](https://pubchem.ncbi.nlm.nih.gov/compound/962) |
| Sodium hypochlorite (main ingredient) | 7681-52-9 | [23665760](https://pubchem.ncbi.nlm.nih.gov/compound/23665760) |
| Sodium hydroxide (main ingredient, including aqueous variants) | 1310-73-2 | [14798](https://pubchem.ncbi.nlm.nih.gov/compound/14798) |
| Methanol | 67-56-1 | [887](https://pubchem.ncbi.nlm.nih.gov/compound/887) |
| Toluene | 108-88-3 | [1140](https://pubchem.ncbi.nlm.nih.gov/compound/1140) |
| Phosphoric acid (main ingredient) | 7664-38-2 | [1004](https://pubchem.ncbi.nlm.nih.gov/compound/1004) |
| Sodium carbonate / soda ash | 497-19-8 | [10340](https://pubchem.ncbi.nlm.nih.gov/compound/10340) |
| Potassium hydroxide / KOH (main ingredient) | 1310-58-3 | [14797](https://pubchem.ncbi.nlm.nih.gov/compound/14797) |
| Citric acid, anhydrous form | 77-92-9 | [311](https://pubchem.ncbi.nlm.nih.gov/compound/311) |
| Citric acid monohydrate form | 5949-29-1 | [22230](https://pubchem.ncbi.nlm.nih.gov/compound/22230) |
| Oxalic acid hydrate (`수산(함수)` in the catalog; dihydrate identity confirmed by the user) | 6153-56-6 | [61373](https://pubchem.ncbi.nlm.nih.gov/compound/61373) |
| Silver nitrate (2% AgNO3 solution main ingredient) | 7761-88-8 | [24470](https://pubchem.ncbi.nlm.nih.gov/compound/24470) |
| Potassium permanganate / KMnO4 | 7722-64-7 | [516875](https://pubchem.ncbi.nlm.nih.gov/compound/516875) |
| Nitric acid (20% solution main ingredient) | 7697-37-2 | [944](https://pubchem.ncbi.nlm.nih.gov/compound/944) |

For mixtures and solutions, the page explicitly says **main ingredient CAS**, rather than assigning that identifier to the complete solution. Commercial codes, unconfirmed hydrate/salt forms, and formulations remain unnumbered until the exact supplied product is confirmed against a manufacturer document or container label. The citric acid catalog card lists the anhydrous and monohydrate alternatives, not a confirmed stocked form. The oxalic-acid hydrate mapping uses the user's confirmation of the supplied form and the [PubChem record](https://pubchem.ncbi.nlm.nih.gov/compound/6153-56-6); the site does not assert a manufacturer or grade. Other unresolved examples: MC, BDG, 141B, DINP, HC-2750, ammonia solution, EA, DOP, BC, YK-D40, NEO-T, xylene, TCS products, Starclon, METABISULPHITE, EDTA, sodium thiosulfate, CL, detergents and thinners. Laboratory tools and other articles are not assigned chemical CAS numbers.

## Supplier-neutral chemical detail pages

The sodium hydroxide, citric acid, and potassium hydroxide pages give verified substance identities and general appearance/use information only. They do not claim a manufacturer, exact grade, purity, packaging, inventory, batch, or delivery specification. Sodium hydroxide (caustic soda) and potassium hydroxide are different substances, with distinct CAS numbers; caustic soda and sodium hydroxide share one detail page. For citric acid, the anhydrous and monohydrate CAS numbers are presented as alternatives pending confirmation of the supplied hydration form.

Both Korean and English detail pages directly link to the corresponding [PubChem sodium hydroxide](https://pubchem.ncbi.nlm.nih.gov/compound/Sodium-Hydroxide), [PubChem potassium hydroxide](https://pubchem.ncbi.nlm.nih.gov/compound/Potassium-Hydroxide), [PubChem citric acid](https://pubchem.ncbi.nlm.nih.gov/compound/Citric-Acid), and [PubChem citric acid monohydrate](https://pubchem.ncbi.nlm.nih.gov/compound/Citric-acid-monohydrate) records. A previous Korean link to KOSHA led only to a generic search form requiring another manual search, so it was removed at the user's request. These links identify general substances, not the supplied product or its MSDS; the actual supplied-product MSDS remains request-only.

The two generated solid-state photographs are explicitly labeled as illustrative, not as pictures of supplied stock. One neutral alkali-flake illustration is shared by the sodium hydroxide and potassium hydroxide pages; the citric acid page uses the white-crystal illustration. No supplier identity or supplier-owned MSDS is published on these pages. MSDS requests remain subject to actual supplied-product confirmation.

## Laboratory reagent detail pages

The distilled-water and methanol reagent pages group the five catalog entries under their substance identities. The public detail-page references now prioritize the [Duksan Water 4L product record](https://duksan.kr/products/popup_1.php?item_code=2620) and [Duksan methanol catalog](https://duksan.kr/products/prd_search.php?keyword=Methyl+Alcohol), which show CAS 7732-18-5 and 67-56-1 respectively. Product codes and grades in Duksan's catalog have **not** been matched to Hyundai Chemical's short catalog names; no purity, stock, price or product-specific MSDS is asserted. The pages link each entry separately to quote and MSDS requests.

The methanol page uses Duksan's [official packaging gallery](https://duksan.kr/page/04/package_image.php) photograph of a **different, explicitly identified** LC-MS grade 4L methanol example (product no. 3041). Its caption states that it is not identified as either listed Duksan methanol item. The original 3840×5760 JPEG was resized and encoded to WebP without changing the photographed label. The official gallery did not provide a verified image for the listed Duksan Water 4L product, so the water page has no product photograph. Material CAS data remain tracked in `data/cas-catalog.json`; PubChem links in the earlier verification table are retained as independent identity checks, not as the public supplier reference for these pages.

## TRILITE SM210

Source: [Samyang's official library](https://www.samyangtrilite.com/kr/support/library), Korean MSDS `KR_MSDS_TRILITE SM210.pdf`, management number `AA04566-0000000007`, revision 4.0 dated 2023-02-10; official [manufacturer-hosted file](https://syapi.samyang.com/apis/kr/downloadFileNolog?parent_table=trilitelibrary&parent_lang=KR&parent_idx=10271). Section 3 spans pages 1–2:

| MSDS ingredient | CAS No. |
| --- | --- |
| Sulfonated cation exchange resin component | 69011-20-7 |
| Quaternized hydroxide anion exchange resin component | 69011-18-3 |
| Water | 7732-18-5 |

SM210 is labeled as a mixture in Section 1. Its component CAS numbers are retained here as source-verification notes only; they are not displayed in the public catalog or detail page, included in search metadata, or emitted as Product structured data. The MSDS remains request-only on this distributor website; the PDF is used as an internal verification source and is not copied into the public site.
