# TRILITE SM210 content verification

Reviewed: 2026-09-30. The user confirmed that SM210 is the model they sell. Hyundai Chemical is the seller/supplier, not the manufacturer. No authorized-dealer relationship, stock level, price, pack size or lead time has been asserted.

## Primary sources

- [Samyang TRILITE SM210 technical data, 9 pages](https://www.samyangtrilite.com/filesview/%5BTR%5D%20Techinfo%20TRILITE%20SM210.pdf?folder=%2Fupload%2Flibrary%2F&storedfile=543020a1b5384137b220d359164c2527.pdf)
- [Samyang TRILITE application overview](https://www.samyangtrilite.com/kr/ier/application/overview)
- [Samyang TRILITE mixed bed resin product family](https://www.samyangtrilite.com/kr/ier/product-types/mixed-bed-resins)
- [Samyang official library](https://www.samyangtrilite.com/kr/support/library), Korean SM210 MSDS, management no. AA04566-0000000007, revision 4.0 (2023-02-10). Section 3 gives constituent CAS numbers 69011-20-7, 69011-18-3 and 7732-18-5. See [CAS source register](cas-catalog-sources.md).

The official PDF was downloaded for private verification in ignored `test-results/trilite-sources/`; it is not republished or presented as an MSDS. The public page links to the manufacturer-hosted technical data. No manufacturer photography or logos were copied or generated.

## Facts used

| Page | Data | Website treatment |
| --- | --- | --- |
| 1–2 | H-form strong-acid cation resin SCR-BH and OH-form strong-base anion resin SAR12OH | Product summary and composition. The first-page prose incorrectly says H-form for the anion; the mixture/component tables consistently show OH-form. |
| 3 | Cation:anion volume ratio 45:55 | Shown as volume, not mass or exchange-capacity ratio. |
| 1 | Particle size 0.3–1.2 mm, moisture 52–60%, uniformity coefficient ≤1.6, temperature ≤60 °C, pH 0–14 | Reference specification table; no site-specific performance guarantee. |
| 1, 3 | Pure water production, laboratories, wire-cutting/deionizing cartridges without regeneration equipment | Short paraphrased application descriptions. Suitability depends on feed water and system conditions. |

## Deliberate omissions / limits

- Do not present SM210 as universally suitable for semiconductor ultrapure-water systems; the official selection chart lists separate UPRM grades. The chart separately recommends SM300 for post-RO duties. The page asks visitors to verify the appropriate grade for these applications.
- Resistivity, capacity and treated-volume values have test-condition footnotes and are not presented as unconditional selling promises. The source's first-page feed-water footnote differs from its page 3/7 examples, so those conditional performance numbers are omitted.
- No inferred package volume (including 25 L), certification, delivery promise or replenishment interval.
- The public manufacturer name is specifically within the user's requested Samyang product scope. Supply-chain prices and internal supplier records remain private.
- MSDS remains a product-prefilled request form. This is not legal advice about SDS applicability.
- Product/Breadcrumb JSON-LD contains visible facts only; no invented Offer, price, review, rating or GTIN. Without a qualifying offer/review this is not a promise of Google product rich-result eligibility.

## Checks

- `node scripts/build-locales.mjs --check`
- `node tests/product-detail.test.cjs`
- Existing product action, API, mobile logo, site browser and mobile layout tests (new page added to layout/logo coverage).
- Local desktop/mobile screenshots reviewed. Form tests are intercepted or blocked; no live emails.
