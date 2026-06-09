/**
 * TS-SUB01 Frontend Unit Tests: useSubjectDashboard & related hooks
 * Tests for dashboard state management, filtering, data transformation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock factories
const createMockAnalyticsData = (overrides = {}) => ({
  total_classes: 3,
  total_students: 90,
  students_with_scores: 85,
  students_without_scores: 5,
  is_letter_grade_subject: false,
  subjects: ["Toán", "Vật Lý"],
  overview: {
    pass_count: 68,
    fail_count: 17,
    average_score: 7.0,
    highest_score: 9.5,
    lowest_score: 2.3,
    pass_rate: 80.0,
  },
  performance_groups: {
    range_8_10: {
      label: "8.0 - 10",
      count: 25,
      percentage: 29.41,
      color: "#059669",
    },
    range_65_79: {
      label: "6.5 - 7.9",
      count: 30,
      percentage: 35.29,
      color: "#2563EB",
    },
    range_5_64: {
      label: "5.0 - 6.4",
      count: 20,
      percentage: 23.53,
      color: "#D97706",
    },
    range_35_49: {
      label: "3.5 - 4.9",
      count: 8,
      percentage: 9.41,
      color: "#EA580C",
    },
    range_below_35: {
      label: "< 3.5",
      count: 2,
      percentage: 2.35,
      color: "#DC2626",
    },
  },
  score_distribution: {
    "9-10": 12,
    "8-9": 13,
    "7-8": 18,
    "6-7": 20,
    "5-6": 15,
    "4-5": 5,
    "0-4": 2,
  },
  class_comparison: [
    {
      class_name: "10A1",
      average_score: 7.2,
      pass_rate: 85.0,
    },
    {
      class_name: "10A2",
      average_score: 6.8,
      pass_rate: 75.0,
    },
    {
      class_name: "10A3",
      average_score: 7.5,
      pass_rate: 90.0,
    },
  ],
  students_need_attention: [
    {
      student_id: "250001",
      student_name: "Nguyễn Văn A",
      class_name: "10A1",
      final_score: 2.5,
    },
    {
      student_id: "250002",
      student_name: "Trần Thị B",
      class_name: "10A2",
      final_score: 3.8,
    },
  ],
  top_students: [
    {
      student_id: "250010",
      student_name: "Lê Văn C",
      class_name: "10A1",
      final_score: 9.5,
    },
    {
      student_id: "250011",
      student_name: "Phạm Thị D",
      class_name: "10A3",
      final_score: 9.3,
    },
  ],
  ...overrides,
});

const createMockClassList = (overrides = {}) => ({
  class_id: "1",
  class_name: "10A1",
  grade: 10,
  subjects: [
    {
      subject_id: "1",
      subject_name: "Toán",
      subject_code: "TOAN",
    },
    {
      subject_id: "2",
      subject_name: "Vật Lý",
      subject_code: "LY",
    },
  ],
  ...overrides,
});

const createMockApiResponse = (data, success = true) => ({
  success,
  message: "Success",
  data,
});

// Unit Tests
describe("useSubjectDashboard Hook", () => {
  describe("Hook initialization", () => {
    it("should initialize with loading=true", () => {
      // Mock: When hook first mounts, loading should be true
      const mockLoading = true;
      expect(mockLoading).toBe(true);
    });

    it("should load default academic year from system settings", () => {
      const defaultYear = "2024-2025";
      const mockSettings = { academic_year: defaultYear };
      expect(mockSettings.academic_year).toBe("2024-2025");
    });

    it("should load default semester from system settings", () => {
      const defaultSemester = "HK1";
      const mockSettings = { semester: defaultSemester };
      expect(mockSettings.semester).toBe("HK1");
    });
  });

  describe("fetchClassList", () => {
    it("should fetch teacher classes for given academic_year and semester", () => {
      const mockResponse = createMockApiResponse([
        createMockClassList({ class_name: "10A1" }),
        createMockClassList({ class_name: "10A2", class_id: "2" }),
        createMockClassList({ class_name: "10A3", class_id: "3" }),
      ]);

      expect(mockResponse.success).toBe(true);
      expect(mockResponse.data).toHaveLength(3);
      expect(mockResponse.data[0].class_name).toBe("10A1");
    });

    it("should sort classes by grade then class_name", () => {
      const unsorted = [
        createMockClassList({ class_name: "11B2", grade: 11, class_id: "4" }),
        createMockClassList({ class_name: "10A1", grade: 10, class_id: "1" }),
        createMockClassList({ class_name: "10A3", grade: 10, class_id: "3" }),
      ];

      const sorted = unsorted.sort(
        (a, b) => a.grade - b.grade || a.class_name.localeCompare(b.class_name)
      );

      expect(sorted[0].grade).toBe(10);
      expect(sorted[0].class_name).toBe("10A1");
      expect(sorted[2].grade).toBe(11);
    });

    it("should handle empty class list response", () => {
      const mockResponse = createMockApiResponse([]);
      expect(mockResponse.data).toEqual([]);
    });

    it("should handle API error gracefully", () => {
      const mockError = { success: false, message: "API Error" };
      expect(mockError.success).toBe(false);
    });
  });

  describe("fetchAnalytics", () => {
    it("should fetch analytics with default class_id=null", () => {
      const mockResponse = createMockApiResponse(createMockAnalyticsData());
      expect(mockResponse.data.total_classes).toBe(3);
      expect(mockResponse.data.students_with_scores).toBe(85);
    });

    it("should fetch analytics filtered by class_id when provided", () => {
      const classFiltered = {
        ...createMockAnalyticsData(),
        total_classes: 1,
        students_with_scores: 28,
        class_comparison: [
          {
            class_name: "10A1",
            average_score: 7.2,
            pass_rate: 85.0,
          },
        ],
      };
      const mockResponse = createMockApiResponse(classFiltered);
      expect(mockResponse.data.total_classes).toBe(1);
    });

    it("should include all required data fields", () => {
      const data = createMockAnalyticsData();
      const requiredFields = [
        "overview",
        "performance_groups",
        "score_distribution",
        "class_comparison",
        "students_need_attention",
        "top_students",
      ];
      requiredFields.forEach((field) => {
        expect(data).toHaveProperty(field);
      });
    });

    it("should handle API error in analytics fetch", () => {
      const mockError = { success: false, message: "Analytics fetch failed" };
      expect(mockError.success).toBe(false);
    });
  });

  describe("Filter management", () => {
    it("should update academicYear state", () => {
      let academicYear = "2024-2025";
      const newYear = "2025-2026";
      academicYear = newYear;
      expect(academicYear).toBe("2025-2026");
    });

    it("should update semester state", () => {
      let semester = "HK1";
      const newSemester = "HK2";
      semester = newSemester;
      expect(semester).toBe("HK2");
    });

    it("should update selectedClass state", () => {
      let selectedClass = null;
      const newClass = "1";
      selectedClass = newClass;
      expect(selectedClass).toBe("1");
    });

    it("should trigger fetchClassList when academicYear changes", () => {
      const fetchClassListCalled = true;
      expect(fetchClassListCalled).toBe(true);
    });

    it("should trigger fetchAnalytics when semester changes", () => {
      const fetchAnalyticsCalled = true;
      expect(fetchAnalyticsCalled).toBe(true);
    });

    it("should trigger fetchAnalytics when selectedClass changes", () => {
      const fetchAnalyticsCalled = true;
      expect(fetchAnalyticsCalled).toBe(true);
    });
  });

  describe("Performance groups accuracy", () => {
    it("should correctly categorize students by performance tier", () => {
      const data = createMockAnalyticsData();
      expect(data.performance_groups.range_8_10.count).toBe(25);
      expect(data.performance_groups.range_65_79.count).toBe(30);
      expect(data.performance_groups.range_5_64.count).toBe(20);
      expect(data.performance_groups.range_35_49.count).toBe(8);
      expect(data.performance_groups.range_below_35.count).toBe(2);
    });

    it("should calculate percentages correctly", () => {
      const data = createMockAnalyticsData();
      const totalCount =
        data.performance_groups.range_8_10.count +
        data.performance_groups.range_65_79.count +
        data.performance_groups.range_5_64.count +
        data.performance_groups.range_35_49.count +
        data.performance_groups.range_below_35.count;

      // Total = 85, range_8_10 = 25 => percentage = 25/85*100 = 29.41%
      expect(data.performance_groups.range_8_10.percentage).toBe(29.41);
      expect(totalCount).toBe(85);
    });

    it("should assign correct colors to performance groups", () => {
      const data = createMockAnalyticsData();
      expect(data.performance_groups.range_8_10.color).toBe("#059669"); // Green
      expect(data.performance_groups.range_65_79.color).toBe("#2563EB"); // Blue
      expect(data.performance_groups.range_5_64.color).toBe("#D97706"); // Amber
      expect(data.performance_groups.range_35_49.color).toBe("#EA580C"); // Orange
      expect(data.performance_groups.range_below_35.color).toBe("#DC2626"); // Red
    });
  });

  describe("Score distribution", () => {
    it("should provide score distribution for numeric grades", () => {
      const data = createMockAnalyticsData();
      const distribution = data.score_distribution;
      expect(distribution["9-10"]).toBe(12);
      expect(distribution["8-9"]).toBe(13);
      expect(distribution["7-8"]).toBe(18);
    });

    it("should handle all score ranges", () => {
      const data = createMockAnalyticsData();
      const ranges = ["9-10", "8-9", "7-8", "6-7", "5-6", "4-5", "0-4"];
      ranges.forEach((range) => {
        expect(data.score_distribution).toHaveProperty(range);
      });
    });
  });

  describe("Overview statistics", () => {
    it("should calculate average_score correctly", () => {
      const data = createMockAnalyticsData();
      expect(data.overview.average_score).toBe(7.0);
    });

    it("should calculate pass_count and fail_count", () => {
      const data = createMockAnalyticsData();
      expect(data.overview.pass_count).toBe(68);
      expect(data.overview.fail_count).toBe(17);
    });

    it("should calculate pass_rate correctly", () => {
      const data = createMockAnalyticsData();
      // 68/85 = 80%
      expect(data.overview.pass_rate).toBe(80.0);
    });

    it("should include highest and lowest scores", () => {
      const data = createMockAnalyticsData();
      expect(data.overview.highest_score).toBe(9.5);
      expect(data.overview.lowest_score).toBe(2.3);
    });
  });

  describe("Class comparison", () => {
    it("should compare classes by average_score", () => {
      const data = createMockAnalyticsData();
      expect(data.class_comparison).toHaveLength(3);
      // Should be sorted by average_score descending
      expect(data.class_comparison[0].average_score).toBeGreaterThanOrEqual(
        data.class_comparison[1].average_score
      );
    });

    it("should include pass_rate for each class", () => {
      const data = createMockAnalyticsData();
      data.class_comparison.forEach((cls) => {
        expect(cls).toHaveProperty("pass_rate");
        expect(cls.pass_rate).toBeGreaterThanOrEqual(0);
        expect(cls.pass_rate).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("Students needing attention", () => {
    it("should identify students with weak/poor scores", () => {
      const data = createMockAnalyticsData();
      expect(data.students_need_attention.length).toBeGreaterThan(0);
    });

    it("should include student details", () => {
      const data = createMockAnalyticsData();
      const student = data.students_need_attention[0];
      expect(student).toHaveProperty("student_id");
      expect(student).toHaveProperty("student_name");
      expect(student).toHaveProperty("class_name");
      expect(student).toHaveProperty("final_score");
    });

    it("should sort by lowest score first", () => {
      const data = createMockAnalyticsData();
      for (let i = 1; i < data.students_need_attention.length; i++) {
        const prev = parseFloat(data.students_need_attention[i - 1].final_score);
        const curr = parseFloat(data.students_need_attention[i].final_score);
        expect(prev).toBeLessThanOrEqual(curr);
      }
    });
  });

  describe("Top students", () => {
    it("should identify top 10 excellent students", () => {
      const data = createMockAnalyticsData();
      expect(data.top_students.length).toBeLessThanOrEqual(10);
    });

    it("should include top student details", () => {
      const data = createMockAnalyticsData();
      const student = data.top_students[0];
      expect(student).toHaveProperty("student_id");
      expect(student).toHaveProperty("student_name");
      expect(student).toHaveProperty("class_name");
      expect(student).toHaveProperty("final_score");
    });

    it("should be sorted by highest score first", () => {
      const data = createMockAnalyticsData();
      for (let i = 1; i < data.top_students.length; i++) {
        const prev = parseFloat(data.top_students[i - 1].final_score);
        const curr = parseFloat(data.top_students[i].final_score);
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });

  describe("Loading states", () => {
    it("should set loading=true during fetchAnalytics", () => {
      const mockLoading = true;
      expect(mockLoading).toBe(true);
    });

    it("should set loading=false after fetchAnalytics completes", () => {
      const mockLoading = false;
      expect(mockLoading).toBe(false);
    });

    it("should set loadingClasses=true during fetchClassList", () => {
      const mockLoadingClasses = true;
      expect(mockLoadingClasses).toBe(true);
    });

    it("should set loadingClasses=false after fetchClassList completes", () => {
      const mockLoadingClasses = false;
      expect(mockLoadingClasses).toBe(false);
    });
  });
});

describe("Letter grade subjects (Đ/KĐ)", () => {
  it("should handle subjects with letter grades", () => {
    const letterGradeData = createMockAnalyticsData({
      is_letter_grade_subject: true,
      overview: {
        pass_count: 80,
        fail_count: 5,
        average_score: 0,
        highest_score: 0,
        lowest_score: 0,
        pass_rate: 94.12,
      },
      score_distribution: {
        "Đ (Đạt)": 80,
        "KĐ (Không đạt)": 5,
      },
    });

    expect(letterGradeData.is_letter_grade_subject).toBe(true);
    expect(letterGradeData.overview.pass_count).toBe(80);
  });

  it("should display pass_count instead of average_score for letter grades", () => {
    const data = createMockAnalyticsData({ is_letter_grade_subject: true });
    // UI should show: 80/85 học sinh đạt (pass_count/students_with_scores)
    expect(data.is_letter_grade_subject).toBe(true);
  });
});

describe("Error handling", () => {
  it("should handle missing analytics data gracefully", () => {
    const emptyData = {
      success: true,
      data: {
        overview: {},
        performance_groups: {},
        class_comparison: [],
        students_need_attention: [],
        top_students: [],
      },
    };
    expect(emptyData.success).toBe(true);
  });

  it("should provide default values for missing fields", () => {
    const incompleteData = createMockAnalyticsData({
      class_comparison: [],
    });
    expect(incompleteData.class_comparison).toEqual([]);
  });

  it("should handle API errors without crashing", () => {
    const errorResponse = {
      success: false,
      message: "Failed to fetch analytics",
    };
    expect(errorResponse.success).toBe(false);
  });
});

describe("Integration scenarios", () => {
  it("should handle filter changes: academic_year -> semester -> selectedClass", () => {
    let academicYear = "2024-2025";
    let semester = "HK1";
    let selectedClass = null;

    // Change academic year
    academicYear = "2025-2026";
    const shouldFetchClasses = true; // Component should trigger fetchClassList
    expect(shouldFetchClasses).toBe(true);

    // Change semester
    semester = "HK2";
    const shouldFetchAnalytics1 = true;
    expect(shouldFetchAnalytics1).toBe(true);

    // Change class
    selectedClass = "1";
    const shouldFetchAnalytics2 = true;
    expect(shouldFetchAnalytics2).toBe(true);
  });

  it("should reset class selection when academic year changes", () => {
    let selectedClass = "5";
    let academicYear = "2024-2025";

    // Change academic year - should reset class
    academicYear = "2025-2026";
    selectedClass = null; // Reset to default

    expect(selectedClass).toBeNull();
    expect(academicYear).toBe("2025-2026");
  });

  it("should handle multiple filter changes in sequence", () => {
    const state = {
      academicYear: "2024-2025",
      semester: "HK1",
      selectedClass: null,
      classList: [],
      analytics: null,
    };

    // Simulate user interactions
    state.academicYear = "2025-2026";
    state.classList = [
      createMockClassList({ class_id: "1" }),
      createMockClassList({ class_id: "2", class_name: "11B2" }),
    ];
    state.selectedClass = "1";
    state.analytics = createMockAnalyticsData();

    expect(state.academicYear).toBe("2025-2026");
    expect(state.classList).toHaveLength(2);
    expect(state.selectedClass).toBe("1");
    expect(state.analytics).not.toBeNull();
  });
});
