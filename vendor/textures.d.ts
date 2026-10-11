import { Texture, type LoadingManager } from "three";
import type { BBModelWarning } from "./errors.js";
import type { ResolvedBBModelLoaderOptions } from "./options.js";
import type { BBModelDocument, BBTextureData, BBTextureReference } from "./types.js";
export interface BBLoadedTextures {
    ordered: Texture[];
    byUUID: Map<string, Texture>;
    dataByUUID: Map<string, BBTextureData>;
}
export declare function loadBBModelTextures(document: BBModelDocument, basePath: string, manager: LoadingManager, options: ResolvedBBModelLoaderOptions, warnings: BBModelWarning[]): Promise<BBLoadedTextures>;
export declare function resolveTextureData(document: BBModelDocument, reference: BBTextureReference | undefined): BBTextureData | null;
export declare function resolveTexture(document: BBModelDocument, loaded: BBLoadedTextures, reference: BBTextureReference | undefined): Texture | null;
//# sourceMappingURL=textures.d.ts.map