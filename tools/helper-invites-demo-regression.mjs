// Synthetic API fixtures only; never creates real Discord invites or joins.
process.env.FEATURE_DEMO_FEATURE = 'invites';
await import('./helper-suggestions-demo-regression.mjs');
