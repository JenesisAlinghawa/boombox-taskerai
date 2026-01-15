const fs = require("fs");
const s = fs.readFileSync("src/app/messages/page.tsx", "utf8");
let i = 0,
  line = 1,
  col = 1;
let count = 0,
  maxCount = 0,
  maxPos = null;
let inSingle = false,
  inDouble = false,
  inTemplate = false,
  inLine = false,
  inBlock = false;
while (i < s.length) {
  const ch = s[i];
  const next = s[i + 1] || "";
  if (!inSingle && !inDouble && !inLine && !inBlock && ch === "`") {
    inTemplate = !inTemplate;
    i++;
    continue;
  }
  if (!inTemplate && !inDouble && !inLine && !inBlock && ch === "'") {
    inSingle = !inSingle;
    i++;
    continue;
  }
  if (!inTemplate && !inSingle && !inLine && !inBlock && ch === '"') {
    inDouble = !inDouble;
    i++;
    continue;
  }
  if (!inSingle && !inDouble && !inTemplate) {
    if (!inLine && !inBlock && ch === "/" && next === "/") {
      inLine = true;
      i += 2;
      continue;
    }
    if (!inLine && !inBlock && ch === "/" && next === "*") {
      inBlock = true;
      i += 2;
      continue;
    }
  }
  if (inLine && (ch === "\n" || ch === "\r")) inLine = false;
  if (inBlock && ch === "*" && next === "/") {
    inBlock = false;
    i += 2;
    continue;
  }
  if (!inSingle && !inDouble && !inTemplate && !inLine && !inBlock) {
    if (ch === "{") {
      count++;
      if (count > maxCount) {
        maxCount = count;
        maxPos = { i, line, col };
      }
    } else if (ch === "}") count--;
  }
  if (ch === "\n") {
    line++;
    col = 1;
  } else col++;
  i++;
}
console.log(
  `finalCount=${count} maxCount=${maxCount} at line ${maxPos.line} col ${maxPos.col} pos ${maxPos.i}`
);
// print surrounding context
const pos = maxPos.i;
const start = Math.max(0, pos - 200);
const end = Math.min(s.length, pos + 200);
console.log("---context---");
console.log(s.slice(start, end));
