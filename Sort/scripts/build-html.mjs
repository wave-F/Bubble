function removeBlockById(html, id) {
  const marker = `id="${id}"`;
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return html;

  const divStart = html.lastIndexOf("<div", markerIndex);
  if (divStart < 0) return html;

  const tagRe = /<\/?div\b[^>]*>/gi;
  tagRe.lastIndex = divStart;
  let depth = 0;
  let match;

  while ((match = tagRe.exec(html)) !== null) {
    depth += match[0].startsWith("</") ? -1 : 1;
    if (depth === 0) {
      return `${html.slice(0, divStart)}${html.slice(match.index + match[0].length)}`;
    }
  }

  return html;
}

export function stripDevOnlyMarkup(html) {
  let out = html
    .replace(/<script type="importmap">[\s\S]*?<\/script>\s*/gi, "")
    .replace(/<script[^>]*src="\.\/src\/main\.js[^"]*"[^>]*><\/script>\s*/gi, "")
    .replace(/<link rel="stylesheet" href="\.\/src\/styles\.css" \/>\s*/i, "");

  for (const id of ["level-test", "light-debug", "gameplay-help-tool"]) {
    out = removeBlockById(out, id);
  }

  return out;
}

function assetUrl(basePath, assetRevision) {
  if (!assetRevision) return basePath;
  return `${basePath}?v=${assetRevision}`;
}

export function buildProductionHtml(
  sourceHtml,
  { assetRevision = "", scriptTag } = {},
) {
  const titleMatch = sourceHtml.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch?.[1]?.trim() || "染色泡泡";
  const bodyMatch = sourceHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!bodyMatch) {
    throw new Error("index.html is missing <body>");
  }

  const body = stripDevOnlyMarkup(bodyMatch[1]).trim();
  const mainSrc = assetUrl("./main.js", assetRevision);
  const cssHref = assetUrl("./styles.css", assetRevision);
  const resolvedScriptTag = scriptTag ?? `<script src="${mainSrc}"></script>`;

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <link rel="icon" href="data:," />
    <title>${title}</title>
    <link rel="stylesheet" href="${cssHref}" />
  </head>
  <body>
    ${body}
    ${resolvedScriptTag}
  </body>
</html>
`;
}