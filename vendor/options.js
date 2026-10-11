export function resolveOptions(options = {}) {
    const resolved = {
        unitScale: options.unitScale ?? 1 / 16,
        eulerOrder: options.eulerOrder ?? "ZYX",
        loadTextures: options.loadTextures ?? true,
        animationSampleRate: options.animationSampleRate ?? "snapping",
        maxAnimationSampleRate: options.maxAnimationSampleRate ?? 120,
        strict: options.strict ?? false,
    };
    if (options.expressionEvaluator !== undefined)
        resolved.expressionEvaluator = options.expressionEvaluator;
    if (options.textureFactory !== undefined)
        resolved.textureFactory = options.textureFactory;
    if (options.materialFactory !== undefined)
        resolved.materialFactory = options.materialFactory;
    return resolved;
}
//# sourceMappingURL=options.js.map