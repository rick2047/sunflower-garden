export class BBModelError extends Error {
    path;
    constructor(message, path, options) {
        super(message, options);
        this.name = "BBModelError";
        if (path !== undefined)
            this.path = path;
    }
}
//# sourceMappingURL=errors.js.map