import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three";
const edgeA = new Vector3();
const edgeB = new Vector3();
const faceNormal = new Vector3();
function calculateFaceNormal(element, face) {
    const [firstKey, secondKey, thirdKey] = face.vertices;
    const first = firstKey === undefined ? undefined : element.vertices[firstKey];
    const second = secondKey === undefined ? undefined : element.vertices[secondKey];
    const third = thirdKey === undefined ? undefined : element.vertices[thirdKey];
    if (first === undefined || second === undefined || third === undefined)
        return new Vector3(0, 1, 0);
    edgeA.fromArray(second).sub(new Vector3().fromArray(first));
    edgeB.fromArray(third).sub(new Vector3().fromArray(first));
    return faceNormal.crossVectors(edgeA, edgeB).normalize().clone();
}
export function buildMeshGeometry(element, unitScale, resolveUVSize) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    const faces = [];
    const smoothNormals = new Map();
    if (element.shading === "smooth") {
        for (const face of Object.values(element.faces)) {
            if (face.vertices.length < 3 || face.texture === null)
                continue;
            const normal = calculateFaceNormal(element, face);
            for (const key of face.vertices) {
                const accumulated = smoothNormals.get(key) ?? new Vector3();
                accumulated.add(normal);
                smoothNormals.set(key, accumulated);
            }
        }
        for (const normal of smoothNormals.values())
            normal.normalize();
    }
    for (const face of Object.values(element.faces)) {
        if (face.vertices.length < 3 || face.texture === null)
            continue;
        const validKeys = face.vertices.filter((key) => element.vertices[key] !== undefined);
        if (validKeys.length < 3)
            continue;
        const normal = calculateFaceNormal(element, face);
        const [uvWidth, uvHeight] = resolveUVSize(face.texture);
        const vertexStart = positions.length / 3;
        for (const key of validKeys) {
            const vertex = element.vertices[key];
            if (vertex === undefined)
                continue;
            positions.push(vertex[0] * unitScale, vertex[1] * unitScale, vertex[2] * unitScale);
            const vertexNormal = element.shading === "smooth" ? (smoothNormals.get(key) ?? normal) : normal;
            normals.push(vertexNormal.x, vertexNormal.y, vertexNormal.z);
            const uv = face.uv?.[key] ?? [0, 0];
            uvs.push(uv[0] / (uvWidth || 16), 1 - uv[1] / (uvHeight || 16));
        }
        const faceStart = indices.length;
        for (let vertex = 1; vertex < validKeys.length - 1; vertex += 1) {
            indices.push(vertexStart, vertexStart + vertex, vertexStart + vertex + 1);
        }
        const count = indices.length - faceStart;
        faces.push({
            start: faceStart,
            count,
            texture: face.texture,
            tint: -1,
            source: face,
        });
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
    geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    faces.forEach((face, materialIndex) => geometry.addGroup(face.start, face.count, materialIndex));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometry.userData.blockbenchElement = element;
    return { element, geometry, faces };
}
//# sourceMappingURL=mesh.js.map