"use strict";
// will be included in strict-lodash
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapAndFilter = void 0;
// todo better name
/** Doing the same thing as `array.map()` but then, it removes all `undefined` values */
const mapAndFilter = (array, fn) => {
    return array.map(fn).filter(value => value !== undefined);
};
exports.mapAndFilter = mapAndFilter;
/** Shortcut for `Object.fromEntries(array.map(o => [o.keyProp, o.valueProp]))` */
// export const objectFromMap = (array)
