export function isCubeElement(element) {
    return (element.type === "cube" &&
        Array.isArray(element.from) &&
        Array.isArray(element.to) &&
        typeof element.faces === "object" &&
        element.faces !== null);
}
export function isMeshElement(element) {
    return (element.type === "mesh" &&
        typeof element.vertices === "object" &&
        element.vertices !== null &&
        typeof element.faces === "object" &&
        element.faces !== null);
}
//# sourceMappingURL=types.js.map