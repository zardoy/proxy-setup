// will be included in strict-lodash

// todo better name
/** Doing the same thing as `array.map()` but then, it removes all `undefined` values */
export const mapAndFilter = <T, K>(array: T[], fn: (value: T, index: number, array: T[]) => K): Exclude<K, undefined>[] => {
    return array.map(fn).filter(value => value !== undefined) as Exclude<K, undefined>[];
};

/** Shortcut for `Object.fromEntries(array.map(o => [o.keyProp, o.valueProp]))` */
// export const objectFromMap = (array)