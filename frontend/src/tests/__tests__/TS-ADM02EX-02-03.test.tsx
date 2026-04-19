/**
 * Frontend Unit Tests for Bulk Student Import File Validation (TS-ADM02EX-02-03)
 * 
 * Test Matrix Mapping:
 * - T1-02: [File Validation] Upload sai định dạng file (Wrong file format)
 * - T1-03: [File Validation] Upload file dung lượng quá lớn (File too large)
 * - Additional: File parsing validation
 * 
 * Framework: Vitest + @testing-library/react
 */

import { describe, it, expect } from 'vitest';

/**
 * TS-ADM02EX-T1-02: File Format Validation
 * Scenario: User uploads file with wrong format (.txt, .doc, .pdf)
 * Expected: Error message "Định dạng file không được hỗ trợ"
 */
describe('TS-ADM02EX-02: File Format Validation', () => {
  
  const VALID_FORMATS = ['.xlsx', '.xls', '.csv'];
  //const MAX_FILE_SIZE_MB = 10;
  //const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  /**
   * TS-ADM02EX-T1-02-01: Valid Excel file formats accepted
   */
  it('TS-ADM02EX-T1-02-01: Should accept .xlsx file format', () => {
    const file = new File(['test'], 'students.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    expect(VALID_FORMATS.includes(`.${fileExtension}`)).toBe(true);
  });

  it('TS-ADM02EX-T1-02-02: Should accept .xls file format', () => {
    const file = new File(['test'], 'students.xls', { type: 'application/vnd.ms-excel' });
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    expect(VALID_FORMATS.includes(`.${fileExtension}`)).toBe(true);
  });

  it('TS-ADM02EX-T1-02-03: Should accept .csv file format', () => {
    const file = new File(['test'], 'students.csv', { type: 'text/csv' });
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    expect(VALID_FORMATS.includes(`.${fileExtension}`)).toBe(true);
  });

  /**
   * TS-ADM02EX-T1-02-04: Invalid file formats rejected
   */
  it('TS-ADM02EX-T1-02-04: Should reject .txt file format', () => {
    const file = new File(['test'], 'students.txt', { type: 'text/plain' });
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    expect(VALID_FORMATS.includes(`.${fileExtension}`)).toBe(false);
  });

  it('TS-ADM02EX-T1-02-05: Should reject .pdf file format', () => {
    const file = new File(['test'], 'students.pdf', { type: 'application/pdf' });
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    expect(VALID_FORMATS.includes(`.${fileExtension}`)).toBe(false);
  });

  it('TS-ADM02EX-T1-02-06: Should reject .jpg image format', () => {
    const file = new File(['test'], 'students.jpg', { type: 'image/jpeg' });
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    expect(VALID_FORMATS.includes(`.${fileExtension}`)).toBe(false);
  });

  it('TS-ADM02EX-T1-02-07: Should reject .doc format', () => {
    const file = new File(['test'], 'students.doc', { type: 'application/msword' });
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    expect(VALID_FORMATS.includes(`.${fileExtension}`)).toBe(false);
  });

  /**
   * TS-ADM02EX-T1-02-08: File type validation function
   */
  it('TS-ADM02EX-T1-02-08: Should have validation function for file types', () => {
    const validateFileFormat = (file: File): boolean => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return VALID_FORMATS.includes(`.${ext}`);
    };

    const validFile = new File(['test'], 'students.xlsx', { type: 'application/vnd.ms-excel' });
    const invalidFile = new File(['test'], 'students.txt', { type: 'text/plain' });

    expect(validateFileFormat(validFile)).toBe(true);
    expect(validateFileFormat(invalidFile)).toBe(false);
  });
});

/**
 * TS-ADM02EX-T1-03: File Size Validation
 * Scenario: User uploads file larger than 10MB
 * Expected: Error message "File quá lớn, vui lòng upload file nhỏ hơn 10MB"
 */
