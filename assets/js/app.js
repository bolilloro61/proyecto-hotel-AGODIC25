const carousel = document.getElementById('carousel');
let scrollAmount = 0;

function autoScroll() {
  if (scrollAmount <= carousel.scrollWidth - carousel.clientWidth) {
    carousel.scrollBy({ left: 1, behavior: 'smooth' });
    scrollAmount++;
  } else {
    carousel.scrollTo({ left: 0, behavior: 'smooth' });
    scrollAmount = 0;
  }
}

setInterval(autoScroll, 20);
