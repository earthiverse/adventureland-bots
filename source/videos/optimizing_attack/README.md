# Optimizing Attack

This will be the the first video I will make about Adventure Land. I might consider making more depending on how well this video is received.

[comment]: <> (TODO: Change the tense of the previous sentence when I actually upload the video.)

## YouTube

The video is currently in production.

[comment]: <> (TODO: Post the link here when it is finished, and we upload it.)

## Scripts

### 1_base.js

This has the logic for moving, healing, and looting. We load this code in every script to reduce the amount of variables.

### 2_default.js

This script is essentially equal to what you get for attacking if you run the default code in Adventure Land.

### 3_while_true.js

**Warning: Running this script will probably crash the game**.

This script is to show why you can't just run `while(true) { /** attack logic */ }`.

### 4_10ms.js

This script is almost equal to what was before, except it utilizes async/await and loops every 10ms.

### 5_next_skill.js

This script reduces the loop to 1ms or the time of the next attack.

### 6_redue_cooldown.js

This script utilizes `reduce_cooldown(/** minimum ping */)` to compensate for ping.

### 7_multiple_attacks.js

This script sends multiple attacks to try to achieve the optimal ping reduction.
