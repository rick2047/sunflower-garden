import { Group } from "three";
export function applyBBDisplayTransform(object, transform, unitScale = 1 / 16, eulerOrder = "XYZ") {
    const translation = transform.translation ?? [0, 0, 0];
    const rotation = transform.rotation ?? [0, 0, 0];
    const scale = transform.scale ?? [1, 1, 1];
    object.position.set(translation[0] * unitScale, translation[1] * unitScale, translation[2] * unitScale);
    object.rotation.set(rotation[0] * Math.PI / 180, rotation[1] * Math.PI / 180, rotation[2] * Math.PI / 180, eulerOrder);
    object.scale.fromArray(scale);
    return object;
}
export function createBBDisplayGroup(document, slot, unitScale = 1 / 16, eulerOrder = "XYZ") {
    const transform = document.display?.[slot];
    if (transform === undefined)
        return null;
    const group = new Group();
    group.name = `display.${slot}`;
    group.userData.blockbenchDisplaySlot = slot;
    return applyBBDisplayTransform(group, transform, unitScale, eulerOrder);
}
//# sourceMappingURL=display.js.map