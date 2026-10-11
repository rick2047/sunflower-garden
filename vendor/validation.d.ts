import type { BBModelDocument } from "./types.js";
export declare function isRecord(value: unknown): value is Record<string, unknown>;
export declare function parseBBModelDocument(input: string | ArrayBuffer | unknown): BBModelDocument;
export declare function compareFormatVersion(version: string, target: string): number;
//# sourceMappingURL=validation.d.ts.map