import { FileLoader, Loader, LoaderUtils, } from "three";
import { BBModel } from "./BBModel.js";
import { BBModelParser } from "./BBModelParser.js";
import { resolveOptions } from "./options.js";
import { parseBBModelDocument } from "./validation.js";
export class BBModelLoader extends Loader {
    options;
    constructor(manager, options = {}) {
        super(manager);
        this.options = options;
    }
    setOptions(options) {
        this.options = options;
        return this;
    }
    load(url, onLoad, onProgress, onError) {
        const basePath = this.resourcePath || LoaderUtils.extractUrlBase(`${this.path}${url}`);
        const fileLoader = new FileLoader(this.manager);
        fileLoader.setPath(this.path);
        fileLoader.setRequestHeader(this.requestHeader);
        fileLoader.setWithCredentials(this.withCredentials);
        fileLoader.setResponseType("text");
        fileLoader.load(url, (data) => {
            void this.parseAsync(data, basePath).then(onLoad).catch((error) => onError?.(error));
        }, onProgress, onError);
    }
    parse(data, path, onLoad, onError) {
        void this.parseAsync(data, path).then(onLoad).catch((error) => onError?.(error));
    }
    async parseAsync(data, path = "") {
        const document = parseBBModelDocument(data);
        const parser = new BBModelParser(this.manager, resolveOptions(this.options));
        return parser.parse(document, path);
    }
}
//# sourceMappingURL=BBModelLoader.js.map