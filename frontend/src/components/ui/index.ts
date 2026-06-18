// Shared UI primitives for the Clinical Voice Instrument design system
// (corpus/wiki/sources-raw/design.md). Thin wrappers over Tailwind utilities so
// pages read cleanly and the clinical vocabulary stays consistent: monospace
// eyebrows, hairline cards, oxblood accent, soft 6px corners, flat-plane
// interactions. Barrel — import primitives from '../components/ui'.
export { cx } from './cx';
export { Eyebrow, Headline } from './typography';
export { Button, buttonClass, type Variant } from './Button';
export { Card, cardClass } from './Card';
export { Tag } from './Tag';
export { Notice } from './Notice';
export { FieldLabel, FIELD_CLASS } from './field';
