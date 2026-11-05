// Standalone regression test: requires only Node.js, no browser or CDN.
import assert from 'node:assert/strict';
import { CharacterAnimator, updateEntityAnimation, AnimationState as S } from './src/player/characterAnimator.js';

const obj = () => ({ rotation: { x: 0, y: 0, z: 0 }, position: { x: 0, y: 0, z: 0 }, userData: {} });
const makeRig = () => ({ unit: obj(), head: obj(), armR: obj(), armL: obj(), cape: obj(), legs: [obj(), obj()], amp: .7, sw: 2.1 });
const rig = makeRig();
const P = { kind: 'p', x: 10, z: 10, hp: 90, fl: 0, at: 0, spd: 0, mesh: { userData: { r: rig } } };
const step = (dt = 1 / 60) => updateEntityAnimation(P, dt);
for (let i = 0; i < 90; i++) step();
assert.equal(P.animator.state, S.IDLE);
assert.ok(Math.abs(rig.armR.rotation.x) < 1);

let gaitMax = 0;
for (let i = 0; i < 50; i++) { P.z -= .065; P.spd = 3.9; step(); gaitMax = Math.max(gaitMax, Math.abs(rig.legs[0].rotation.x)); }
assert.equal(P.animator.state, S.RUN);
assert.ok(gaitMax > .1, 'gait must visibly animate');

P.spd = 0;
for (let i = 0; i < 50; i++) step();
assert.equal(P.animator.state, S.IDLE);
assert.ok(Math.abs(rig.legs[0].rotation.x) < .05, 'legs return to rest');
assert.ok(Math.abs(rig.unit.rotation.x) < .02, 'body tilt returns to zero');

P.at = 1;
let attackFrames = 0, attackStateTransitions = 0, last = P.animator.state;
let attackMinArm = 0;
for (let i = 0; i < 45; i++) {
    step();
    if (P.animator.state === S.ATTACK) attackFrames++;
    if (P.animator.state === S.ATTACK && last !== S.ATTACK) attackStateTransitions++;
    last = P.animator.state;
    attackMinArm = Math.min(attackMinArm, rig.armR.rotation.x);
    P.at = Math.max(0, P.at - (1 / 60) / .35);
}
assert.equal(attackStateTransitions, 1, 'a single attack must not restart in a loop');
assert.ok(attackFrames >= 19 && attackFrames <= 23);
assert.ok(attackMinArm < -1, 'weapon must swing');
assert.equal(P.animator.state, S.IDLE);

P.fl = .18;
step();
assert.equal(P.animator.state, S.DAMAGE);
for (let i = 0; i < 30; i++) { P.fl = Math.max(0, P.fl - 1/60); step(); }
assert.equal(P.animator.state, S.IDLE);
assert.ok(Math.abs(rig.unit.rotation.z) < .05, 'recoil should not stick');

// Player class/armor change swaps the visible rig without holding an old UUID.
const replacedRig = makeRig();
P.mesh.userData.r = replacedRig;
step();
assert.strictEqual(P.animator.rig, replacedRig);

P.hp = 0;
for (let i = 0; i < 75; i++) step();
assert.equal(P.animator.state, S.DEATH);
assert.ok(replacedRig.unit.rotation.x > 1.2, 'death collapse completes and holds');
P.hp = 90;
for (let i = 0; i < 40; i++) step();
assert.equal(P.animator.state, S.IDLE);
assert.ok(Math.abs(replacedRig.unit.rotation.x) < .08, 'respawn restores upright pose');

// Enemy with no spd/vx registers path movement through position delta.
const ratRig = makeRig();
const rat = { kind: 'm', x: 3, z: 4, hp: 10, at: 0, fl: 0, mesh: { userData: { r: ratRig } } };
updateEntityAnimation(rat, 1/60);
for (let i = 0; i < 10; i++) { rat.x += .025; updateEntityAnimation(rat, 1/60); }
assert.equal(rat.animator.state, S.WALK);

console.log('PASS: idle, run, stop, attack once, damage, death, respawn, rig rebind, enemy movement');
