// Synthetic API fixtures only; no real balances or Discord messages.
process.env.FEATURE_DEMO_FEATURE = 'economy';
await import('./helper-suggestions-demo-regression.mjs');
