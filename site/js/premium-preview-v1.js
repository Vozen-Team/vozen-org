/* Accessible selection feedback for the local Premium proposal. */
document.querySelectorAll('.page-premium .bill-toggle, .page-premium .seat-toggle').forEach(group => {
  group.addEventListener('click', event => {
    const selected = event.target.closest('button');
    if (!selected || !group.contains(selected)) return;
    group.querySelectorAll('button').forEach(button => {
      button.setAttribute('aria-pressed', String(button === selected));
    });
    if (selected.dataset.bill) {
      document.getElementById('billingNote').textContent = selected.dataset.bill === 'year'
        ? 'Showing full yearly totals.'
        : 'Showing monthly prices.';
    }
  });
});
