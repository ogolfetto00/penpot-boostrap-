// Implementa plugin che mappa la logica del tailwind plugin fornito su classi Bootstrap

// --- Helpers -----------------------------------------------------------------
function filterStringOnly(arr) {
		return arr.filter((i) => typeof i === "string");
}

function attrToString(attrs) {
		if (!attrs) return "";
		return " " + Object.entries(attrs).map(([name, value]) => {
				return `${name}="${value}"`;
		}).join(" ");
}

// Map semplice di alcuni colori Bootstrap comuni (hex lowercase)
const BOOTSTRAP_COLOR_HEX = {
	"#0d6efd": "primary",
	"#6c757d": "secondary",
	"#198754": "success",
	"#dc3545": "danger",
	"#ffc107": "warning",
	"#0dcaf0": "info",
	"#f8f9fa": "light",
	"#212529": "dark",
	"#6c757d": "muted"
};
function colorHexToBootstrapName(hex) {
		if (!hex) return null;
		const h = hex.toLowerCase();
		return BOOTSTRAP_COLOR_HEX[h] ?? null;
}

// --- Size/typography helpers (semplificate) ---------------------------------
const baseSize = 16;
function fontSizeToFsClass(fontSize) {
		if (!fontSize) return null;
		// fs-1 grande -> fs-6 piccolo
		if (fontSize >= 48) return "fs-1";
		if (fontSize >= 36) return "fs-2";
		if (fontSize >= 28) return "fs-3";
		if (fontSize >= 20) return "fs-4";
		if (fontSize >= 16) return "fs-5";
		return "fs-6";
}
function fontWeightToFwClass(weight) {
		if (!weight) return null;
		const w = parseInt(weight);
		return w >= 700 ? "fw-bold" : (w >= 600 ? "fw-semibold" : "fw-normal");
}

// --- Layout / spacing helpers -----------------------------------------------
function spacingToClass(prefix, v) { // prefix: p/m/gap, v: pixels
		if (v == null) return null;
		// Bootstrap spacing scale 0-5 roughly => map by /8
		const n = Math.max(0, Math.min(5, Math.round(v / 8)));
		return `${prefix}-${n}`;
}

// --- Background / fill ------------------------------------------------------
function backgroundToClasses(shape) {
		const cls = [];
		if (!Array.isArray(shape.fills) || shape.fills.length === 0) return cls;
		const first = shape.fills[0];
		if (first.fillColorGradient) {
				// fallback: use inline style gradient
				// keep classes empty; style handled elsewhere
				return cls;
		}
		// try common color mapping
		const c = first.fillColor || first.fillColorHex || first.fillColorHex8 || first.fill;
		if (c) {
				const name = colorHexToBootstrapName(c);
				if (name) cls.push(`bg-${name}`);
		}
		return cls;
}

// --- Border -------------------------------------------------------------
function borderToClasses(stroke) {
		if (!stroke) return [];
		const cls = [];
		// stroke.strokeWidth -> border-1 etc (Bootstrap doesn't have border-2 named like this, but keep simple)
		if (stroke.strokeWidth) cls.push(`border-${stroke.strokeWidth}`);
		// color mapping
		const name = colorHexToBootstrapName(stroke.strokeColor);
		if (name) cls.push(`border-${name}`);
		return cls;
}

// --- Text element conversion ------------------------------------------------
function fillColorFromFills(fills) {
		if (!Array.isArray(fills)) return null;
		for (const f of fills) {
				if (f.fillColor || f.fillColorHex) {
						return {
								hex: (f.fillColor || f.fillColorHex).toLowerCase(),
								opacity: f.fillOpacity ?? 1
						};
				}
		}
		return null;
}
function textToElement(text) {
		const cls = [];
		const attrs = {};
		if (text.fontStyle === "italic") cls.push("fst-italic");
		if (text.fontWeight) cls.push(fontWeightToFwClass(text.fontWeight));
		if (text.fontSize) cls.push(fontSizeToFsClass(text.fontSize));
		const align = text.align ?? text.textAlign;
		if (align && ["left", "center", "right"].includes(align)) {
				cls.push(align === "left" ? "text-start" : align === "center" ? "text-center" : "text-end");
		}
		// color from fills -> try map to bootstrap text-*
		if (Array.isArray(text.fills)) {
				const c = fillColorFromFills(text.fills);
				if (c) {
						const name = colorHexToBootstrapName(c.hex);
						if (name) cls.push(`text-${name}`);
						else attrs.style = `${attrs.style ?? ""}color: ${c.hex};`;
				}
		}
		return {
				tag: "div",
				classes: filterStringOnly(cls),
				attrs: Object.keys(attrs).length ? attrs : undefined,
				children: [text.characters ?? text.content ?? ""]
		};
}

