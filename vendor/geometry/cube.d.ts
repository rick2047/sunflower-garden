import type { BBCubeElement, BBCubeFaceDirection } from "../types.js";
import type { BBElementGeometry, ResolveUVSize } from "./types.js";
export declare const CUBE_FACE_ORDER: readonly BBCubeFaceDirection[];
export declare function cubeRescale(element: BBCubeElement): [number, number, number];
export declare function buildCubeGeometry(element: BBCubeElement, unitScale: number, resolveUVSize: ResolveUVSize): BBElementGeometry;
//# sourceMappingURL=cube.d.ts.map