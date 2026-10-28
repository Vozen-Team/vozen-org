// Synthetic fixtures only; no reminders are scheduled and no Discord messages are sent.
process.env.FEATURE_DEMO_FEATURE = 'reminders';
await import('./helper-suggestions-demo-regression.mjs');
