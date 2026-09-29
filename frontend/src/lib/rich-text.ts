export const isBrowser = () => typeof window !== "undefined";

const allowedTags = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "code",
  "pre",
  "blockquote",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "td",
  "th",
  "caption",
  "colgroup",
  "col",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "sub",
  "sup",
  "span",
  "div",
]);

const allowedAttrs: Record<string, string[]> = {
  a: ["href", "target", "rel"],
  img: ["src", "alt", "title", "style"],
  table: ["style", "border", "cellpadding", "cellspacing", "class"],
  td: ["style", "colspan", "rowspan", "class"],
  th: ["style", "colspan", "rowspan", "scope", "class"],
  col: ["style", "span"],
  colgroup: ["span"],
  span: ["style", "class"],
  div: ["style", "class"],
  tr: ["style", "class"],
};

// Only allow safe CSS properties on img elements
const sanitizeImgStyle = (style: string): string => {
  const allowed = ["width", "max-width", "height", "border-radius"];
  return style
    .split(";")
    .map((s) => s.trim())
    .filter((s) => {
      const prop = s.split(":")[0]?.trim().toLowerCase();
      return prop && allowed.includes(prop);
    })
    .join(";");
};

// Allow safe CSS properties on table-related elements
const sanitizeTableStyle = (style: string): string => {
  const allowed = [
    "width", "min-width", "max-width", "height",
    "border", "border-width", "border-style", "border-color", "border-collapse",
    "border-top", "border-right", "border-bottom", "border-left",
    "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
    "margin", "text-align", "vertical-align", "background-color", "color",
    "font-weight", "font-size",
  ];
  return style
    .split(";")
    .map((s) => s.trim())
    .filter((s) => {
      const prop = s.split(":")[0]?.trim().toLowerCase();
      return prop && allowed.includes(prop);
    })
    .join(";");
};

const isSafeUrl = (url: string) => {
  try {
    const parsed = new URL(url, "https://example.com");
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return true;
    if (parsed.protocol === "data:") {
      return /^data:image\//i.test(url);
    }
    return false;
  } catch {
    return false;
  }
};

const unwrapElement = (el: Element) => {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) {
    parent.insertBefore(el.firstChild, el);
  }
  parent.removeChild(el);
};

export const sanitizeHtml = (raw: string) => {
  if (!raw || !raw.trim()) return "";
  if (!isBrowser()) return raw;

  const doc = new DOMParser().parseFromString(raw, "text/html");
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  const toProcess: Element[] = [];

  while (walker.nextNode()) {
    toProcess.push(walker.currentNode as Element);
  }

  for (const el of toProcess) {
    const tag = el.tagName.toLowerCase();
    if (!allowedTags.has(tag)) {
      unwrapElement(el);
      continue;
    }

    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      const name = attr.name.toLowerCase();
      const allowed = allowedAttrs[tag]?.includes(name);
      if (!allowed) {
        el.removeAttribute(name);
        continue;
      }

      if (tag === "a" && name === "href" && !isSafeUrl(attr.value)) {
        el.removeAttribute(name);
      }

      if (tag === "img" && name === "src" && !isSafeUrl(attr.value)) {
        el.removeAttribute(name);
      }
    }

    if (tag === "img" && el.hasAttribute("style")) {
      const safe = sanitizeImgStyle(el.getAttribute("style") || "");
      if (safe) {
        el.setAttribute("style", safe);
      } else {
        el.removeAttribute("style");
      }
    }

    const tableTags = new Set(["table", "td", "th", "tr", "col", "colgroup", "span", "div"]);
    if (tableTags.has(tag) && el.hasAttribute("style")) {
      const safe = sanitizeTableStyle(el.getAttribute("style") || "");
      if (safe) {
        el.setAttribute("style", safe);
      } else {
        el.removeAttribute("style");
      }
    }

    if (tag === "a") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
  }

  return doc.body.innerHTML;
};

export const plainTextToHtml = (text: string) => {
  if (!text || !text.trim()) return "";
  if (!isBrowser()) {
    return text.replace(/\n/g, "<br/>");
  }
  const wrapper = document.createElement("div");
  wrapper.textContent = text;
  const escaped = wrapper.innerHTML.replace(/\n/g, "<br/>");
  return `<p>${escaped}</p>`;
};

export const normalizeDescriptionToHtml = (description?: string) => {
  if (!description || !description.trim()) return "";
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(description);
  const html = looksLikeHtml ? description : plainTextToHtml(description);
  return sanitizeHtml(html);
};

export const isRichTextEmpty = (html?: string) => {
  if (!html) return true;
  const cleaned = html
    .replace(/<br\s*\/?>/gi, "")
    .replace(/<p>\s*<\/p>/gi, "")
    .replace(/&nbsp;/gi, "")
    .replace(/\s+/g, "")
    .trim();
  return cleaned.length === 0;
};

export const stripHtml = (html?: string) => {
  if (!html) return "";
  if (isBrowser()) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  }
  return html.replace(/<[^>]*>/g, "");
};
