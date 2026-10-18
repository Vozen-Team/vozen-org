// Birthdays demonstration checks use synthetic API fixtures; no real birthdays are saved.
process.env.FEATURE_DEMO_FEATURE = 'birthdays';
await import('./helper-suggestions-demo-regression.mjs');
