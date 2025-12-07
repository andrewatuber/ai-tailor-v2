import { AnalysisResult } from "../types";

export interface TestValidationResult {
  passed: boolean;
  missingFields: string[];
  invalidValues: string[];
}

export const validateResult = (result: AnalysisResult): TestValidationResult => {
  const missingFields: string[] = [];
  const invalidValues: string[] = [];

  // 1. Validate Ruler
  if (!result.rulerStart || !result.rulerEnd) {
    missingFields.push("Ruler Coordinates");
  }

  // 2. Validate Required Fields by Type
  const requiredLabels: Record<string, string[]> = {
    'SHIRT': ['어깨너비', '가슴단면', '소매길이', '총장'],
    'OUTER': ['어깨너비', '가슴단면', '소매길이', '총장'],
    'PANTS': ['허리단면', '엉덩이단면', '허벅지단면', '밑단단면', '총장'],
    'SKIRT': ['허리단면', '엉덩이단면', '밑단단면', '총장'],
    'DRESS': ['어깨너비', '가슴단면', '허리단면', '소매길이', '총장']
  };

  const expected = requiredLabels[result.clothingType] || [];
  const actualLabels = result.measurements.map(m => m.label);

  expected.forEach(label => {
    // Check purely for inclusion, allowing for slight variations if needed
    if (!actualLabels.some(l => l.includes(label))) {
      missingFields.push(label);
    }
  });

  // 3. Validate Numeric Sanity
  result.measurements.forEach(m => {
    if (m.valueCm === undefined || m.valueCm <= 0 || isNaN(m.valueCm)) {
      invalidValues.push(`${m.label} (${m.value})`);
    }
    // Coordinate sanity check (0-1000)
    if (m.start.x < 0 || m.start.x > 1000 || m.start.y < 0 || m.start.y > 1000) {
      invalidValues.push(`${m.label} coordinates out of bounds`);
    }
  });

  return {
    passed: missingFields.length === 0 && invalidValues.length === 0,
    missingFields,
    invalidValues
  };
};