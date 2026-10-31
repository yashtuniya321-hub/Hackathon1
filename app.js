const toast = document.querySelector('#toast');
document.querySelector('#newSubscription').addEventListener('click', () => {
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
});
toast.querySelector('button').addEventListener('click', () => toast.classList.remove('show'));
document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', () => {
  document.querySelector('.nav-item.active')?.classList.remove('active');
  item.classList.add('active');
}));
