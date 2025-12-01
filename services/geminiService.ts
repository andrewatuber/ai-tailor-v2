import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, GarmentModel } from "../types";

export const analyzeGarmentImage = async (base64Image: string, model: GarmentModel): Promise<AnalysisResult> => {
  try {
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
    Determine if the garment is a SHIRT (Top) or PANTS (Bottom).
    Measure the following segments using strict sewing standards.
    Coordinates must be precise (0-1000 scale).
    
    === IF SHIRT (상의) ===
    1.  **Shoulder Width (어깨너비)**:
        -   Find the Left Shoulder Point (where sleeve seam meets body).
        -   Find the Right Shoulder Point.
        -   Measure the straight HORIZONTAL line between them.
        -   Constraint: The Y-coordinates should be similar. Do not measure diagonally.
    2.  **Chest Width (가슴단면)**:
        -   From Left Armpit seam to Right Armpit seam. Flat horizontal line.
    3.  **Sleeve Length (소매길이)**:
        -   START: The Shoulder Point (seam where sleeve joins body).
        -   END: The middle of the sleeve cuff/hem edge.
        -   Measure the straight distance between these two points.
    4.  **Total Length (총장)**:
        -   START: **High Point Shoulder (HPS)**. This is the specific point where the shoulder seam meets the collar/neck seam.
        -   END: A point on the bottom hem that is **DIRECTLY VERTICAL** below the start point.
        -   **CRITICAL CONSTRAINT**: The line must be **VERTICAL** (perpendicular to the floor). The X-coordinate of Start and End must be virtually the same. **DO NOT** draw a diagonal line to the center or side. Drop a straight line down.
    
    === IF PANTS (하의) ===
    1.  **Waist Width (허리단면)**:
        -   Left waist edge to Right waist edge (straight across).
    2.  **Hip Width (엉덩이단면)**:
        -   Widest part of the hip area (straight across).
    3.  **Thigh Width (허벅지단면)**:
        -   START: The **Crotch Intersection** (십자선) - where the left and right legs meet.
        -   END: The outer edge of the thigh leg.
        -   DIRECTION: Strictly **HORIZONTAL** from the crotch outwards.
    4.  **Hem Width (밑단단면)**:
        -   Measure the linear width of the leg opening at the bottom.
        -   From the inner corner of the hem to the outer corner of the hem.
    5.  **Total Length (총장)**:
        -   START: Top edge of the waist band (usually at the side outseam).
        -   END: Bottom edge of the hem leg (on the same side).
        -   CONSTRAINT: Measure the full length. Ideally, this follows the outseam. If the user asks for a vertical line, ensure the start and end points align vertically as much as the garment shape allows. **Prevent diagonal skew across the body.**

    ---------------------------------------------------------
    OUTPUT FORMAT (STRICT JSON)
    ---------------------------------------------------------
    -   Labels MUST be in KOREAN.
    -   No markdown. Just JSON.
    
    {
        "clothingType": "SHIRT" | "PANTS",
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