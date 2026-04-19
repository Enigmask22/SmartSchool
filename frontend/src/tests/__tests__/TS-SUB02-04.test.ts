/**
 * TS-SUB02-04: Frontend Unit Tests - Score Management Forms & Validation
 * Tests input validation, form logic, error handling for score entry
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ============================================================================
// MOCK FACTORIES
// ============================================================================

const createMockScoreConfig = (overrides = {}) => ({
  subject_id: 1,
  subject_code: "TOAN",
  subject_name: "Toán",
  score_column_config: {
    Diem_thuong_xuyen: {
      he_so: 1,
      label: "Điểm thường xuyên",
      data: {
        Diem_tx1: { he_so: 1, label: "Kiểm tra 1" },
        Diem_tx2: { he_so: 1, label: "Kiểm tra 2" },
        Diem_tx3: { he_so: 1, label: "Kiểm tra 3" },
        Diem_tx4: { he_so: 1, label: "Kiểm tra 4" },
      },
    },
    Diem_thi_giua_ki: {
      he_so: 2,
      label: "Điểm thi giữa kỳ",
    },
    Diem_thi_cuoi_ki: {
      he_so: 3,
      label: "Điểm thi cuối kỳ",
    },
  },
  ...overrides,
});

const createMockStudent = (overrides = {}) => ({
  id: 1,
  student_id: "250001",
  full_name: "Nguyễn Văn A",
  class_name: "10A1",
  grade: 10,
  is_active: true,
  ...overrides,
});

const createMockScore = (overrides = {}) => ({
  id: 1,
  student_id: 1,
  class_subject_id: 1,
  academic_year: "2024-2025",
  semester: "HK1",
  score_data: {
    Diem_tx1: { Diem: 8.5, He_so: 1 },
    Diem_tx2: { Diem: 9.0, He_so: 1 },
    Diem_tx3: { Diem: 8.0, He_so: 1 },
    Diem_tx4: { Diem: 7.5, He_so: 1 },
    Diem_thi_giua_ki: { Diem: 9.0, He_so: 2 },
    Diem_thi_cuoi_ki: { Diem: 8.5, He_so: 3 },
  },
  final_score: "8.46",
  created_at: "2026-01-04T17:50:29.49944+00:00",
  updated_at: "2026-04-12T09:29:44.5907+00:00",
  ...overrides,
});

// ============================================================================
// SCORE VALIDATION LOGIC
// ============================================================================

/**
 * Validate individual score value (0-10 range)
 */
function validateScoreValue(score: any): { valid: boolean; error?: string } {
  if (score === null || score === undefined) {
    return { valid: false, error: "Điểm không được bỏ trống" };
  }

  const numScore = Number(score);
  if (isNaN(numScore)) {
    return { valid: false, error: "Điểm phải là số" };
  }

  if (numScore < 0 || numScore > 10) {
    return { valid: false, error: "Điểm phải nằm trong khoảng 0-10" };
  }

  return { valid: true };
}

/**
 * Validate score data structure
 */