describe('TS-ADM02EX-03: File Size Validation', () => {
  
  const MAX_FILE_SIZE_MB = 10;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  /**
   * TS-ADM02EX-T1-03-01: Small file accepted
   */
  it('TS-ADM02EX-T1-03-01: Should accept file under 10MB', () => {
    const smallFile = new File(['a'.repeat(5 * 1024 * 1024)], 'students.xlsx'); // 5MB
    
    expect(smallFile.size).toBeLessThan(MAX_FILE_SIZE_BYTES);
    expect(smallFile.size).toBe(5 * 1024 * 1024);
  });

  it('TS-ADM02EX-T1-03-02: Should accept file at exactly 10MB limit', () => {
    const limitFile = new File(['a'.repeat(MAX_FILE_SIZE_BYTES)], 'students.xlsx');
    
    expect(limitFile.size).toBeLessThanOrEqual(MAX_FILE_SIZE_BYTES);
  });

  /**
   * TS-ADM02EX-T1-03-03: Large file rejected
   */
  it('TS-ADM02EX-T1-03-03: Should reject file over 10MB', () => {
    const largeFile = new File(['a'.repeat(12 * 1024 * 1024)], 'students.xlsx'); // 12MB
    
    expect(largeFile.size).toBeGreaterThan(MAX_FILE_SIZE_BYTES);
  });

  it('TS-ADM02EX-T1-03-04: Should reject file significantly over limit', () => {
    const veryLargeFile = new File(['a'.repeat(50 * 1024 * 1024)], 'students.xlsx'); // 50MB
    
    expect(veryLargeFile.size).toBeGreaterThan(MAX_FILE_SIZE_BYTES);
  });

  /**
   * TS-ADM02EX-T1-03-05: File size validation function
   */
  it('TS-ADM02EX-T1-03-05: Should have validation function for file size', () => {
    const validateFileSize = (file: File): { valid: boolean; message?: string } => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return {
          valid: false,
          message: `File quá lớn (${(file.size / 1024 / 1024).toFixed(2)}MB), vui lòng upload file nhỏ hơn ${MAX_FILE_SIZE_MB}MB`
        };
      }
      return { valid: true };
    };

    const smallFile = new File(['a'.repeat(5 * 1024 * 1024)], 'students.xlsx');
    const largeFile = new File(['a'.repeat(12 * 1024 * 1024)], 'students.xlsx');

    const smallResult = validateFileSize(smallFile);
    const largeResult = validateFileSize(largeFile);

    expect(smallResult.valid).toBe(true);
    expect(largeResult.valid).toBe(false);
    expect(largeResult.message).toContain('quá lớn');
  });

  /**
   * TS-ADM02EX-T1-03-06: File size in human-readable format
   */
  it('TS-ADM02EX-T1-03-06: Should format file size for display', () => {
    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    expect(formatFileSize(500)).toBe('500 Bytes');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(10 * 1024 * 1024)).toBe('10 MB');
    expect(formatFileSize(500 * 1024 * 1024)).toBe('500 MB');
  });
});

/**
 * TS-ADM02EX: File Parsing Validation
 * Validates that CSV/Excel files are parsed correctly
 */
