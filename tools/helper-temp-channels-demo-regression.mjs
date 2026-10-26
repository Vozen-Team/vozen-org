// Synthetic API fixtures only; no real Discord channels.
process.env.FEATURE_DEMO_FEATURE = 'temp-channels';
await import('./helper-suggestions-demo-regression.mjs');
