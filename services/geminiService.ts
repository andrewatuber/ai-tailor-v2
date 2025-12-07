import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, GarmentModel } from "../types";

export const analyzeGarmentImage = async (base64Image: string, model: GarmentModel): Promise<AnalysisResult> => {
  try {
    // Explicitly check for API Key before attempting to initialize
    if (!process.env.API_KEY) {
      throw new Error("API Key is missing");
    }

    // Always initialize a new instance to ensure the latest API key is used
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Strip the data URL prefix if present
    const base64Data = base64Image.split(',')[1] || base64Image;

    const prompt = `You are an expert technical fashion designer. 
    Your task is to analyze the image of a garment with a reference ruler and return the coordinates for specific measurement points.

    ---------------------------------------------------------
    1. REFERENCE RULER (50cm)
    ---------------------------------------------------------
    - Find the ruler bar in the image.
    - The distance from the '0' mark to the '50' mark is EXACTLY 50.0 cm.
    - If numbers are blurry, use the full visible length of the bar as 50.0 cm.

    ---------------------------------------------------------
    2. MEASUREMENT INSTRUCTIONS (By Clothing Type)
    ---------------------------------------------------------
    Identify the clothing type: SHIRT, PANTS, SKIRT, DRESS, or OUTER.
    Return coordinates on a 0-1000 scale.

    === IF SHIRT (상의) ===
    - **Shoulder Width (어깨너비)**:
      *   Find the "Shoulder Point" (SP): The exact corner where the shoulder seam meets the sleeve seam.
      *   Measure the straight line distance between Left SP and Right SP.
      *   *Correction*: Do NOT measure the fold of the sleeve. Measure the SEAM.
    - **Chest Width (가슴단면)**:
      *   Find the "Axilla" (Armpit): The intersection of the side seam and the underarm sleeve seam.
      *   Measure the horizontal distance between Left Axilla and Right Axilla.
    - **Sleeve Length (소매길이)**:
      *   Start: The SAME "Shoulder Point" (SP) found above.
      *   End: The center of the sleeve cuff edge.
    - **Total Length (총장)**:
      *   Start: "High Point Shoulder" (HPS) - The point where the shoulder seam meets the collar.
      *   End: Drop a vertical line to the bottom hem.

    === IF OUTER (아우터/자켓/패딩) ===
    *   **IGNORE HOODS**. Measure the garment body only.
    - **Shoulder Width (어깨너비)**:
      *   Measure between the left and right "Sleeve Insertion Seams" (where the sleeve attaches to the body).
      *   Use the OUTERMOST structural seam.
    - **Chest Width (가슴단면)**:
      *   Pit to pit (Axilla to Axilla).
    - **Sleeve Length (소매길이)**:
      *   Start: The "Sleeve Insertion Seam" (same as shoulder end).
      *   End: Cuff edge.
    - **Total Length (총장)**:
      *   Start: Side Neck Point (HPS). Ignore hood height.
      *   End: Bottom hem.

    === IF PANTS (하의) ===
    - **Waist Width (허리단면)**: Top corner to top corner.
    - **Hip Width (엉덩이단면)**: Widest part of the hips.
    - **Thigh Width (허벅지단면)**: Crotch intersection -> Horizontal to outer edge.
    - **Hem Width (밑단단면)**: Leg opening width (Horizontal).
    - **Total Length (총장)**: Waist top to Hem bottom (Outseam).

    === IF SKIRT (스커트) ===
    - **Waist Width (허리단면)**: Top edge width.
    - **Hip Width (엉덩이단면)**: Widest hip width.
    - **Hem Width (밑단단면)**: Bottom hem width (Horizontal).
    - **Total Length (총장)**: Center top to Center bottom (Vertical).

    === IF DRESS (원피스) ===
    - **Shoulder Width (어깨너비)**: Left SP to Right SP.
    - **Chest Width (가슴단면)**: Axilla to Axilla.
    - **Waist Width (허리단면)**: Narrowest waist part.
    - **Sleeve Length (소매길이)**: SP to Cuff.
    - **Total Length (총장)**: HPS (Neck point) to Bottom Hem (Vertical).

    ---------------------------------------------------------
    OUTPUT FORMAT (JSON ONLY)
    ---------------------------------------------------------
    {
        "clothingType": "SHIRT" | "PANTS" | "SKIRT" | "DRESS" | "OUTER",
        "rulerStart": {"x": int, "y": int},
        "rulerEnd": {"x": int, "y": int},
        "rulerLengthCm": 50,
        "measurements": [
            { "label": "Korean Label", "start": {"x": int, "y": int}, "end": {"x": int, "y": int} }
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

    let cleanText = text.trim();
    cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '');
    
    const jsonStartIndex = cleanText.indexOf('{');
    const jsonEndIndex = cleanText.lastIndexOf('}');
    
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
      cleanText = cleanText.substring(jsonStartIndex, jsonEndIndex + 1);
    }

    const rawResult = JSON.parse(cleanText) as AnalysisResult;
    
    const result = { ...rawResult };
    
    // Calculate Euclidean distance of the ruler in normalized coordinate space
    const dx = result.rulerEnd.x - result.rulerStart.x;
    const dy = result.rulerEnd.y - result.rulerStart.y;
    const rulerPixelDist = Math.sqrt(dx * dx + dy * dy);

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