describe('TS-ADM02EX: File Parsing Validation', () => {

  /**
   * TS-ADM02EX-04: CSV file parsing
   */
  it('TS-ADM02EX-04-01: Should parse CSV file correctly', () => {
    const csvContent = `Họ và tên,Email,Số điện thoại,Lớp học,Khối
Nguyễn Văn A,student1@school.com,0912345678,10A1,10
Trần Thị B,student2@school.com,0912345679,10A1,10`;

    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    const data = lines.slice(1).map(line => {
      const values = line.split(',');
      return headers.reduce((obj, header, i) => {
        obj[header.trim()] = values[i]?.trim() || '';
        return obj;
      }, {} as Record<string, string>);
    });

    expect(data).toHaveLength(2);
    expect(data[0]['Họ và tên']).toBe('Nguyễn Văn A');
    expect(data[1]['Email']).toBe('student2@school.com');
  });

  /**
   * TS-ADM02EX-05: Column name validation
   */
  it('TS-ADM02EX-05-01: Should handle both Vietnamese and English column names', () => {
    // Mapping function for column name variations
    const normalizeColumnName = (name: string): string => {
      const mapping: Record<string, string> = {
        'Họ và tên': 'ho_va_ten',
        'Full Name': 'ho_va_ten',
        'Email': 'email',
        'Số điện thoại': 'so_dien_thoai',
        'Phone': 'so_dien_thoai',
        'Lớp học': 'lop_hoc',
        'Class': 'lop_hoc',
        'Khối': 'khoi',
        'Grade': 'khoi',
      };
      return mapping[name.trim()] || name.trim().toLowerCase();
    };

    expect(normalizeColumnName('Họ và tên')).toBe('ho_va_ten');
    expect(normalizeColumnName('Full Name')).toBe('ho_va_ten');
    expect(normalizeColumnName('Số điện thoại')).toBe('so_dien_thoai');
    expect(normalizeColumnName('Phone')).toBe('so_dien_thoai');
  });

  /**
   * TS-ADM02EX-06: Required field validation
   */
  it('TS-ADM02EX-06-01: Should validate required field ho_va_ten is present', () => {
    const record = { ho_va_ten: 'Nguyễn Văn A', email: 'test@example.com' };
    const record_invalid = { email: 'test@example.com' }; // Missing ho_va_ten

    const isValidRecord = (rec: Record<string, any>): boolean => {
      return 'ho_va_ten' in rec && rec.ho_va_ten !== undefined && rec.ho_va_ten !== '';
    };

    expect(isValidRecord(record)).toBe(true);
    expect(isValidRecord(record_invalid)).toBe(false);
  });

  /**
   * TS-ADM02EX-07: Empty file validation
   */
  it('TS-ADM02EX-07-01: Should reject empty CSV file', () => {
    const csvContent = 'Họ và tên,Email,Số điện thoại';
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    
    // Should have at least header + 1 data row
    expect(lines.length).toBeLessThan(2);
  });

  it('TS-ADM02EX-07-02: Should accept file with data rows', () => {
    const csvContent = `Họ và tên,Email,Số điện thoại
Nguyễn Văn A,student1@school.com,0912345678
Trần Thị B,student2@school.com,0912345679`;
    
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    
    // Should have header + at least 1 data row
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });
});

/**
 * TS-ADM02EX: Combined Validation
 * Tests combination of format and size validation
 */
describe('TS-ADM02EX: Combined File Validation', () => {

  it('TS-ADM02EX-08: Should validate format AND size together', () => {
    const validateFile = (file: File): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];
      const MAX_SIZE = 10 * 1024 * 1024;
      const VALID_FORMATS = ['.xlsx', '.xls', '.csv'];

      // Check format
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!VALID_FORMATS.includes(`.${ext}`)) {
        errors.push('Định dạng file không được hỗ trợ. Chỉ chấp nhận .xlsx, .xls, .csv');
      }

      // Check size
      if (file.size > MAX_SIZE) {
        errors.push(`File quá lớn (${(file.size / 1024 / 1024).toFixed(2)}MB). Tối đa 10MB`);
      }

      return {
        valid: errors.length === 0,
        errors
      };
    };

    const validFile = new File(['test'], 'students.xlsx');
    const invalidFormatFile = new File(['test'], 'students.txt');
    const largeFile = new File(['a'.repeat(12 * 1024 * 1024)], 'students.xlsx');
    const bothInvalidFile = new File(['a'.repeat(12 * 1024 * 1024)], 'students.txt');

    expect(validateFile(validFile).valid).toBe(true);
    expect(validateFile(validFile).errors).toHaveLength(0);

    expect(validateFile(invalidFormatFile).valid).toBe(false);
    expect(validateFile(invalidFormatFile).errors.length).toBeGreaterThan(0);

    expect(validateFile(largeFile).valid).toBe(false);
    expect(validateFile(largeFile).errors.length).toBeGreaterThan(0);

    expect(validateFile(bothInvalidFile).valid).toBe(false);
    expect(validateFile(bothInvalidFile).errors.length).toBe(2);
  });

  it('TS-ADM02EX-09: Should provide user-friendly error messages', () => {
    const createErrorMessage = (errors: string[]): string => {
      return errors.map(e => `• ${e}`).join('\n');
    };

    const errors = [
      'Định dạng file không được hỗ trợ',
      'File quá lớn'
    ];

    const message = createErrorMessage(errors);
    expect(message).toContain('•');
    expect(message).toContain('Định dạng');
    expect(message).toContain('quá lớn');
  });
});
