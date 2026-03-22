import { IStamp } from "../models/Stamp";

interface StampValues {
  date?: string;
  user?: string;
  stampId?: string;
  poBox?: string;
  email?: string;
}

/**
 * Generate SVG stamp from config and dynamic values
 */
export function generateStampSVG(
  stamp: IStamp,
  values: StampValues = {}
): string {
  const { shape, text, fields, style, template = "standard" } = stamp;
  const { color, opacity, rotation, fontSize = 18, wordPadding = 0 } = style;
  const smallFontSize = Math.max(fontSize - 4, 8);

  if (template === "sample-classic") {
    const topLine = text || "COMPANY STAMP";
    const dateLine = values.date || new Date().toLocaleDateString("en-GB");
    const poBoxLine = values.poBox || "P.O. Box 123-00100";
    const emailLine = values.email || "info@company.com";

    return `
      <svg 
        viewBox="0 0 200 120" 
        xmlns="http://www.w3.org/2000/svg"
        width="200"
        height="120"
      >
        <g opacity="${opacity}" transform="rotate(${rotation} 100 60)">
          <rect x="4" y="4" width="192" height="112" rx="6" ry="6" fill="none" stroke="${color}" stroke-width="3"/>
          <rect x="8" y="8" width="184" height="104" rx="4" ry="4" fill="none" stroke="${color}" stroke-width="1"/>
          <line x1="12" y1="30" x2="188" y2="30" stroke="${color}" stroke-width="1"/>
          <line x1="12" y1="58" x2="188" y2="58" stroke="${color}" stroke-width="1"/>
          <line x1="12" y1="84" x2="188" y2="84" stroke="${color}" stroke-width="1"/>

          <text x="100" y="20" text-anchor="middle" fill="${color}" font-size="9" font-family="Arial, sans-serif" letter-spacing="${Math.max(wordPadding * 0.4, 0)}" font-weight="700">
            ${topLine}
          </text>

          <text x="100" y="49" text-anchor="middle" fill="${color}" font-size="${Math.max(fontSize, 14)}" font-family="Arial, sans-serif" letter-spacing="${Math.max(wordPadding * 0.4, 0)}" font-weight="700">
            ${dateLine}
          </text>

          <text x="100" y="76" text-anchor="middle" fill="${color}" font-size="8" font-family="Arial, sans-serif" letter-spacing="${Math.max(wordPadding * 0.3, 0)}" font-weight="500">
            ${poBoxLine}
          </text>

          <text x="100" y="102" text-anchor="middle" fill="${color}" font-size="8" font-family="Arial, sans-serif" letter-spacing="${Math.max(wordPadding * 0.3, 0)}" font-weight="500">
            ${emailLine}
          </text>
        </g>
      </svg>
    `.trim();
  }

  let shapeElement = "";

  if (shape === "circle") {
    shapeElement = `
      <circle 
        cx="100" cy="100" r="90" 
        stroke="${color}" 
        fill="none" 
        stroke-width="4"
      />
      <circle 
        cx="100" cy="100" r="88" 
        stroke="${color}" 
        fill="none" 
        stroke-width="1"
      />
    `;
  } else if (shape === "rectangle") {
    shapeElement = `
      <rect 
        x="15" y="50" width="170" height="100" 
        stroke="${color}" 
        fill="none" 
        stroke-width="3"
        rx="8"
      />
    `;
  } else if (shape === "badge") {
    shapeElement = `
      <ellipse 
        cx="100" cy="100" rx="95" ry="80" 
        stroke="${color}" 
        fill="none" 
        stroke-width="3"
      />
    `;
  }

  let contentY = 90;
  let dynamicContentStartY = 115;

  let dynamicContent = "";

  if (fields.date && values.date) {
    dynamicContent += `
      <text 
        x="100" y="${dynamicContentStartY}" 
        text-anchor="middle" 
        fill="${color}" 
        font-size="${smallFontSize}" 
        font-family="Arial, sans-serif"
        font-weight="300"
      >
        ${values.date}
      </text>
    `;
    dynamicContentStartY += smallFontSize + 2;
  }

  if (fields.user && values.user) {
    dynamicContent += `
      <text 
        x="100" y="${dynamicContentStartY}" 
        text-anchor="middle" 
        fill="${color}" 
        font-size="${smallFontSize}" 
        font-family="Arial, sans-serif"
        font-weight="300"
      >
        ${values.user}
      </text>
    `;
    dynamicContentStartY += smallFontSize + 2;
  }

  if (fields.stampId && values.stampId) {
    dynamicContent += `
      <text 
        x="100" y="${dynamicContentStartY}" 
        text-anchor="middle" 
        fill="${color}" 
        font-size="${8}" 
        font-family="Arial, sans-serif"
        font-weight="300"
        opacity="0.7"
      >
        ID: ${values.stampId}
      </text>
    `;
    dynamicContentStartY += smallFontSize + 2;
  }

  if (fields.poBox && values.poBox) {
    dynamicContent += `
      <text 
        x="100" y="${dynamicContentStartY}" 
        text-anchor="middle" 
        fill="${color}" 
        font-size="${smallFontSize}" 
        font-family="Arial, sans-serif"
        font-weight="300"
      >
        ${values.poBox}
      </text>
    `;
    dynamicContentStartY += smallFontSize + 2;
  }

  if (fields.email && values.email) {
    dynamicContent += `
      <text 
        x="100" y="${dynamicContentStartY}" 
        text-anchor="middle" 
        fill="${color}" 
        font-size="${smallFontSize}" 
        font-family="Arial, sans-serif"
        font-weight="300"
      >
        ${values.email}
      </text>
    `;
  }

  const svg = `
    <svg 
      viewBox="0 0 200 200" 
      xmlns="http://www.w3.org/2000/svg"
      width="200"
      height="200"
    >
      <defs>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
        </style>
      </defs>
      <g 
        opacity="${opacity}" 
        transform="rotate(${rotation} 100 100)"
      >
        ${shapeElement}
        <text 
          x="100" y="${contentY}" 
          text-anchor="middle" 
          fill="${color}" 
          font-size="${fontSize}" 
          letter-spacing="${wordPadding}"
          word-spacing="${wordPadding}"
          font-weight="bold"
          font-family="Arial, sans-serif"
        >
          ${text}
        </text>
        ${dynamicContent}
      </g>
    </svg>
  `;

  return svg.trim();
}

