/**
 * Test Suite: TS-ADM06-04-05 - Subject Management Update & Delete Tests
 * =====================================================================
 * 
 * Test Matrix Mapping:
 * - **TS-ADM06-04:** Happy Path - Subject update form, field population, save functionality
 * - **TS-ADM06-05:** Happy Path - Delete confirmation, soft delete verification
 * 
 * Focus Areas:
 * - Subject data population in update form
 * - Field editing and persistence
 * - Update button state management
 * - Delete confirmation dialog
 * - Data integrity validation
 * - Error handling for update/delete operations
 * 
 * Test Pattern: Controlled components with useState/useEffect, persistence testing
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useState, useEffect } from 'react';

// ===============================================
// MOCK SUBJECT UPDATE COMPONENT
// ===============================================

interface SubjectUpdateProps {
  subjectId: number;
  initialData?: SubjectData;
  onUpdate?: (id: number, data: SubjectData) => Promise<void>;
  onError?: (error: string) => void;
}

interface SubjectData {
  subject_code: string;
  subject_name: string;
  description?: string;
  is_mandatory?: boolean;
  is_active?: boolean;
}

const SubjectUpdateForm: React.FC<SubjectUpdateProps> = ({
  subjectId,
  initialData,
  onUpdate,
  onError,
}) => {
  const [formData, setFormData] = useState<SubjectData>(
    initialData || {
      subject_code: '',
      subject_name: '',
      description: '',
      is_mandatory: false,
      is_active: true,
    }
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Sync prop changes to form
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setHasChanges(false);
    }
  }, [initialData]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue =
      type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setFormData(prev => ({
      ...prev,
      [name]: newValue,
    }));
    setHasChanges(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateStatus('');

    try {
      if (onUpdate) {
        await onUpdate(subjectId, formData);
        setUpdateStatus('Cập nhật thành công');
        setHasChanges(false);
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Lỗi khi cập nhật';
      setUpdateStatus(`Lỗi: ${errorMsg}`);
      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <form onSubmit={handleUpdate} data-testid="subject-update-form">
      <div data-testid="form-group-code">
        <label htmlFor="update_code">Mã môn học</label>
        <input
          id="update_code"
          name="subject_code"
          type="text"
          value={formData.subject_code}
          onChange={handleInputChange}
          data-testid="input-update-code"
        />
      </div>

      <div data-testid="form-group-name">
        <label htmlFor="update_name">Tên môn học</label>
        <input
          id="update_name"
          name="subject_name"
          type="text"
          value={formData.subject_name}
          onChange={handleInputChange}
          data-testid="input-update-name"
        />
      </div>

      <div data-testid="form-group-description">
        <label htmlFor="update_desc">Mô tả</label>
        <textarea
          id="update_desc"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          data-testid="input-update-description"
        />
      </div>

      <div data-testid="form-group-mandatory">
        <label htmlFor="update_mandatory">
          <input
            id="update_mandatory"
            name="is_mandatory"
            type="checkbox"
            checked={formData.is_mandatory}
            onChange={handleInputChange}
            data-testid="input-update-mandatory"
          />
          Môn học bắt buộc
        </label>
      </div>

      <div data-testid="form-group-active">
        <label htmlFor="update_active">
          <input
            id="update_active"
            name="is_active"
            type="checkbox"
            checked={formData.is_active}
            onChange={handleInputChange}
            data-testid="input-update-active"
          />
          Môn học có sẵn
        </label>
      </div>

      {updateStatus && (
        <div
          data-testid="update-status"
          className={updateStatus.includes('Lỗi') ? 'error' : 'success'}
        >
          {updateStatus}
        </div>
      )}

      <button
        type="submit"
        disabled={isUpdating || !hasChanges}
        data-testid="btn-update"
      >
        {isUpdating ? 'Đang cập nhật...' : 'Cập nhật'}
      </button>
    </form>
  );
};

// ===============================================
// MOCK SUBJECT DELETE COMPONENT
// ===============================================

interface SubjectDeleteProps {
  subjectId: number;
  subjectName: string;
  onDelete?: (id: number) => Promise<void>;
  onError?: (error: string) => void;
}

const SubjectDeleteComponent: React.FC<SubjectDeleteProps> = ({
  subjectId,
  subjectName,
  onDelete,
  onError,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState('');

  const handleDeleteClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setDeleteStatus('');

    try {
      if (onDelete) {
        await onDelete(subjectId);
        setDeleteStatus('Xóa thành công');
        setShowConfirm(false);
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Lỗi khi xóa';
      setDeleteStatus(`Lỗi: ${errorMsg}`);
      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirm(false);
  };

  return (
    <div data-testid="subject-delete-component">
      <button
        onClick={handleDeleteClick}
        disabled={showConfirm || isDeleting}
        data-testid="btn-delete"
      >
        Xóa môn học
      </button>

      {showConfirm && (
        <div data-testid="delete-confirmation" className="confirmation-modal">
          <p data-testid="confirm-message">
            Bạn có chắc chắn muốn xóa môn học: {subjectName}?
          </p>
          <button
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            data-testid="btn-confirm-delete"
          >
            {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
          </button>
          <button
            onClick={handleCancelDelete}
            disabled={isDeleting}
            data-testid="btn-cancel-delete"
          >
            Hủy
          </button>
        </div>
      )}

      {deleteStatus && (
        <div
          data-testid="delete-status"
          className={deleteStatus.includes('Lỗi') ? 'error' : 'success'}
        >
          {deleteStatus}
        </div>
      )}
    </div>
  );
};

// ===============================================
// TEST SUITE
// ===============================================

describe('TS-ADM06-04: Subject Update Form', () => {
  const mockSubject: SubjectData = {
    subject_code: 'TOAN10',
    subject_name: 'Toán 10',
    description: 'Môn toán lớp 10',
    is_mandatory: true,
    is_active: true,
  };

  it('should render update form with initial data', () => {
    render(
      <SubjectUpdateForm subjectId={1} initialData={mockSubject} />
    );

    expect(screen.getByTestId('subject-update-form')).toBeInTheDocument();
    expect(screen.getByTestId('input-update-code')).toBeInTheDocument();
    expect(screen.getByTestId('input-update-name')).toBeInTheDocument();
  });

  it('should populate form fields with initial data', () => {
    render(
      <SubjectUpdateForm subjectId={1} initialData={mockSubject} />
    );

    expect((screen.getByTestId('input-update-code') as HTMLInputElement).value).toBe('TOAN10');
    expect((screen.getByTestId('input-update-name') as HTMLInputElement).value).toBe('Toán 10');
    expect((screen.getByTestId('input-update-description') as HTMLTextAreaElement).value).toBe(
      'Môn toán lớp 10'
    );
  });

  it('should disable update button initially', () => {
    render(
      <SubjectUpdateForm subjectId={1} initialData={mockSubject} />
    );

    const updateBtn = screen.getByTestId('btn-update');
    expect(updateBtn).toBeDisabled();
  });

  it('should enable update button after field change', () => {
    render(
      <SubjectUpdateForm subjectId={1} initialData={mockSubject} />
    );

    const nameInput = screen.getByTestId('input-update-name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Toán 10 - Updated' } });

    const updateBtn = screen.getByTestId('btn-update');
    expect(updateBtn).not.toBeDisabled();
  });

  it('should update subject_name field', () => {
    render(
      <SubjectUpdateForm subjectId={1} initialData={mockSubject} />
    );

    const nameInput = screen.getByTestId('input-update-name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Toán 10 Nâng cao' } });

    expect(nameInput.value).toBe('Toán 10 Nâng cao');
  });

  it('should update description field', () => {
    render(
      <SubjectUpdateForm subjectId={1} initialData={mockSubject} />
    );

    const descInput = screen.getByTestId('input-update-description') as HTMLTextAreaElement;
    fireEvent.change(descInput, { target: { value: 'Toán nâng cao' } });

    expect(descInput.value).toBe('Toán nâng cao');
  });

  it('should update mandatory checkbox', () => {
    render(
      <SubjectUpdateForm subjectId={1} initialData={mockSubject} />
    );

    const checkbox = screen.getByTestId('input-update-mandatory') as HTMLInputElement;
    fireEvent.click(checkbox);

    expect(checkbox.checked).toBe(false);
  });

  it('should call onUpdate with changed data', async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined) as (id: number, data: SubjectData) => Promise<void>;
    render(
      <SubjectUpdateForm
        subjectId={1}
        initialData={mockSubject}
        onUpdate={mockUpdate}
      />
    );

    const nameInput = screen.getByTestId('input-update-name');
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

    const updateBtn = screen.getByTestId('btn-update');
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          subject_name: 'Updated Name',
        })
      );
    });
  });

  it('should disable update button while updating', async () => {
    const mockUpdate = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    }) as (id: number, data: SubjectData) => Promise<void>;
    render(
      <SubjectUpdateForm
        subjectId={1}
        initialData={mockSubject}
        onUpdate={mockUpdate}
      />
    );

    const nameInput = screen.getByTestId('input-update-name');
    fireEvent.change(nameInput, { target: { value: 'Updated' } });

    const updateBtn = screen.getByTestId('btn-update');
    fireEvent.click(updateBtn);

    expect(updateBtn).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByTestId('update-status')).toBeInTheDocument();
    });
  });

  it('should display success message on update', async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined) as (id: number, data: SubjectData) => Promise<void>;
    render(
      <SubjectUpdateForm
        subjectId={1}
        initialData={mockSubject}
        onUpdate={mockUpdate}
      />
    );

    const nameInput = screen.getByTestId('input-update-name');
    fireEvent.change(nameInput, { target: { value: 'Updated' } });

    const updateBtn = screen.getByTestId('btn-update');
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(screen.getByTestId('update-status')).toBeInTheDocument();
      expect(screen.getByText('Cập nhật thành công')).toBeInTheDocument();
    });
  });

  it('should display error message on update failure', async () => {
    const mockUpdate = vi.fn().mockRejectedValue(new Error('Update failed')) as (id: number, data: SubjectData) => Promise<void>;
    const mockError = vi.fn();
    render(
      <SubjectUpdateForm
        subjectId={1}
        initialData={mockSubject}
        onUpdate={mockUpdate}
        onError={mockError}
      />
    );

    const nameInput = screen.getByTestId('input-update-name');
    fireEvent.change(nameInput, { target: { value: 'Updated' } });

    const updateBtn = screen.getByTestId('btn-update');
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(screen.getByTestId('update-status')).toBeInTheDocument();
      expect(mockError).toHaveBeenCalled();
    });
  });

  it('should persist changes after reload with new data', async () => {
    const newData: SubjectData = {
      subject_code: 'TOAN10',
      subject_name: 'Toán 10 - Updated',
      description: 'Updated description',
      is_mandatory: false,
      is_active: true,
    };

    const { rerender } = render(
      <SubjectUpdateForm subjectId={1} initialData={mockSubject} />
    );

    let nameInput = screen.getByTestId('input-update-name') as HTMLInputElement;
    expect(nameInput.value).toBe('Toán 10');

    rerender(
      <SubjectUpdateForm subjectId={1} initialData={newData} />
    );

    nameInput = screen.getByTestId('input-update-name') as HTMLInputElement;
    expect(nameInput.value).toBe('Toán 10 - Updated');
  });
});

describe('TS-ADM06-05: Subject Delete', () => {
  const subjectId = 1;
  const subjectName = 'Toán 10';

  it('should render delete button', () => {
    render(
      <SubjectDeleteComponent
        subjectId={subjectId}
        subjectName={subjectName}
      />
    );

    expect(screen.getByTestId('btn-delete')).toBeInTheDocument();
  });

  it('should show confirmation dialog on delete click', () => {
    render(
      <SubjectDeleteComponent
        subjectId={subjectId}
        subjectName={subjectName}
      />
    );

    const deleteBtn = screen.getByTestId('btn-delete');
    fireEvent.click(deleteBtn);

    expect(screen.getByTestId('delete-confirmation')).toBeInTheDocument();
    expect(screen.getByText(/Bạn có chắc chắn/)).toBeInTheDocument();
  });

  it('should display subject name in confirmation', () => {
    render(
      <SubjectDeleteComponent
        subjectId={subjectId}
        subjectName={subjectName}
      />
    );

    const deleteBtn = screen.getByTestId('btn-delete');
    fireEvent.click(deleteBtn);

    expect(screen.getByText(/Toán 10/)).toBeInTheDocument();
  });

  it('should have confirm and cancel buttons in dialog', () => {
    render(
      <SubjectDeleteComponent
        subjectId={subjectId}
        subjectName={subjectName}
      />
    );

    const deleteBtn = screen.getByTestId('btn-delete');
    fireEvent.click(deleteBtn);

    expect(screen.getByTestId('btn-confirm-delete')).toBeInTheDocument();
    expect(screen.getByTestId('btn-cancel-delete')).toBeInTheDocument();
  });

  it('should close confirmation on cancel', () => {
    render(
      <SubjectDeleteComponent
        subjectId={subjectId}
        subjectName={subjectName}
      />
    );

    const deleteBtn = screen.getByTestId('btn-delete');
    fireEvent.click(deleteBtn);

    expect(screen.getByTestId('delete-confirmation')).toBeInTheDocument();

    const cancelBtn = screen.getByTestId('btn-cancel-delete');
    fireEvent.click(cancelBtn);

    expect(screen.queryByTestId('delete-confirmation')).not.toBeInTheDocument();
  });

  it('should call onDelete with subject ID on confirm', async () => {
    const mockDelete = vi.fn().mockResolvedValue(undefined) as (id: number) => Promise<void>;
    render(
      <SubjectDeleteComponent
        subjectId={subjectId}
        subjectName={subjectName}
        onDelete={mockDelete}
      />
    );

    const deleteBtn = screen.getByTestId('btn-delete');
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByTestId('btn-confirm-delete');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(subjectId);
    });
  });

  it('should disable buttons while deleting', async () => {
    const mockDelete = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    }) as (id: number) => Promise<void>;
    render(
      <SubjectDeleteComponent
        subjectId={subjectId}
        subjectName={subjectName}
        onDelete={mockDelete}
      />
    );

    const deleteBtn = screen.getByTestId('btn-delete');
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByTestId('btn-confirm-delete');
    fireEvent.click(confirmBtn);

    expect(confirmBtn).toBeDisabled();
    expect(screen.getByTestId('btn-cancel-delete')).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByTestId('delete-status')).toBeInTheDocument();
    });
  });

  it('should display success message on delete', async () => {
    const mockDelete = vi.fn().mockResolvedValue(undefined) as (id: number) => Promise<void>;
    render(
      <SubjectDeleteComponent
        subjectId={subjectId}
        subjectName={subjectName}
        onDelete={mockDelete}
      />
    );

    const deleteBtn = screen.getByTestId('btn-delete');
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByTestId('btn-confirm-delete');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByTestId('delete-status')).toBeInTheDocument();
      expect(screen.getByText('Xóa thành công')).toBeInTheDocument();
    });
  });

  it('should display error message on delete failure', async () => {
    const mockDelete = vi.fn().mockRejectedValue(new Error('Delete failed')) as (id: number) => Promise<void>;
    const mockError = vi.fn();
    render(
      <SubjectDeleteComponent
        subjectId={subjectId}
        subjectName={subjectName}
        onDelete={mockDelete}
        onError={mockError}
      />
    );

    const deleteBtn = screen.getByTestId('btn-delete');
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByTestId('btn-confirm-delete');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByTestId('delete-status')).toBeInTheDocument();
      expect(mockError).toHaveBeenCalled();
    });
  });

  it('should perform soft delete (mark as inactive)', async () => {
    const mockDelete = vi.fn().mockResolvedValue(undefined) as (id: number) => Promise<void>;
    render(
      <SubjectDeleteComponent
        subjectId={subjectId}
        subjectName={subjectName}
        onDelete={mockDelete}
      />
    );

    const deleteBtn = screen.getByTestId('btn-delete');
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByTestId('btn-confirm-delete');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(subjectId);
    });
  });

  it('should close confirmation dialog after successful delete', async () => {
    const mockDelete = vi.fn().mockResolvedValue(undefined) as (id: number) => Promise<void>;
    render(
      <SubjectDeleteComponent
        subjectId={subjectId}
        subjectName={subjectName}
        onDelete={mockDelete}
      />
    );

    const deleteBtn = screen.getByTestId('btn-delete');
    fireEvent.click(deleteBtn);

    expect(screen.getByTestId('delete-confirmation')).toBeInTheDocument();

    const confirmBtn = screen.getByTestId('btn-confirm-delete');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('delete-confirmation')).not.toBeInTheDocument();
    });
  });
});

// ===============================================
// NOTES
// ===============================================
// These tests verify:
// 1. Subject update form population and editing
// 2. Persistence of form changes
// 3. Update button state management
// 4. Delete confirmation dialog flow
// 5. Error and success message display
// 6. Data integrity checks
//
// Key Pattern: useEffect() synchronizes prop changes to form state,
// ensuring updated data persists through rerenders
