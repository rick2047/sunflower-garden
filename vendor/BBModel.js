import { AnimationAction, AnimationClip, AnimationMixer, Bone, Group, LoopOnce, LoopRepeat, Material, Skeleton, SkinnedMesh, Texture, } from "three";
import { BBTextureAnimator } from "./runtime/BBTextureAnimator.js";
export class BBModel {
    document;
    scene;
    animations;
    skeleton;
    bones;
    elementBones;
    elements;
    textures;
    materials;
    effects;
    warnings;
    textureAnimator;
    constructor(init) {
        this.document = init.document;
        this.scene = init.scene;
        this.animations = init.animations;
        this.skeleton = init.skeleton;
        this.bones = init.bones;
        this.elementBones = init.elementBones;
        this.elements = init.elements;
        this.textures = init.textures;
        this.materials = init.materials;
        this.effects = init.effects;
        this.warnings = init.warnings;
        this.textureAnimator = new BBTextureAnimator(this.textures, this.document.textures);
    }
    createMixer() {
        return new AnimationMixer(this.scene);
    }
    getAnimation(name) {
        return AnimationClip.findByName(this.animations, name) ?? undefined;
    }
    createAction(mixer, animation) {
        const clip = typeof animation === "string" ? this.getAnimation(animation) : animation;
        if (clip === undefined)
            throw new Error(`Unknown Blockbench animation: ${String(animation)}`);
        const action = mixer.clipAction(clip);
        const source = clip.userData.blockbenchAnimation;
        const loop = isBBAnimation(source) ? source.loop : "once";
        if (loop === "loop")
            action.setLoop(LoopRepeat, Infinity);
        else
            action.setLoop(LoopOnce, 1);
        action.clampWhenFinished = loop === "hold";
        return action;
    }
    update(deltaSeconds) {
        this.textureAnimator.update(deltaSeconds);
    }
    dispose() {
        for (const element of this.elements.values())
            element.geometry.dispose();
        for (const material of this.materials)
            material.dispose();
        for (const texture of this.textures.values())
            texture.dispose();
    }
}
function isBBAnimation(value) {
    return typeof value === "object" && value !== null && "animators" in value && "length" in value;
}
//# sourceMappingURL=BBModel.js.map