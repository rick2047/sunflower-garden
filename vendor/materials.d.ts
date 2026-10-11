import { Material } from "three";
import type { ResolvedBBModelLoaderOptions } from "./options.js";
import { type BBLoadedTextures } from "./textures.js";
import type { BBCubeFace, BBElementBase, BBMeshFace, BBModelDocument, BBTextureReference } from "./types.js";
export interface BBMaterialRequest {
    element: BBElementBase;
    face: BBCubeFace | BBMeshFace;
    textureReference: BBTextureReference | undefined;
    tint: number;
}
export declare class BBMaterialRegistry {
    private readonly document;
    private readonly textures;
    private readonly options;
    readonly materials: Material[];
    private readonly indices;
    constructor(document: BBModelDocument, textures: BBLoadedTextures, options: ResolvedBBModelLoaderOptions);
    get(request: BBMaterialRequest): number;
    private createDefault;
    private getTextureGroup;
}
//# sourceMappingURL=materials.d.ts.map