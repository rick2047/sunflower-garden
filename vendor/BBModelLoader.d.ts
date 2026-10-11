import { Loader, type LoadingManager } from "three";
import { BBModel } from "./BBModel.js";
import type { BBModelLoaderOptions } from "./options.js";
export declare class BBModelLoader extends Loader<BBModel> {
    private options;
    constructor(manager?: LoadingManager, options?: BBModelLoaderOptions);
    setOptions(options: BBModelLoaderOptions): this;
    load(url: string, onLoad: (data: BBModel) => void, onProgress?: (event: ProgressEvent) => void, onError?: (error: unknown) => void): void;
    parse(data: string | ArrayBuffer | unknown, path: string, onLoad: (model: BBModel) => void, onError?: (error: unknown) => void): void;
    parseAsync(data: string | ArrayBuffer | unknown, path?: string): Promise<BBModel>;
}
//# sourceMappingURL=BBModelLoader.d.ts.map