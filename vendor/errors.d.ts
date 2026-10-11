export type BBModelWarningCode = "UNSUPPORTED_ELEMENT" | "MISSING_ELEMENT" | "MISSING_GROUP" | "MISSING_TEXTURE" | "TEXTURE_LOAD_FAILED" | "INVALID_FACE" | "INVALID_KEYFRAME" | "MOLANG_FALLBACK" | "NEWER_FORMAT";
export interface BBModelWarning {
    code: BBModelWarningCode;
    message: string;
    path?: string;
}
export declare class BBModelError extends Error {
    readonly path?: string;
    constructor(message: string, path?: string, options?: ErrorOptions);
}
//# sourceMappingURL=errors.d.ts.map