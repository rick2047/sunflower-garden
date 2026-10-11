import { Group, type EulerOrder, type Object3D } from "three";
import type { BBDisplayTransform, BBModelDocument } from "./types.js";
export declare function applyBBDisplayTransform<T extends Object3D>(object: T, transform: BBDisplayTransform, unitScale?: number, eulerOrder?: EulerOrder): T;
export declare function createBBDisplayGroup(document: BBModelDocument, slot: string, unitScale?: number, eulerOrder?: EulerOrder): Group | null;
//# sourceMappingURL=display.d.ts.map