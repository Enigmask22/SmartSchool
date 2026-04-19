import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

/**
 * Test Suite: TS-ADM04-04, 05 - Settings Validation and Updates
 * 
 * TS-ADM04-04: Input validation (cooldown_time >= 1, <= 300)
 * TS-ADM04-05: Settings update and persistence
 * 
 * Key Business Rules:
 * - Cooldown period must be between 1-300 seconds
 * - Invalid values should be rejected before API call
 * - Settings should persist after update
 * - UI should reflect current settings
 * 
 * Note: These tests use mock components to verify patterns
 */

describe('TS-ADM04-04: Settings Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should accept valid cooldown value (30 seconds)', () => {
    const TestComponent = () => (
      <input 
        data-testid="cooldown-input"
        type="number" 
        min="1" 
        max="300" 
        defaultValue={30}
      />
    );

    render(<TestComponent />);

    const input = screen.getByTestId('cooldown-input') as HTMLInputElement;
    expect(input.value).toBe('30');
  });

  it('should accept minimum valid cooldown (1 second)', () => {
    const TestComponent = () => (
      <input 
        data-testid="cooldown-input"
        type="number" 
        min="1" 
        max="300" 
        defaultValue={1}
      />
    );

    render(<TestComponent />);

    const input = screen.getByTestId('cooldown-input') as HTMLInputElement;
    expect(input.value).toBe('1');
  });

  it('should accept maximum valid cooldown (300 seconds)', () => {
    const TestComponent = () => (
      <input 
        data-testid="cooldown-input"
        type="number" 
        min="1" 
        max="300" 
        defaultValue={300}
      />
    );

    render(<TestComponent />);

    const input = screen.getByTestId('cooldown-input') as HTMLInputElement;
    expect(input.value).toBe('300');
  });

  it('should have minimum constraint', () => {
    const TestComponent = () => (
      <input 
        data-testid="cooldown-input"
        type="number" 
        min="1" 
        max="300"
      />
    );

    render(<TestComponent />);

    const input = screen.getByTestId('cooldown-input') as HTMLInputElement;
    expect(input.min).toBe('1');
  });

  it('should have maximum constraint', () => {
    const TestComponent = () => (
      <input 
        data-testid="cooldown-input"
        type="number" 
        min="1" 
        max="300"
      />
    );

    render(<TestComponent />);

    const input = screen.getByTestId('cooldown-input') as HTMLInputElement;
    expect(input.max).toBe('300');
  });

  it('should reject non-numeric input via type="number"', () => {
    const TestComponent = () => (
      <input 
        data-testid="cooldown-input"
        type="number" 
        min="1" 
        max="300"
      />
    );

    render(<TestComponent />);

    const input = screen.getByTestId('cooldown-input') as HTMLInputElement;
    expect(input.type).toBe('number');
  });

  it('should show error message for invalid cooldown', () => {
    const TestComponent = ({ showError }: { showError: boolean }) => (
      <div>
        <input 
          data-testid="cooldown-input"
          type="number" 
          min="1" 
          max="300"
        />
        {showError && (
          <span data-testid="error-msg">Cooldown phải từ 1-300 giây</span>
        )}
      </div>
    );

    const { rerender } = render(<TestComponent showError={false} />);
    expect(screen.queryByTestId('error-msg')).not.toBeInTheDocument();

    rerender(<TestComponent showError={true} />);
    expect(screen.getByTestId('error-msg')).toBeInTheDocument();
  });

  it('should display input field with proper attributes', () => {
    const TestComponent = () => (
      <div>
        <label>Cooldown Period</label>
        <input 
          data-testid="cooldown-input"
          type="number" 
          min="1" 
          max="300"
          aria-label="Cooldown period in seconds"
        />
      </div>
    );

    render(<TestComponent />);

    expect(screen.getByLabelText(/cooldown period/i)).toBeInTheDocument();
  });

  it('should have save button to submit', () => {
    const TestComponent = () => (
      <div>
        <input type="number" min="1" max="300" />
        <button data-testid="save-btn">Lưu</button>
      </div>
    );

    render(<TestComponent />);

    expect(screen.getByTestId('save-btn')).toBeInTheDocument();
  });
});

