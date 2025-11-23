# Directory Layout & UX Notes

This document summarizes the current UI structure of the main directory screens and highlights UX inconsistencies to address in future phases.

## Pets List (`/pets`)

* **Structure**
  * Page-level title (“Pets”)
  * Action buttons (e.g., “New Pet”)
  * Search + filters (status, species, etc.) inline at top
  * Main content: table/grid of pets with columns (Name, Owner, Breed, Status, etc.)
  * Secondary panels (e.g., selection summary) appear contextually
* **UX Observations**
  * Filters use a dense toolbar with minimal spacing; not aligned with Owner list styling
  * Empty and loading states are inconsistent with newer dashboards (often plain text or blank)
  * Table scroll is heavy on small screens; no quick “jump to owner” from each pet

## Owners List (`/owners`)

* **Structure**
  * Page-level title (“Owners”)
  * CTA: “Add Owner”
  * Search input and filter controls similar to Pets but stylized differently
  * Table layout with columns (Name, Email, Phone, Pets, etc.)
  * Secondary components (mass actions, bulk selection)
* **UX Observations**
  * Filter panel uses different spacing compared to Pets (some sections collapse)
  * Table row height and typographic scale differ from Pets list, creating a disjointed feel when switching tabs
  * Empty state is simply a blank table; no prominent messaging or CTA to add the first owner

## Pet Detail (`/pets/:petId`)

* **Structure**
  * Header with avatar, name, breed/species, owner summary
  * Tabs or sections for: Overview, Notes, Bookings, Activity, etc.
  * Actions: Edit, Check-in, New booking, etc.
* **UX Observations**
  * Some tabs still show placeholder copy or raw JSON debug snippets
  * Layout spacing around tab panels is inconsistent; some use wide gutters, others flush to edges
  * Related records (e.g., owner card) appear in different positions depending on data availability

## Owner Detail (`/owners/:ownerId`)

* **Structure**
  * Header with owner name, contact info, membership/plan tags
  * Tabs/sections: Overview, Pets, Notes, Billing, Activity, etc.
  * Associated pets listed in a grid or table under dedicated sections
* **UX Observations**
  * Layout structure is similar to Pet Detail but uses different typographic hierarchy
  * Associated Pets table lacks quick actions (e.g., jump to pet detail) in some states
  * Activity stream styling diverges from other parts of the app; lacks consistent empty state

## Unified Pet + People View (`/pets-people`)

* **Structure**
  * Single page combining both pets and owners in a unified directory
  * Search allows toggling between pets / owners via filters or tabs
  * Uses custom cards instead of tables
* **UX Observations**
  * This screen reimplements filtering/search logic separately from `/pets` and `/owners`
  * Card layout is visually distinct (rounded cards, avatars) but lacks the same bulk actions available in the dedicated lists
  * Empty/loading states are minimal and don’t match the cards’ design language

## Customer Detail (`/customers/:ownerId`)

* **Structure**
  * CRM-style detail layout: hero card with contact info, stats cards, tabs for interactions
* **UX Observations**
  * Overlaps heavily with `/owners/:ownerId` but uses different component library
  * Lacks visual cohesion with the standard owner detail screen; the two experiences feel disconnected

## General UX Issues

* Inconsistent spacing and typography between Pets vs Owners lists.
* Loading/empty states vary widely (some tables show blank space, others show raw text).
* Action buttons (e.g., “New Pet”, “Add Owner”) are not aligned or consistently placed across screens.
* No shared “directory layout” component—each page reimplements headers, filters, and tables independently.

> These observations will guide future phases (C1:2+) where we plan to standardize layouts and share components. No code was changed while producing this document.