// --- Board / frame conversion ---------------------------------------------
function boardToElement(shape) {
		const cls = [];
		if ("flex" in shape && shape.flex) {
				cls.push("d-flex");
				if (shape.flex && shape.flex.dir === "column") cls.push("flex-column");
				if (shape.flex && shape.flex.wrap === "wrap") cls.push("flex-wrap");
		} else {
				cls.push("container");
		}
		// spacing
		if (shape.padding) {
				const p = spacingToClass("p", shape.padding);
				if (p) cls.push(p);
		}
		return { tag: "div", classes: filterStringOnly(cls), children: [] };
}

// --- Radius (rounded) ------------------------------------------------------
function radiusToClasses(shape) {
		if (!shape) return [];
		if (shape.borderRadius >= Math.min(shape.width ?? 0, shape.height ?? 0)) return ["rounded-circle"];
		if (shape.borderRadius) {
				// approximate mapping
				if (shape.borderRadius >= 12) return ["rounded"];
				return [];
		}
		return [];
}

// --- Shape -> element (composizione) ---------------------------------------
function shapeToElement(shape) {
		let element = { tag: "div", children: [], classes: [] , attrs: undefined, attrsRaw: {}};
		if (shape.type === "text") {
				element = textToElement(shape);
		} else if (shape.type === "board" || shape.type === "frame") {
				element = boardToElement(shape);
		} else if (shape.type === "ellipse") {
				element = { tag: "div", classes: ["rounded-circle"], children: [] };
		} else if (shape.type === "group" && isSVG(shape)) {
				element.tag = "svg";
		} else if ("fills" in shape && Array.isArray(shape.fills) && shape.fills[0] && shape.fills[0].fillImage) {
				element.tag = "img";
				element.attrs = { src: `https://picsum.photos/${Math.round(shape.width)}/${Math.round(shape.height)}` };
		}
		// position -> for bootstrap we prefer layout classes (no absolute)
		// background
		element.classes.push(...backgroundToClasses(shape));
		// children flex/grid behaviour -> handled by boardToElement or classes already
		// border
		if (shape.strokes && shape.strokes.length) {
				element.classes.push(...borderToClasses(shape.strokes[0]));
		}
		// radius
		element.classes.push(...radiusToClasses(shape));
		// shadows -> bootstrap doesn't have many shadow classes; map to shadow-sm / shadow / shadow-lg
		if (shape.shadows && shape.shadows.length) {
				// rough mapping by blur
				const b = shape.shadows[0].blur ?? 0;
				if (b > 20) element.classes.push("shadow-lg");
				else if (b > 6) element.classes.push("shadow");
				else element.classes.push("shadow-sm");
		}
		// children
		if ("children" in shape && element.tag !== "svg") {
				element.children = shape.children.filter((c) => c.visible !== false).map((c) => shapeToElement(c));
				// if flex/grid on parent, reverse to match visual order like nel plugin reference
				if (shape.flex || shape.grid) element.children.reverse();
		}
		// clean up classes
		element.classes = filterStringOnly(element.classes);
		return element;
}

function isSVG(shape) {
		if (!("children" in shape)) return false;
		const visible = shape.children.filter((s) => s.visible);
		return visible.length === visible.filter((c) => isSVG(c)).length;
}

