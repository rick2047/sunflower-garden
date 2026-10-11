import { AnimationClip, Object3D } from "three";
import type { BBModelWarning } from "../errors.js";
import type { ResolvedBBModelLoaderOptions } from "../options.js";
import type { BBAnimation, BBAnimator, BBEffectChannel, BBKeyframe, BBModelDocument } from "../types.js";
export interface BBModelEffect {
    animation: BBAnimation;
    animator: BBAnimator;
    keyframe: BBKeyframe;
    channel: BBEffectChannel | string;
    time: number;
}
export interface BBAnimationBuildResult {
    clips: AnimationClip[];
    effects: Map<string, BBModelEffect[]>;
}
export declare function buildAnimationClips(document: BBModelDocument, targets: ReadonlyMap<string, Object3D>, options: ResolvedBBModelLoaderOptions, warnings: BBModelWarning[]): BBAnimationBuildResult;
//# sourceMappingURL=tracks.d.ts.map