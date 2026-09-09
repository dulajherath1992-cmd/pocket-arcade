# Tiny Tank Battle

Playable five-wave mission. `TankWorld.ts` owns the simulation and collision
rules without Phaser dependencies. `TinyTankScene.ts` owns rendering, input,
feedback, pause/result screens, and banking the run once.

Arrow keys/WASD move and aim; Space fires. Touch players hold a direction and
FIRE with separate fingers. Escape or the pause button pauses. Ending a run
from pause banks the current score and collected coins, without a victory.

Enemy kills earn 100 points; clearing a wave adds 100 × wave. Collected coins
add 25 points each. Repair pickups restore one HP (maximum three); rapid-fire
pickups last eight seconds. Only enemy bullets damage the base. Steel cannot
be destroyed; bricks take two hits (base-side barricades take three).

There are four to eight enemies per wave, at most three active together. The
last two waves have armored enemies. Bullets use a fixed pool of 64 objects;
explosion particles are capped at 80. AI deliberately stays simple for this
testable first game; device performance and difficulty need playtesting.
