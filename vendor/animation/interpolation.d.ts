import { Euler, Quaternion } from "three";
import type { BBModelWarning } from "../errors.js";
import type { ResolvedBBModelLoaderOptions } from "../options.js";
import type { BBAnimation, BBAnimator, BBKeyframe, BBTransformChannel, BBVector3 } from "../types.js";
interface SampleContext {
    animation: BBAnimation;
    animatorID: string;
    animator: BBAnimator;
    channel: BBTransformChannel;
    formatVersion: string;
    options: ResolvedBBModelLoaderOptions;
    warnings: BBModelWarning[];
    warnedExpressions: Set<string>;
    sampleTime: number;
}
export declare function sampleTransformChannel(keyframes: BBKeyframe[], time: number, context: SampleContext): BBVector3;
export declare function sampleQuaternionRotation(keyframes: BBKeyframe[], time: number, rest: Euler, context: SampleContext): Quaternion;
export declare function createSampleContext(animation: BBAnimation, animatorID: string, animator: BBAnimator, channel: BBTransformChannel, formatVersion: string, options: ResolvedBBModelLoaderOptions, warnings: BBModelWarning[], warnedExpressions: Set<string>): SampleContext;
export {};
//# sourceMappingURL=interpolation.d.ts.map