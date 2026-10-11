import type { Texture } from "three";
import type { BBTextureData } from "../types.js";
export declare class BBTextureAnimator {
    private readonly animated;
    constructor(textures: ReadonlyMap<string, Texture>, textureData: readonly BBTextureData[]);
    get count(): number;
    update(deltaSeconds: number): void;
    private applyFrame;
}
//# sourceMappingURL=BBTextureAnimator.d.ts.map