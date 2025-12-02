import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, GarmentModel } from "../types";

export const analyzeGarmentImage = async (base64Image: string, model: GarmentModel): Promise<AnalysisResult> => {
  try {
    // Explicitly check for API Key before attempting to initialize
    // This allows the UI to catch the error and prompt the user
    if (!process.env.API_KEY) {
      throw new Error("API Key is missing");
    }

    // Always initialize a new instance to ensure the latest API key is used
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Strip the data URL prefix if present
    const base64Data = base64Image.split(',')[1] || base64Image;

    const prompt = `You are an expert fashion tailor AI specializing in precise garment measurement.
    
    YOUR MISSION:
    Analyze the image to extract the EXACT measurement of the garment based on the provided reference ruler.
    
    ---------------------------------------------------------
    STEP 1: RULER CALIBRATION (THE MOST CRITICAL STEP)
    ---------------------------------------------------------
    The image contains a reference ruler bar at the top.
    1.  **LOCATE THE RULER TICKS**: 
        -   Find the tick mark explicitly labeled **"0"** (Start).
        -   Find the tick mark explicitly labeled **"50"** (End).
        -   If numbers are blurry, assume the entire visible ruler bar from left edge to right edge represents exactly **50cm**.
    2.  **DEFINE THE REFERENCE**:
        -   Set 'rulerStart' coordinate EXACTLY at the "0" mark location.
        -   Set 'rulerEnd' coordinate EXACTLY at the "50" mark location.
    3.  **MANDATORY LENGTH**: The physical distance between these two points is **50.0 cm**.
        -   Value for 'rulerLengthCm' MUST be **50**.
        -   Do not estimate. The ruler is the ground truth.
    
    ---------------------------------------------------------
    STEP 2: IDENTIFY & MEASURE GARMENT
    ---------------------------------------------------------
    Determine if the garment is a SHIRT (Top), PANTS (Bottom), SKIRT (Skirt), DRESS (One-piece), or OUTER (Jacket/Padding).
    Measure the following segments using strict sewing standards.
    Coordinates must be precise (0-1000 scale).

    **GLOBAL RULE: IGNORE WRINKLES**
    -   Garments often have fabric folds, wrinkles, or shadow lines inside the body.
    -   **NEVER** measure to a wrinkle. 
    -   **ALWAYS** measure to the **OUTERMOST SILHOUETTE EDGE** where the garment meets the background.
    
    === IF SHIRT (상의) ===
    1.  **Shoulder Width (어깨너비)**:
        -   **TARGET**: The horizontal distance between the **Left Shoulder Point (SP)** and **Right Shoulder Point (SP)**.
        -   **DEFINITION of SP**: The specific structural corner where the **Top Shoulder Slope** meets the **Vertical Armhole Seam**.
        -   **CRITICAL FIX**: This point is at the **TOP** of the armhole. **Do NOT** measure across the middle of the body (Armpit level). You must find the HIGHEST outer corners of the body block.
        -   Action: Measure the straight line between Left SP and Right SP.

    2.  **Chest Width (가슴단면)**:
        -   **TARGET**: The horizontal distance between the Left and Right **Armpits (Axilla)**.
        -   **DEFINITION**: The bottom junction where the sleeve underarm seam meets the body side seam.
        -   **LOCATION**: This is significantly LOWER than the Shoulder Point.
        -   Action: Measure straight across from armpit to armpit.

    3.  **Sleeve Length (소매길이)**:
        -   **START**: The **Shoulder Point (SP)** (The exact same TOP corner point identified in Step 1).
        -   **END**: The outer edge of the sleeve cuff.
        -   **PATH**: Measure along the **OUTER** edge of the sleeve.
        -   **WARNING**: Do NOT start from the neck collar. Do NOT start from the armpit. Start from the Top Shoulder Corner.

    4.  **Total Length (총장)**:
        -   START: **High Point Shoulder (HPS)**. This is the intersection point where the shoulder seam meets the collar/neck seam.
        -   **WARNING**: Do NOT start from the top of the collar. Start at the seam *below* the collar.
        -   END: A point on the bottom hem that is **DIRECTLY VERTICAL** below the start point.
        -   **CRITICAL CONSTRAINT**: The line must be **VERTICAL** (perpendicular to the floor). The X-coordinate of Start and End must be virtually the same.
    
    === IF PANTS (하의) ===
    1.  **Waist Width (허리단면)**:
        -   Left waist edge to Right waist edge (straight across).
        -   **WARNING**: Ignore belt loops or waistband puckering. Find the true side edge.
    2.  **Hip Width (엉덩이단면)**:
        -   Widest part of the hip area (straight across).
        -   **WARNING**: If there are pockets causing folds, you MUST ignore the fold. 
            Measure the **OUTTERMOST** silhouette edge of the width.
    3.  **Thigh Width (허벅지단면)**:
        -   START: The **Crotch Intersection** (십자선).
        -   END: The **OUTERMOST** silhouette edge of the thigh.
        -   **CRITICAL WARNING**: Pants often have heavy wrinkles or folds near the crotch/thigh ("Whiskering"). **IGNORE** these internal lines. Measure all the way to the background boundary.
        -   DIRECTION: Strictly **HORIZONTAL** from the crotch outwards.
    4.  **Hem Width (밑단단면)**:
        -   From the inner corner of the hem to the outer corner of the hem.
        -   **Constraint**: Strictly **HORIZONTAL**. The Y-coordinates of start and end points must be similar. **DO NOT** measure diagonally even if the hem is curved. Measure the horizontal projection.
    5.  **Total Length (총장)**:
        -   START: Top edge of the waist band (Side Outseam).
        -   END: Bottom edge of the hem leg (on the same side).
        -   CONSTRAINT: Follow the outseam silhouette. Ignore any leg twisting or wrinkling.

    === IF SKIRT (스커트) ===
    1.  **Waist Width (허리단면)**:
        -   Straight horizontal line across the top waist edge.
    2.  **Hip Width (엉덩이단면)**:
        -   Straight horizontal line across the widest part of the hips.
    3.  **Hem Width (밑단단면)**:
        -   Straight **HORIZONTAL** line across the bottom hem edge.
        -   The Y-coordinates of the start and end points must be nearly identical. Do not slant.
    4.  **Total Length (총장)**:
        -   Vertical line from the center top of the waist to the center bottom hem.
        -   Ensure it is strictly vertical.

    === IF DRESS (원피스) ===
    1.  **Shoulder Width (어깨너비)**:
        -   Horizontal line from left shoulder seam to right shoulder seam (if sleeves exist). If sleeveless, measure outer shoulder edges.
    2.  **Chest Width (가슴단면)**:
        -   Horizontal line from armpit to armpit.
    3.  **Waist Width (허리단면)**:
        -   Horizontal line across the narrowest part of the waist.
    4.  **Sleeve Length (소매길이)**:
        -   (If sleeves exist) Shoulder seam to cuff. 
        -   **WARNING**: Ignore decorative puffs or ruffles. Measure the structural length.
    5.  **Hem Width (밑단단면)**:
        -   Straight **HORIZONTAL** line across the bottom hem edge.
        -   Do not slant. Measure straight across.
    6.  **Total Length (총장)**:
        -   Vertical line from **High Point Shoulder (HPS)** (neck/shoulder junction) down to the bottom hem.

    === IF OUTER (아우터/자켓/패딩) ===
    1.  **Shoulder Width (어깨너비)**:
        -   **CRITICAL FOR HOODED COATS**: **IGNORE THE HOOD**. Look BELOW the hood.
        -   **LANDMARK**: The **"Shoulder Point"** (SP). This is the structural seam where the sleeve circle attaches to the body block.
        -   **ACTION**: Measure the horizontal distance between the Left SP and Right SP.
    2.  **Chest Width (가슴단면)**:
        -   **LANDMARK**: The **Armpit Point** (Axilla). Where the side seam meets the underarm sleeve seam.
        -   **ACTION**: Measure straight across from left armpit to right armpit.
    3.  **Sleeve Length (소매길이)**:
        -   **START POINT**: The **"Shoulder Point"** (The exact same TOP point used for shoulder width).
        -   **END POINT**: The outer edge of the sleeve cuff.
        -   **WARNING**: Ignore epaulets, tabs, or logo patches. Find the structural sewing line.
    4.  **Total Length (총장)**:
        -   **START**: The **High Point Shoulder (HPS)** or Side Neck Point. 
        -   **WARNING**: Do NOT include the Hood height. Start where the shoulder meets the neck/collar.
        -   **END**: Bottom hem vertically down.
        -   Constraint: Ensure the line is strictly vertical.

    ---------------------------------------------------------
    OUTPUT FORMAT (STRICT JSON)
    ---------------------------------------------------------
    -   Labels MUST be in KOREAN.
    -   No markdown. Just JSON.
    
    {
        "clothingType": "SHIRT" | "PANTS" | "SKIRT" | "DRESS" | "OUTER",
        "rulerStart": {"x": int, "y": int},
        "rulerEnd": {"x": int, "y": int},
        "rulerLengthCm": 50,
        "measurements": [
            { "label": "어깨너비", "start": {"x": int, "y": int}, "end": {"x": int, "y": int} },
            { "label": "가슴단면", "start": {"x": int, "y": int}, "end": {"x": int, "y": int} },
            ...
        ]
    }`;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No text response received from Gemini.");
    }

    // Clean up potential markdown formatting or extra text
    let cleanText = text.trim();
    cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '');
    
    const jsonStartIndex = cleanText.indexOf('{');
    const jsonEndIndex = cleanText.lastIndexOf('}');
    
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
      cleanText = cleanText.substring(jsonStartIndex, jsonEndIndex + 1);
    }

    const rawResult = JSON.parse(cleanText) as AnalysisResult;
    
    // Post-process to calculate real-world values based on ruler
    const result = { ...rawResult };
    
    // Calculate Euclidean distance of the ruler in normalized coordinate space
    const dx = result.rulerEnd.x - result.rulerStart.x;
    const dy = result.rulerEnd.y - result.rulerStart.y;
    const rulerPixelDist = Math.sqrt(dx * dx + dy * dy);

    // Force strict 50cm reference as requested by user
    const referenceLength = 50;
    result.rulerLengthCm = referenceLength;

    if (rulerPixelDist > 0) {
      const unitsPerCm = rulerPixelDist / referenceLength;

      result.measurements = result.measurements.map(m => {
        const mdx = m.end.x - m.start.x;
        const mdy = m.end.y - m.start.y;
        const dist = Math.sqrt(mdx * mdx + mdy * mdy);
        const cmValue = dist / unitsPerCm;
        
        return {
          ...m,
          valueCm: parseFloat(cmValue.toFixed(1)),
          value: `${cmValue.toFixed(1)}cm`
        };
      });
    } else {
      result.measurements = result.measurements.map(m => ({
        ...m,
        value: "Error"
      }));
    }

    return result;

  } catch (error) {
    console.error("Error analyzing garment:", error);
    throw error;
  }
};