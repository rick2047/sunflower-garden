import { Euler, Quaternion } from "three";
import { compareFormatVersion } from "../validation.js";
const AXES = ["x", "y", "z"];
function compatibilitySign(formatVersion, channel, axis) {
    if (compareFormatVersion(formatVersion, "5.0") >= 0)
        return 1;
    if ((channel === "position" || channel === "rotation") && axis === 0)
        return -1;
    if (channel === "rotation" && axis === 1)
        return -1;
    return 1;
}
function evaluate(value, axis, context) {
    const numeric = typeof value === "number" ? value : Number(value);
    const sign = compatibilitySign(context.formatVersion, context.channel, axis);
    if (Number.isFinite(numeric))
        return numeric * sign;
    if ((typeof value === "string" || typeof value === "number") && context.options.expressionEvaluator !== undefined) {
        return context.options.expressionEvaluator(value, {
            animation: context.animation.name,
            animator: context.animatorID,
            channel: context.channel,
            axis: AXES[axis],
            time: context.sampleTime,
        }) * sign;
    }
    const warningKey = `${context.animation.uuid}:${context.animatorID}:${context.channel}:${AXES[axis]}`;
    if (!context.warnedExpressions.has(warningKey)) {
        context.warnedExpressions.add(warningKey);
        context.warnings.push({
            code: "MOLANG_FALLBACK",
            message: `Molang value in ${context.animation.name}/${context.animator.name}/${context.channel}.${AXES[axis]} evaluated to 0. Supply expressionEvaluator to resolve it.`,
        });
    }
    return 0;
}
function dataPoint(keyframe, index) {
    return keyframe.data_points[index] ?? keyframe.data_points[0] ?? {};
}
function keyframeValue(keyframe, pointIndex, axis, context) {
    return evaluate(dataPoint(keyframe, pointIndex)[AXES[axis]], axis, context);
}
function segmentValue(keyframe, side, axis, context) {
    const index = side === "before" ? Math.max(0, keyframe.data_points.length - 1) : 0;
    return keyframeValue(keyframe, index, axis, context);
}
function catmullRom(p0, p1, p2, p3, t) {
    const v0 = (p2 - p0) * 0.5;
    const v1 = (p3 - p1) * 0.5;
    const t2 = t * t;
    const t3 = t * t2;
    return (2 * p1 - 2 * p2 + v0 + v1) * t3
        + (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2
        + v0 * t
        + p1;
}
function cubic(a, b, c, d, t) {
    const inverse = 1 - t;
    return inverse ** 3 * a + 3 * inverse ** 2 * t * b + 3 * inverse * t ** 2 * c + t ** 3 * d;
}
function solveBezierTime(x1, x2, target) {
    let lower = 0;
    let upper = 1;
    let value = target;
    for (let iteration = 0; iteration < 18; iteration += 1) {
        value = (lower + upper) / 2;
        const x = cubic(0, x1, x2, 1, value);
        if (x < target)
            lower = value;
        else
            upper = value;
    }
    return value;
}
function bezier(before, after, axis, alpha, context) {
    const start = segmentValue(before, "before", axis, context);
    const end = segmentValue(after, "after", axis, context);
    const gap = Math.max(after.time - before.time, Number.EPSILON);
    const rightTime = Math.min(gap, Math.max(0, before.bezier_right_time?.[axis] ?? 0));
    const leftTime = Math.min(0, Math.max(-gap, after.bezier_left_time?.[axis] ?? 0));
    const sign = compatibilitySign(context.formatVersion, context.channel, axis);
    const rightValue = (before.bezier_right_value?.[axis] ?? 0) * sign;
    const leftValue = (after.bezier_left_value?.[axis] ?? 0) * sign;
    const curveT = solveBezierTime(rightTime / gap, 1 + leftTime / gap, alpha);
    return cubic(start, start + rightValue, end + leftValue, end, curveT);
}
function findSegment(keyframes, time) {
    let before;
    let after;
    let beforeIndex = -1;
    keyframes.forEach((keyframe, index) => {
        if (keyframe.time <= time && (before === undefined || keyframe.time > before.time)) {
            before = keyframe;
            beforeIndex = index;
        }
        if (keyframe.time >= time && (after === undefined || keyframe.time < after.time))
            after = keyframe;
    });
    const result = { beforeIndex };
    if (before !== undefined)
        result.before = before;
    if (after !== undefined)
        result.after = after;
    return result;
}
export function sampleTransformChannel(keyframes, time, context) {
    context.sampleTime = time;
    if (keyframes.length === 0)
        return context.channel === "scale" ? [1, 1, 1] : [0, 0, 0];
    const sorted = [...keyframes].sort((left, right) => left.time - right.time);
    const { before, after, beforeIndex } = findSegment(sorted, time);
    if (before !== undefined && Math.abs(before.time - time) < 1e-7) {
        return AXES.map((_, axis) => keyframeValue(before, 0, axis, context));
    }
    if (after !== undefined && Math.abs(after.time - time) < 1e-7) {
        return AXES.map((_, axis) => keyframeValue(after, 0, axis, context));
    }
    if (before === undefined && after !== undefined) {
        return AXES.map((_, axis) => segmentValue(after, "after", axis, context));
    }
    if (after === undefined && before !== undefined) {
        return AXES.map((_, axis) => segmentValue(before, "before", axis, context));
    }
    if (before === undefined || after === undefined)
        return context.channel === "scale" ? [1, 1, 1] : [0, 0, 0];
    if (before.interpolation === "step") {
        return AXES.map((_, axis) => segmentValue(before, "before", axis, context));
    }
    const alpha = Math.max(0, Math.min(1, (time - before.time) / (after.time - before.time)));
    return AXES.map((_, axisValue) => {
        const axis = axisValue;
        if (before.interpolation === "catmullrom" || after.interpolation === "catmullrom") {
            const beforePlus = sorted[beforeIndex - 1];
            const afterPlus = sorted[beforeIndex + 2];
            const p1 = segmentValue(before, "before", axis, context);
            const p2 = segmentValue(after, "after", axis, context);
            const p0 = beforePlus === undefined ? p1 : segmentValue(beforePlus, "before", axis, context);
            const p3 = afterPlus === undefined ? p2 : segmentValue(afterPlus, "after", axis, context);
            return catmullRom(p0, p1, p2, p3, alpha);
        }
        if (before.interpolation === "bezier" || after.interpolation === "bezier") {
            return bezier(before, after, axis, alpha, context);
        }
        const start = segmentValue(before, "before", axis, context);
        const end = segmentValue(after, "after", axis, context);
        return start + (end - start) * alpha;
    });
}
function rotationQuaternion(keyframe, pointIndex, rest, context) {
    const values = AXES.map((_, axis) => keyframeValue(keyframe, pointIndex, axis, context));
    return new Quaternion().setFromEuler(new Euler(rest.x + values[0] * Math.PI / 180, rest.y + values[1] * Math.PI / 180, rest.z + values[2] * Math.PI / 180, rest.order));
}
export function sampleQuaternionRotation(keyframes, time, rest, context) {
    context.sampleTime = time;
    if (keyframes.length === 0)
        return new Quaternion().setFromEuler(rest);
    const sorted = [...keyframes].sort((left, right) => left.time - right.time);
    const { before, after } = findSegment(sorted, time);
    if (before !== undefined && Math.abs(before.time - time) < 1e-7)
        return rotationQuaternion(before, 0, rest, context);
    if (after !== undefined && Math.abs(after.time - time) < 1e-7)
        return rotationQuaternion(after, 0, rest, context);
    if (before === undefined && after !== undefined)
        return rotationQuaternion(after, 0, rest, context);
    if (after === undefined && before !== undefined) {
        return rotationQuaternion(before, Math.max(0, before.data_points.length - 1), rest, context);
    }
    if (before === undefined || after === undefined)
        return new Quaternion().setFromEuler(rest);
    const beforeIndex = Math.max(0, before.data_points.length - 1);
    if (before.interpolation === "step")
        return rotationQuaternion(before, beforeIndex, rest, context);
    const alpha = Math.max(0, Math.min(1, (time - before.time) / (after.time - before.time)));
    return rotationQuaternion(before, beforeIndex, rest, context).slerp(rotationQuaternion(after, 0, rest, context), alpha);
}
export function createSampleContext(animation, animatorID, animator, channel, formatVersion, options, warnings, warnedExpressions) {
    return {
        animation,
        animatorID,
        animator,
        channel,
        formatVersion,
        options,
        warnings,
        warnedExpressions,
        sampleTime: 0,
    };
}
//# sourceMappingURL=interpolation.js.map