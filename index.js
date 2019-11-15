const { randomBytes, createHash } = require("crypto");
const { writeFileSync } = require("fs");

const numCheck = ret => {
  if (/^[0-9]/.test(ret)) {
    return `_${ret}`;
  }
  return ret;
};
const _getRandom = currLen => {
  let ret = numCheck(
    randomBytes(currLen)
      .toString("base64")
      .replace(/[\/\+]/g, "_")
      .replace(/\=/g, "")
  );
  return ret;
};
let currLen = 3;
const getHash = str =>
  numCheck(
    createHash("md5")
      .update(str)
      .digest("base64")
      .substr(0, currLen)
  );

const addCSS = {
  kv(kvStyles, css) {
    for (const [key, props] of Object.entries(kvStyles)) {
      let newKey = `.${getHashedKey(key)}`;
      const cssText = `${newKey}{\n${_getCSSAttrs(props)}\n}`;
      css.push(cssText);
    }
  },
  prefix(prefixedStyles, css) {
    if (!prefixedStyles) return;
    for (const { key, props } of prefixedStyles) {
      const { prefix = "", selector, global } = key;
      let newKey = selector;
      if (!global) {
        newKey = getHashedKey(selector);
      }
      const cssText = `${prefix}${newKey}{\n${_getCSSAttrs(props)}\n}`;
      css.push(cssText);
    }
  }
};

/**
 * @type {Map<string,string>}
 */
const cssNameToHashedPropMap = new Map();

const usedProps = new Set();

const getProp = sel => {
  let ret = getHash(sel);
  while (usedProps.has(ret)) {
    currLen++;
    ret = _getRandom(currLen);
  }
  return ret;
};

function getHashedKey(sel) {
  let newKey = cssNameToHashedPropMap.get(sel);
  if (!newKey) {
    newKey = getProp(sel);
    cssNameToHashedPropMap.set(sel, newKey);
    usedProps.add(newKey);
  }
  return newKey;
}
/**
 *
 * @param {{kvStyles:Array<{key:{prefix:string,selector:string},props:number|string}>,stringStyles:string}|string} cssObjOrString
 */
function evaluate(cssObjOrString, writeFile = false) {
  if (typeof cssObjOrString === "string") return cssObjOrString;
  const {
    kvStyles = {},
    stringStyles = "",
    prefixedStyles = []
  } = cssObjOrString;
  const css = stringStyles ? [stringStyles] : [];
  addCSS.kv(kvStyles, css);
  addCSS.prefix(prefixedStyles, css);
  const ret = css.join("\n").trim();
  if (!writeFile) return ret;
  return writeFileSync(writeFile, ret);
}
const toKebabCase = string =>
  string.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, "$1-$2").toLowerCase();

const toCamelCase = string =>
  string.replace(/-([a-z])/g, g => {
    return g[1].toUpperCase();
  });
function _getCSSAttrs(v) {
  if (typeof v !== "object")
    throw new TypeError("Invalid type of css property");
  const ret = [];
  for (const [cssProp, cssVal] of Object.entries(v)) {
    ret.push(`${toKebabCase(cssProp)}:${cssVal};`);
  }
  return ret.join("\n");
}

function getGlueCode(filePath = false) {
  const rv = [];
  for (const [k, v] of cssNameToHashedPropMap) {
    rv.push(`export const ${toCamelCase(k)}=${JSON.stringify(v)};`);
  }
  const js = rv.join("\n");
  if (!filePath) return js;
  return writeFileSync(filePath, js);
}
module.exports = { evaluate, getGlueCode };
