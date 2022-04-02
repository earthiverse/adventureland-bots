# Optimizing Attack 2

This will be the second video I make about Adventure Land.

## YouTube

You will be able to watch the video on YouTube when I finish making it. I will update this README with the link after I finish making, and uploading the video.

## Scripts

### 1_base.js

This has the logic for moving, healing, and looting. We load this code in every script to reduce the amount of variables.

### 2_default.js

In this script, we run three characters using the `6_reduce_cooldown.js` code from the previous video.

### 3_can_kill.js

In this script, we create an alternative to `get_nearest_monster` and create an entity ignore list that we share between our characters.

### 4_energize.js

In this script, we take advantage of the mage's ability to `energize` for a short period of increased attack speed.

### 5_cburst.js

In this script, we take advantage of the mage's ability to `cburst` to help use up our mana.

### 6_5shot.js

In this script, we swap out one of our mages for a ranger and take advantage of the ranger's ability to `3shot` and `5shot` multiple targets.
