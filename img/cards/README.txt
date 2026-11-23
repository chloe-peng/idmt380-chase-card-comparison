Card images (optional)

Name each image after the card's id, for example:
  freedom-rise.png  freedom-unlimited.png  freedom-flex.png
  sapphire-preferred.png  sapphire-reserve.png  slate.png

Then add "image": "img/cards/<card-id>.png" to that card in data/cards.json
and run:  node tools/build-data.js
Any card without an image (or with a broken one) uses the CSS card art.
Best size: landscape, 1.586:1 (e.g. 856 x 540).
