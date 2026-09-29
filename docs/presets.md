# Presets

Agency OS is preset-driven. A **preset** bundles the vocabulary, wizard steps, dashboard columns, document library, and workflow set that make sense for a specific kind of business.

The active preset is picked with `AGENCY_OS_PRESET` (defaults to `default`).

## Built-in presets

### `default` — any small service business
`lib/presets/default.ts`

- 3-step wizard: Contact · Service · Consent
- No pre-loaded document library (agencies attach files ad-hoc)
- Invoicing enabled; bank-offer & appraiser panels hidden
- Uses the generic lifecycle: `invited → onboarding → intake-submitted → documents-in-progress → in-service → invoice-sent → paid / overdue → completed`

### `mortgage-advisor` — Israeli mortgage advisors
`lib/presets/mortgage-advisor.ts`

Preserves the original KeyPoint flow.

- 5-step wizard: Personal · Case & income · Property · Consent · Documents
- Full mortgage document library (ID, payslips, land registry, CPA confirmation, etc.)
- Case types (`purchase-single-dwelling`, `refinance`, `renovation`, …) and borrower profiles
- Bank-offer panel on the case detail page
- Appraiser dispatch + reminder workflows
- Extra lifecycle stages: `approved → portal-activated → secretary-review → waiting-appraiser → appraisal-received → ready-for-bank → bank-negotiation → recommendation-prepared → completed`

## Selecting a preset

```bash
# .env.local
AGENCY_OS_PRESET=default            # or mortgage-advisor
```

Change the value and restart `npm run dev`. The landing page, wizard, dashboard, and case-detail render according to the active preset.

## Preset shape

`lib/presets/types.ts`:

```ts
interface Preset {
  id: PresetId;
  name: string;                 // English
  nameHe: string;               // Hebrew
  tagline: string;
  taglineHe: string;
  wizardSteps: WizardStep[];    // The public /intake wizard
  documentLibrary?: DocumentRequirement[];
  features: {
    bankOffers: boolean;        // Show the bank-offer panel + `POST /cases/:id/offers`
    appraiser: boolean;         // Include appraiser workflows + activity types
    mortgageColumns: boolean;   // Show case-type & borrower-profile columns
    invoicing: boolean;         // Show the invoice tab + billing actions
  };
  mortgage?: {                  // Optional mortgage-specific enums (only used by mortgage preset)
    caseTypes: CaseType[];
    borrowerProfiles: BorrowerProfile[];
  };
}
```

## Adding your own preset

1. Create `lib/presets/<your-slug>.ts` exporting a `Preset` object.
2. Register it in `lib/presets/index.ts`:

   ```ts
   const registry: Record<PresetId, Preset> = {
     default: defaultPreset,
     'mortgage-advisor': mortgageAdvisorPreset,
     'your-slug': yourPreset,
   };
   ```

3. Add your slug to the `PresetId` union in `lib/presets/types.ts`.
4. Set `AGENCY_OS_PRESET=your-slug`.

Wizard fields support these kinds:

- `text`, `textarea`, `email`, `tel`, `date`, `number`
- `select` (single choice from `options`)
- `multiselect` (chip-style multi-choice)
- `checkbox` (boolean)

Any field with `required: true` blocks the "Next" button until answered.

## Feature gating in code

To check the active preset from a Server Component or API route:

```ts
import { getActivePreset, hasFeature } from '@/lib/presets';

const preset = getActivePreset();
if (preset.features.bankOffers) { /* … */ }
// or:
if (hasFeature('invoicing')) { /* … */ }
```

## n8n workflows per preset

`n8n/workflows/manifest.json` tags each workflow with its preset scope. `default`-scoped workflows apply to every tenant; `mortgage-advisor`-scoped workflows are only imported/activated when the mortgage preset is in use.

## What Phase 2 changes

Phase 2 moves this from a single-tenant env-var switch to per-tenant Supabase config: each agency picks its preset in the admin UI, and the active preset is read from the tenant row instead of `process.env`.
