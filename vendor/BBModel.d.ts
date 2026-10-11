import { AnimationAction, AnimationClip, AnimationMixer, Bone, Group, Material, Skeleton, SkinnedMesh, Texture } from "three";
import type { BBModelEffect } from "./animation/tracks.js";
import type { BBModelWarning } from "./errors.js";
import { BBTextureAnimator } from "./runtime/BBTextureAnimator.js";
import type { BBModelDocument } from "./types.js";
export interface BBModelInit {
    document: BBModelDocument;
    scene: Group;
    animations: AnimationClip[];
    skeleton: Skeleton;
    bones: Map<string, Bone>;
    elementBones: Map<string, Bone>;
    elements: Map<string, SkinnedMesh>;
    textures: Map<string, Texture>;
    materials: Material[];
    effects: Map<string, BBModelEffect[]>;
    warnings: BBModelWarning[];
}
export declare class BBModel {
    readonly document: BBModelDocument;
    readonly scene: Group;
    readonly animations: AnimationClip[];
    readonly skeleton: Skeleton;
    readonly bones: Map<string, Bone>;
    readonly elementBones: Map<string, Bone>;
    readonly elements: Map<string, SkinnedMesh>;
    readonly textures: Map<string, Texture>;
    readonly materials: Material[];
    readonly effects: Map<string, BBModelEffect[]>;
    readonly warnings: BBModelWarning[];
    readonly textureAnimator: BBTextureAnimator;
    constructor(init: BBModelInit);
    createMixer(): AnimationMixer;
    getAnimation(name: string): AnimationClip | undefined;
    createAction(mixer: AnimationMixer, animation: string | AnimationClip): AnimationAction;
    update(deltaSeconds: number): void;
    dispose(): void;
}
//# sourceMappingURL=BBModel.d.ts.map