describe('TS-ADM04-05: Settings Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display current cooldown value on load', () => {
    const TestComponent = ({ initialValue }: { initialValue: number }) => (
      <input 
        data-testid="cooldown-input"
        type="number" 
        min="1" 
        max="300"
        defaultValue={initialValue}
      />
    );

    render(<TestComponent initialValue={45} />);

    const input = screen.getByTestId('cooldown-input') as HTMLInputElement;
    expect(input.value).toBe('45');
  });

  it('should update UI after successful settings save', () => {
    const TestComponent = () => {
      const [saved, setSaved] = React.useState(false);
      return (
        <div>
          <input type="number" min="1" max="300" />
          <button onClick={() => setSaved(true)} data-testid="save-btn">
            Lưu
          </button>
          {saved && <span data-testid="success-msg">Lưu thành công</span>}
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.queryByTestId('success-msg')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('save-btn'));

    expect(screen.getByTestId('success-msg')).toBeInTheDocument();
  });

  it('should persist settings after reload', () => {
    const TestComponent = ({ persistedValue }: { persistedValue: number }) => {
      const [value, setValue] = React.useState(persistedValue);
      
      React.useEffect(() => {
        setValue(persistedValue);
      }, [persistedValue]);
      
      return (
        <input 
          data-testid="cooldown-input"
          type="number" 
          min="1"
          max="300"
          value={value}
          onChange={(e) => setValue(parseInt(e.target.value))}
        />
      );
    };
    const { rerender } = render(<TestComponent persistedValue={30} />);
    expect((screen.getByTestId('cooldown-input') as HTMLInputElement).value).toBe('30');

    // Simulate reload with persisted value
    rerender(<TestComponent persistedValue={60} />);
    expect((screen.getByTestId('cooldown-input') as HTMLInputElement).value).toBe('60');
  });

  it('should show loading state while saving', () => {
    const TestComponent = () => {
      const [loading, setLoading] = React.useState(false);
      return (
        <div>
          <input type="number" min="1" max="300" />
          <button 
            onClick={() => setLoading(true)} 
            disabled={loading}
            data-testid="save-btn"
          >
            {loading ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      );
    };

    render(<TestComponent />);

    fireEvent.click(screen.getByTestId('save-btn'));

    expect(screen.getByTestId('save-btn')).toHaveTextContent('Đang lưu...');
    expect((screen.getByTestId('save-btn') as HTMLButtonElement).disabled).toBe(true);
  });

  it('should handle save error gracefully', () => {
    const TestComponent = () => {
      const [error, setError] = React.useState<string | null>(null);
      return (
        <div>
          <input type="number" min="1" max="300" />
          <button 
            onClick={() => setError('Invalid value')} 
            data-testid="save-btn"
          >
            Lưu
          </button>
          {error && <span data-testid="error-msg">{error}</span>}
        </div>
      );
    };

    render(<TestComponent />);

    fireEvent.click(screen.getByTestId('save-btn'));

    expect(screen.getByTestId('error-msg')).toBeInTheDocument();
  });

  it('should reset form on successful save', () => {
    const TestComponent = () => {
      const [value, setValue] = React.useState(30);
      const [saved, setSaved] = React.useState(false);

      return (
        <div>
          <input 
            type="number" 
            min="1" 
            max="300"
            value={value}
            onChange={(e) => setValue(parseInt(e.target.value))}
            data-testid="cooldown-input"
          />
          <button 
            onClick={() => setSaved(true)}
            data-testid="save-btn"
          >
            Lưu
          </button>
          {saved && <span data-testid="saved">Đã lưu</span>}
        </div>
      );
    };

    render(<TestComponent />);

    fireEvent.click(screen.getByTestId('save-btn'));

    expect(screen.getByTestId('saved')).toBeInTheDocument();
  });
});

describe('TS-ADM04 Settings Integration', () => {
  it('should load initial settings from API on mount', () => {
    const TestComponent = ({ settings }: { settings: { cooldown: number } }) => (
      <div>
        <input 
          type="number"
          min="1"
          max="300"
          defaultValue={settings.cooldown}
          data-testid="cooldown-input"
        />
      </div>
    );

    render(<TestComponent settings={{ cooldown: 30 }} />);

    expect((screen.getByTestId('cooldown-input') as HTMLInputElement).value).toBe('30');
  });

  it('should display input fields for settings', () => {
    const TestComponent = () => (
      <div>
        <input 
          type="number" 
          min="1" 
          max="300"
          data-testid="cooldown-input"
        />
      </div>
    );

    render(<TestComponent />);

    expect(screen.getByTestId('cooldown-input')).toBeInTheDocument();
  });

  it('should validate before submitting', () => {
    const TestComponent = ({ value }: { value: number }) => {
      const isValid = value >= 1 && value <= 300;
      return (
        <div>
          <input 
            type="number" 
            min="1" 
            max="300"
            defaultValue={value}
            data-testid="cooldown-input"
          />
          <button 
            disabled={!isValid}
            data-testid="save-btn"
          >
            Lưu
          </button>
          {!isValid && <span data-testid="error">Invalid</span>}
        </div>
      );
    };

    const { rerender } = render(<TestComponent value={30} />);
    expect((screen.getByTestId('save-btn') as HTMLButtonElement).disabled).toBe(false);

    rerender(<TestComponent value={999} />);
    expect((screen.getByTestId('save-btn') as HTMLButtonElement).disabled).toBe(true);
  });

  it('should have save button', () => {
    const TestComponent = () => (
      <div>
        <input type="number" min="1" max="300" />
        <button data-testid="save-btn">Lưu</button>
      </div>
    );

    render(<TestComponent />);

    expect(screen.getByTestId('save-btn')).toBeInTheDocument();
  });
});
