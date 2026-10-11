import { type LoadingManager } from "three";
import { BBModel } from "./BBModel.js";
import type { ResolvedBBModelLoaderOptions } from "./options.js";
import { type BBModelDocument } from "./types.js";
export declare class BBModelParser {
    private readonly manager;
    private readonly options;
    constructor(manager: LoadingManager, options: ResolvedBBModelLoaderOptions);
    parse(document: BBModelDocument, basePath: string): Promise<BBModel>;
    private buildHierarchy;
    private configureBone;
    private createElementBone;
    private compatibleCube;
    private warn;
}
//# sourceMappingURL=BBModelParser.d.ts.map