/**
 * Generate preview SVG for stamp builder
 */
export function generateStampPreviewSVG(
  stamp: Partial<IStamp>
): string {
  const {
    shape = "circle",
    text = "COMPANY STAMP",
    fields = { date: true, user: true, stampId: false, poBox: false, email: false },
    style = {
      color: "#8B0000",
      opacity: 0.2,
      rotation: 12,
      fontSize: 18,
      wordPadding: 0,
    },
  } = stamp;

  const today = new Date().toLocaleDateString("en-GB");
  const currentUser = "Admin User";

  return generateStampSVG(
    {
      shape: shape as "circle" | "rectangle" | "badge",
      text,
      fields,
      style,
    } as IStamp,
    {
      date: today,
      user: currentUser,
      stampId: "STM-12345",
      poBox: "P.O. Box 123-00100",
      email: "info@company.com",
    }
  );
}

/**
 * Validate stamp configuration
 */
export function validateStampConfig(stamp: Partial<IStamp>): string[] {
  const errors: string[] = [];

  if (!stamp.name || stamp.name.trim().length === 0) {
    errors.push("Stamp name is required");
  }

  if (!stamp.text || stamp.text.trim().length === 0) {
    errors.push("Stamp text is required");
  }

  if (stamp.text && stamp.text.length > 50) {
    errors.push("Stamp text cannot exceed 50 characters");
  }

  if (!stamp.shape || !["circle", "rectangle", "badge"].includes(stamp.shape)) {
    errors.push("Invalid shape");
  }

  if (!stamp.style) {
    errors.push("Style configuration is required");
  } else {
    const { color, opacity, rotation, wordPadding = 0 } = stamp.style;

    if (!color || !/^#[0-9A-F]{6}$/i.test(color)) {
      errors.push("Invalid color format (use hex: #RRGGBB)");
    }

    if (opacity < 0 || opacity > 1) {
      errors.push("Opacity must be between 0 and 1");
    }

    if (rotation < 0 || rotation > 20) {
      errors.push("Rotation must be between 0 and 20 degrees");
    }

    if (wordPadding < 0 || wordPadding > 20) {
      errors.push("Word padding must be between 0 and 20");
    }
  }

  return errors;
}