// --- Element -> HTML string (indentato come reference) ---------------------
const tabspace = "&nbsp;&nbsp;";
function elementToString(element, space = "") {
		if (typeof element === "string") {
				return space + element;
		}
		let children = "";
		if (element.children && element.children.length > 0) {
				children = `<br/>` + element.children.map((e) => elementToString(e, space + tabspace)).join("<br/>") + `<br/>${space}`;
		}
		const selfClose = element.tag === "img" || element.tag === "input";
		const attrs = {
				...(element.attrs ?? {}),
				class: (element.classes ?? []).join(" ")
		};
		const htmlOpen = `
    ${space}&lt;${element.tag}${attrToString(attrs)}${selfClose ? " /&gt;" : "&gt;"}`;
		if (selfClose) return htmlOpen;
		return `${htmlOpen}${children}${space}&lt;/${element.tag}&gt;`;
}

function shapeToHTML(shape) {
		const element = shapeToElement(shape);
		return element ? elementToString(element) : "";
}

// --- Messaging / UI interaction --------------------------------------------
penpot.ui.open(
		"Bootstrap generator",
		"/penpot-plugins/penpot-boostrap-/ui.html?theme=" + encodeURIComponent(penpot.theme || ""),
		{ width: 360, height: 420 }
);

penpot.on("themechange", (theme) => {
		sendMessage({ type: "theme", content: theme });
});

penpot.on("selectionchange", () => {
		if (!penpot.selection[0]) return;
		sendMessage({ type: "html", content: shapeToHTML(penpot.selection[0]) });
});

// UI -> plugin messages (example: ready)
penpot.ui.onMessage((event) => {
		if (event.type === "ready" && penpot.selection.length > 0) {
				sendMessage({ type: "html", content: shapeToHTML(penpot.selection[0]) });
		}
		if (event.type === "generate-code") {
				// assemble final HTML with tokens + bootstrap
				generateFinalCode().then((code) => {
						sendMessage({ type: "code", content: code });
						// also notify legacy channel used by ui.html (pluginMessage)
						penpot.ui.sendMessage({ type: "code-output", code });
				});
		}
});

function sendMessage(message) {
		penpot.ui.sendMessage(message);
}

// --- Generate final standalone HTML (Bootstrap + tokens) --------------------
async function generateFinalCode() {
		// read tokens
		let cssVariables = ":root {\n";
		try {
				const tokens = await penpot.api.getDesignTokens();
				if (tokens && tokens.color) {
						for (const t of tokens.color) {
								const name = `--pp-color-${t.name.toLowerCase().replace(/\s+/g, "-")}`;
								cssVariables += `  ${name}: ${t.value};\n`;
						}
				}
				if (tokens && tokens.typography) {
						for (const t of tokens.typography) {
								const name = `--pp-typography-${t.name.toLowerCase().replace(/\s+/g, "-")}`;
								// store raw value (could be object) - stringify safely
								cssVariables += `  ${name}: ${typeof t.value === "string" ? t.value : JSON.stringify(t.value)};\n`;
						}
				}
		} catch (e) {
				// ignore
		}
		cssVariables += "}\n";

		// selection -> create content
		let contentHtml = "";
		const sel = penpot.selection;
		if (sel && sel.length > 0) {
				// use first selected shape to build simple markup (could be extended)
				const el = shapeToElement(sel[0]);
				// A simple production HTML: serialize element to real HTML (not the debug representation)
				function renderReal(element) {
						if (typeof element === "string") return element;
						const tag = element.tag || "div";
						const attrs = Object.assign({}, element.attrs ?? {});
						if (element.classes && element.classes.length) attrs.class = element.classes.join(" ");
						const attrStr = Object.entries(attrs).map(([k,v]) => `${k}="${v}"`).join(" ");
						const inner = (element.children || []).map(renderReal).join("");
						return `<${tag}${attrStr ? " " + attrStr : ""}>${inner}</${tag}>`;
				}
				contentHtml = renderReal(el);
		} else {
				contentHtml = `<div class="container p-4"><p class="text-muted">No element selected</p></div>`;
		}

		const final = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Penpot → Bootstrap</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<style>
${cssVariables}
</style>
</head>
<body>
${contentHtml}
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;
		return final;
}
