import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

/** Optional integration example. This module is not installed in the game. */
export class HinariaMotionPlayer {
  static async load(url, parent) {
    const gltf = await new GLTFLoader().loadAsync(url);
    const player = new HinariaMotionPlayer(gltf);
    if (parent) parent.add(player.object);
    return player;
  }
  constructor(gltf) {
    this.gltf = gltf;
    this.object = new THREE.Group(); // Gameplay moves this wrapper.
    this.object.add(gltf.scene);
    this.mixer = new THREE.AnimationMixer(gltf.scene);
    this.clips = new Map(gltf.animations.map(c => [c.name, c]));
    this.current = null;
    this.name = null;
    this.returnToIdle = true;
    this.onFinished = event => {
      if (event.action === this.current && this.returnToIdle && this.name !== 'Death')
        this.play('Idle');
    };
    this.mixer.addEventListener('finished', this.onFinished);
    this.play('Idle', {fade: 0});
  }
  play(name, {fade = .12, loop = ['Idle','Walk','Run'].includes(name), returnToIdle = true, restart = false} = {}) {
    const aliases = {idle:'Idle',walk:'Walk',run:'Run',attack:'Attack',damage:'Hit',hit:'Hit',death:'Death',dodge:'Dodge',jump:'Jump',block:'Block'};
    name = aliases[name] || name;
    if (['Idle','Walk','Run'].includes(name)) loop = true;
    const clip = this.clips.get(name);
    if (!clip) throw new Error('Animation clip not found: ' + name);
    if (name === this.name && !restart) return this.current;
    const previous = this.current;
    const action = this.mixer.clipAction(clip);
    action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    action.clampWhenFinished = !loop;
    if (previous && previous !== action && fade > 0) {
      previous.fadeOut(fade);
      action.fadeIn(fade);
    } else if (previous && previous !== action) previous.stop();
    this.current = action;
    this.name = name;
    this.returnToIdle = returnToIdle;
    action.play();
    return action;
  }
  update(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0)
      throw new RangeError('deltaSeconds must be finite and nonnegative.');
    this.mixer.update(Math.min(deltaSeconds, .1));
  }
  dispose() {
    this.mixer.removeEventListener('finished', this.onFinished);
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.gltf.scene);
    this.object.removeFromParent();
    const geometries = new Set(), materials = new Set();
    this.gltf.scene.traverse(o => {
      if (o.geometry) geometries.add(o.geometry);
      if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m);
    });
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
  }
}