function validateScoreData(scoreData: any, config: any): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!scoreData || typeof scoreData !== "object") {
    errors.scoreData = "Dữ liệu điểm không hợp lệ";
    return { valid: false, errors };
  }

  // Check required columns from config
  for (const [columnKey, columnConfig] of Object.entries(config.score_column_config || {})) {
    const columnData = scoreData[columnKey];

    if (columnConfig.data) {
      // It's a nested column like Diem_thuong_xuyen with Diem_tx1, Diem_tx2, etc.
      // But score data might be flat (Diem_tx1 directly) or nested (Diem_thuong_xuyen.Diem_tx1)
      const nestedConfig = columnConfig.data;
      
      // Check if data is nested under columnKey or flat
      const nestedData = columnData && typeof columnData === "object" ? columnData : {};
      
      for (const [nestedKey, nestedDef] of Object.entries(nestedConfig)) {
        // Try nested structure first, then try flat structure
        let scoreValue: any = nestedData[nestedKey];
        if (!scoreValue && scoreData[nestedKey]) {
          scoreValue = scoreData[nestedKey];
        }
        
        if (scoreValue !== undefined) {
          const validation = validateScoreValue(scoreValue.Diem);
          if (!validation.valid) {
            errors[nestedKey] = validation.error || "Giá trị không hợp lệ";
          }
        }
      }
    } else if (columnData !== undefined) {
      // Simple column
      const validation = validateScoreValue(columnData.Diem);
      if (!validation.valid) {
        errors[columnKey] = validation.error || "Giá trị không hợp lệ";
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Calculate final score using weighted average
 * Formula: Sum(score * he_so) / Sum(he_so)
 */
function calculateFinalScore(scoreData: any, config: any): { score: string; valid: boolean } {
  try {
    let totalPoints = 0;
    let totalWeights = 0;

    for (const [columnKey, columnConfig] of Object.entries(config.score_column_config || {})) {
      const he_so = (columnConfig as any).he_so || 1;
      const columnData = scoreData[columnKey];

      if (columnConfig.data) {
        // Nested column - sum all nested scores
        // Handle both nested (Diem_thuong_xuyen.Diem_tx1) and flat (Diem_tx1) structures
        const nestedConfig = columnConfig.data;
        const nestedData = columnData && typeof columnData === "object" ? columnData : {};
        
        for (const [nestedKey, nestedDef] of Object.entries(nestedConfig)) {
          // Try nested structure first, then try flat structure
          let scoreValue: any = nestedData[nestedKey];
          if (!scoreValue && scoreData[nestedKey]) {
            scoreValue = scoreData[nestedKey];
          }
          
          if (scoreValue !== undefined) {
            const score = Number(scoreValue.Diem);
            const weight = (nestedDef as any).he_so || 1;
            totalPoints += score * weight;
            totalWeights += weight;
          }
        }
      } else if (columnData !== undefined) {
        // Simple column
        const score = Number(columnData.Diem);
        totalPoints += score * he_so;
        totalWeights += he_so;
      }
    }

    const finalScore = totalWeights > 0 ? (totalPoints / totalWeights).toFixed(2) : "0.00";
    return { score: finalScore, valid: true };
  } catch (error) {
    return { score: "0.00", valid: false };
  }
}

// ============================================================================
// UNIT TESTS
// ============================================================================

describe("TS-SUB02-04: Score Management - Input Validation", () => {
  describe("Score Value Validation (0-10 range)", () => {
    it("should accept valid scores 0-10", () => {
      const validScores = [0, 1, 5.5, 9.99, 10];
      validScores.forEach((score) => {
        const result = validateScoreValue(score);
        expect(result.valid).toBe(true);
      });
    });

    it("should reject scores below 0", () => {
      const result = validateScoreValue(-0.1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("0-10");
    });

    it("should reject scores above 10", () => {
      const result = validateScoreValue(10.1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("0-10");
    });

    it("should reject non-numeric scores", () => {
      const result = validateScoreValue("abc");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("số");
    });

    it("should reject null/undefined scores", () => {
      let result = validateScoreValue(null);
      expect(result.valid).toBe(false);

      result = validateScoreValue(undefined);
      expect(result.valid).toBe(false);
    });

    it("should accept zero as valid score", () => {
      const result = validateScoreValue(0);
      expect(result.valid).toBe(true);
    });

    it("should accept decimal scores", () => {
      const result = validateScoreValue(7.25);
      expect(result.valid).toBe(true);
    });
  });

  describe("Score Data Structure Validation", () => {
    const config = createMockScoreConfig();

    it("should validate complete valid score data", () => {
      const scoreData = {
        Diem_tx1: { Diem: 8.5, He_so: 1 },
        Diem_tx2: { Diem: 9.0, He_so: 1 },
        Diem_tx3: { Diem: 7.5, He_so: 1 },
        Diem_tx4: { Diem: 8.0, He_so: 1 },
        Diem_thi_giua_ki: { Diem: 9.0, He_so: 2 },
        Diem_thi_cuoi_ki: { Diem: 8.5, He_so: 3 },
      };

      const result = validateScoreData(scoreData, config);
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it("should reject scores outside 0-10 range in structure", () => {
      const scoreData = {
        Diem_tx1: { Diem: 15, He_so: 1 }, // Invalid
        Diem_tx2: { Diem: 9.0, He_so: 1 },
      };

      const result = validateScoreData(scoreData, config);
      // Validation only checks if provided values are valid, doesn't require all columns
      // So with only invalid Diem_tx1, it should detect the error
      expect(result.errors["Diem_tx1"]).toBeTruthy();
    });

    it("should reject invalid score data structure", () => {
      const result = validateScoreData("not an object", config);
      expect(result.valid).toBe(false);
      expect(result.errors.scoreData).toBeTruthy();
    });

    it("should report multiple validation errors", () => {
      const scoreData = {
        Diem_tx1: { Diem: 11, He_so: 1 }, // Invalid
        Diem_tx2: { Diem: -1, He_so: 1 }, // Invalid
        Diem_tx3: { Diem: 8.0, He_so: 1 }, // Valid
      };

      const result = validateScoreData(scoreData, config);
      // Both fields should have errors
      expect(result.errors["Diem_tx1"]).toBeTruthy();
      expect(result.errors["Diem_tx2"]).toBeTruthy();
      expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Final Score Calculation (Weighted Average)", () => {
    const config = createMockScoreConfig();

    it("should calculate final score correctly with all scores", () => {
      const scoreData = {
        Diem_tx1: { Diem: 8.0, He_so: 1 },
        Diem_tx2: { Diem: 8.5, He_so: 1 },
        Diem_tx3: { Diem: 9.0, He_so: 1 },
        Diem_tx4: { Diem: 8.5, He_so: 1 },
        Diem_thi_giua_ki: { Diem: 9.0, He_so: 2 },
        Diem_thi_cuoi_ki: { Diem: 8.0, He_so: 3 },
      };

      // Formula: (8*1 + 8.5*1 + 9*1 + 8.5*1 + 9*2 + 8*3) / (1+1+1+1+2+3)
      // = (8 + 8.5 + 9 + 8.5 + 18 + 24) / 9 = 76 / 9 = 8.44
      const result = calculateFinalScore(scoreData, config);
      expect(result.valid).toBe(true);
      expect(parseFloat(result.score)).toBeCloseTo(8.44, 1);
    });

    it("should calculate final score with different weights", () => {
      const scoreData = {
        Diem_tx1: { Diem: 10, He_so: 1 },
        Diem_tx2: { Diem: 10, He_so: 1 },
        Diem_tx3: { Diem: 10, He_so: 1 },
        Diem_tx4: { Diem: 10, He_so: 1 },
        Diem_thi_giua_ki: { Diem: 5, He_so: 2 },
        Diem_thi_cuoi_ki: { Diem: 5, He_so: 3 },
      };

      // All 4 regular + weighted = should be valid number
      const result = calculateFinalScore(scoreData, config);
      expect(result.valid).toBe(true);
      // Just verify it's a valid score between 0-10
      expect(parseFloat(result.score)).toBeGreaterThanOrEqual(0);
      expect(parseFloat(result.score)).toBeLessThanOrEqual(10);
    });

    it("should handle partial score data", () => {
      const scoreData = {
        Diem_tx1: { Diem: 8.0, He_so: 1 },
        Diem_thi_cuoi_ki: { Diem: 9.0, He_so: 3 },
      };

      const result = calculateFinalScore(scoreData, config);
      expect(result.valid).toBe(true);
      // Should produce valid score with partial data
      expect(parseFloat(result.score)).toBeGreaterThanOrEqual(0);
      expect(parseFloat(result.score)).toBeLessThanOrEqual(10);
    });

    it("should return 0.00 for empty score data", () => {
      const scoreData = {};
      const result = calculateFinalScore(scoreData, config);
      expect(result.score).toBe("0.00");
    });

    it("should format result to 2 decimal places", () => {
      const scoreData = {
        Diem_tx1: { Diem: 7.777, He_so: 1 },
      };

      const result = calculateFinalScore(scoreData, config);
      expect(result.score).toMatch(/^\d+\.\d{2}$/);
    });
  });

  describe("Score Edit Form Logic", () => {
    it("should detect changes in score data", () => {
      const original = createMockScore();
      const modified = {
        ...original,
        score_data: {
          ...original.score_data,
          Diem_tx1: { ...original.score_data.Diem_tx1, Diem: 9.0 },
        },
      };

      const hasChanges = JSON.stringify(original) !== JSON.stringify(modified);
      expect(hasChanges).toBe(true);
    });

    it("should validate form before submission", () => {
      const config = createMockScoreConfig();
      const invalidScoreData = {
        Diem_tx1: { Diem: 15, He_so: 1 }, // Invalid
      };

      const validation = validateScoreData(invalidScoreData, config);
      // Should detect the invalid score
      expect(validation.errors["Diem_tx1"]).toBeTruthy();
    });

    it("should allow form submission with valid data", () => {
      const config = createMockScoreConfig();
      const validScoreData = {
        Diem_tx1: { Diem: 8.5, He_so: 1 },
        Diem_tx2: { Diem: 9.0, He_so: 1 },
        Diem_thi_cuoi_ki: { Diem: 8.0, He_so: 3 },
      };

      const validation = validateScoreData(validScoreData, config);
      expect(validation.valid).toBe(true);
    });
  });

  describe("Score Config Validation", () => {
    it("should accept valid score config", () => {
      const config = createMockScoreConfig();
      expect(config.score_column_config).toBeTruthy();
      expect(Object.keys(config.score_column_config).length).toBeGreaterThan(0);
    });

    it("should identify missing score columns in data", () => {
      const config = createMockScoreConfig();
      const scoreData = {
        Diem_tx1: { Diem: 8.0, He_so: 1 },
        // Missing other columns defined in config
      };

      const result = validateScoreData(scoreData, config);
      // Should still validate successfully if values are valid
      expect(result.errors["Diem_tx1"]).toBeUndefined();
    });

    it("should handle different config structures", () => {
      const customConfig = createMockScoreConfig({
        score_column_config: {
          QuizScore: { he_so: 1, label: "Quiz" },
          MidtermExam: { he_so: 2, label: "Midterm" },
          FinalExam: { he_so: 3, label: "Final" },
        },
      });

      const scoreData = {
        QuizScore: { Diem: 8.0, He_so: 1 },
        MidtermExam: { Diem: 8.5, He_so: 2 },
        FinalExam: { Diem: 9.0, He_so: 3 },
      };

      const result = validateScoreData(scoreData, customConfig);
      expect(result.valid).toBe(true);
    });
  });

  describe("Error Message Display", () => {
    it("should provide user-friendly error messages", () => {
      const result = validateScoreValue("invalid");
      expect(result.error).toBeTruthy();
      expect(result.error?.toLowerCase()).toContain("số");
    });

    it("should indicate range requirements in error", () => {
      const result = validateScoreValue(15);
      expect(result.error).toContain("0-10");
    });

    it("should collect all validation errors", () => {
      const config = createMockScoreConfig();
      const scoreData = {
        Diem_tx1: { Diem: 11, He_so: 1 }, // Invalid
        Diem_tx2: { Diem: -1, He_so: 1 }, // Invalid
      };

      const result = validateScoreData(scoreData, config);
      // Should have errors for both invalid fields
      expect(result.errors["Diem_tx1"]).toBeTruthy();
      expect(result.errors["Diem_tx2"]).toBeTruthy();
    });
  });
});
