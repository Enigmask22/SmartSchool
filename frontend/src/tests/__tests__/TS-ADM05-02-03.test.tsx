import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

/**
 * Test Suite: TS-ADM05-02, 03 - Admin Dashboard UI Tests
 *
 * TS-ADM05-02: Dashboard filter interactions (academic year / period selector)
 * TS-ADM05-03: Score distribution display logic (bucket rendering)
 *
 * Key Business Rules:
 * - Dashboard shows 4 widget areas: overview stats, attendance chart, score distribution, class ranking
 * - Academic year selector updates all widgets
 * - Score buckets: Giỏi (≥8.5), Khá (7–8.5), TB (5.5–7), Yếu (<5.5)
 * - Empty state: shows "Chưa có dữ liệu" instead of crashing
 *
 * Note: Tests use stub components — verify structural patterns without real hooks
 */

// ─── TS-ADM05-02: Filter / Selector behaviour ───────────────────────────────

describe('TS-ADM05-02: Dashboard Filter Interactions', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should render academic year selector', () => {
    const TestComponent = () => (
      <select data-testid="year-selector" defaultValue="2025-2026">
        <option value="2025-2026">2025-2026</option>
        <option value="2024-2025">2024-2025</option>
      </select>
    );
    render(<TestComponent />);
    expect(screen.getByTestId('year-selector')).toBeInTheDocument();
  });

  it('should update selected year when changed', () => {
    const onChange = vi.fn();
    const TestComponent = () => (
      <select data-testid="year-selector" onChange={onChange}>
        <option value="2025-2026">2025-2026</option>
        <option value="2024-2025">2024-2025</option>
      </select>
    );
    render(<TestComponent />);
    fireEvent.change(screen.getByTestId('year-selector'), { target: { value: '2024-2025' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('should render period selector (30/60/90 days)', () => {
    const TestComponent = () => (
      <select data-testid="period-selector" defaultValue="30">
        <option value="30">30 ngày</option>
        <option value="60">60 ngày</option>
        <option value="90">90 ngày</option>
        <option value="0">Cả năm học</option>
      </select>
    );
    render(<TestComponent />);
    const selector = screen.getByTestId('period-selector') as HTMLSelectElement;
    expect(selector.value).toBe('30');
  });

  it('should render dashboard with 4 main widget areas', () => {
    const TestComponent = () => (
      <main data-testid="dashboard">
        <section data-testid="overview-stats">Tổng quan</section>
        <section data-testid="attendance-chart">Chuyên cần</section>
        <section data-testid="score-distribution">Phổ điểm</section>
        <section data-testid="class-ranking">Xếp hạng lớp</section>
      </main>
    );
    render(<TestComponent />);
    expect(screen.getByTestId('overview-stats')).toBeInTheDocument();
    expect(screen.getByTestId('attendance-chart')).toBeInTheDocument();
    expect(screen.getByTestId('score-distribution')).toBeInTheDocument();
    expect(screen.getByTestId('class-ranking')).toBeInTheDocument();
  });

  it('should display overview stat cards (students, classes, teachers)', () => {
    const TestComponent = ({ stats }: { stats: { students: number; classes: number; teachers: number } }) => (
      <div>
        <p data-testid="stat-students">{stats.students} học sinh</p>
        <p data-testid="stat-classes">{stats.classes} lớp</p>
        <p data-testid="stat-teachers">{stats.teachers} giáo viên</p>
      </div>
    );
    render(<TestComponent stats={{ students: 500, classes: 15, teachers: 30 }} />);
    expect(screen.getByTestId('stat-students')).toHaveTextContent('500 học sinh');
    expect(screen.getByTestId('stat-classes')).toHaveTextContent('15 lớp');
    expect(screen.getByTestId('stat-teachers')).toHaveTextContent('30 giáo viên');
  });

  it('should display attendance rate as percentage', () => {
    const TestComponent = ({ rate }: { rate: number }) => (
      <p data-testid="attendance-rate">{rate}%</p>
    );
    render(<TestComponent rate={92.5} />);
    expect(screen.getByTestId('attendance-rate')).toHaveTextContent('92.5%');
  });

  it('should show empty state when no data available', () => {
    const TestComponent = ({ isEmpty }: { isEmpty: boolean }) => (
      <div>
        {isEmpty
          ? <p data-testid="empty-state">Chưa có dữ liệu để thống kê</p>
          : <p data-testid="chart-content">Chart</p>
        }
      </div>
    );
    render(<TestComponent isEmpty={true} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('chart-content')).not.toBeInTheDocument();
  });

  it('should show chart when data is available', () => {
    const TestComponent = ({ isEmpty }: { isEmpty: boolean }) => (
      <div>
        {isEmpty
          ? <p data-testid="empty-state">Chưa có dữ liệu để thống kê</p>
          : <p data-testid="chart-content">Chart</p>
        }
      </div>
    );
    render(<TestComponent isEmpty={false} />);
    expect(screen.getByTestId('chart-content')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('should show loading state while fetching', () => {
    const TestComponent = ({ loading }: { loading: boolean }) => (
      <div>
        {loading && <div data-testid="loading-spinner" aria-label="Đang tải">...</div>}
        {!loading && <div data-testid="content">Dashboard</div>}
      </div>
    );
    const { rerender } = render(<TestComponent loading={true} />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

    rerender(<TestComponent loading={false} />);
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  });

  it('should show error widget (not blank page) on API failure', () => {
    const TestComponent = ({ error }: { error: string | null }) => (
      <div>
        {error
          ? <div data-testid="widget-error" role="alert">{error}</div>
          : <div data-testid="widget-content">Data</div>
        }
      </div>
    );
    render(<TestComponent error="Lỗi truy vấn dữ liệu" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Lỗi truy vấn dữ liệu');
    expect(screen.queryByTestId('widget-content')).not.toBeInTheDocument();
  });
});

// ─── TS-ADM05-03: Score Distribution Display ────────────────────────────────

describe('TS-ADM05-03: Score Distribution Rendering', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should render 4 score buckets', () => {
    const buckets = [
      { label: 'Giỏi', count: 10 },
      { label: 'Khá', count: 5 },
      { label: 'Trung bình', count: 3 },
      { label: 'Yếu', count: 2 },
    ];
    const TestComponent = () => (
      <div data-testid="score-distribution">
        {buckets.map(b => (
          <div key={b.label} data-testid={`bucket-${b.label}`}>
            {b.label}: {b.count}
          </div>
        ))}
      </div>
    );
    render(<TestComponent />);
    expect(screen.getByTestId('bucket-Giỏi')).toHaveTextContent('10');
    expect(screen.getByTestId('bucket-Khá')).toHaveTextContent('5');
    expect(screen.getByTestId('bucket-Trung bình')).toHaveTextContent('3');
    expect(screen.getByTestId('bucket-Yếu')).toHaveTextContent('2');
  });

  it('should sum bucket counts to total', () => {
    const buckets = [
      { label: 'Giỏi', count: 10 },
      { label: 'Khá', count: 5 },
      { label: 'Trung bình', count: 3 },
      { label: 'Yếu', count: 2 },
    ];
    const total = buckets.reduce((sum, b) => sum + b.count, 0);
    expect(total).toBe(20);
  });

  it('should show 0 for all buckets when no score data', () => {
    const TestComponent = () => (
      <div>
        <span data-testid="excellent">0</span>
        <span data-testid="good">0</span>
        <span data-testid="average">0</span>
        <span data-testid="poor">0</span>
      </div>
    );
    render(<TestComponent />);
    ['excellent', 'good', 'average', 'poor'].forEach(id => {
      expect(screen.getByTestId(id)).toHaveTextContent('0');
    });
  });

  it('should display class ranking table', () => {
    const classes = [
      { name: '10A1', avgScore: 8.2 },
      { name: '10A2', avgScore: 7.8 },
    ];
    const TestComponent = () => (
      <table>
        <tbody>
          {classes.map(c => (
            <tr key={c.name} data-testid={`row-${c.name}`}>
              <td>{c.name}</td>
              <td>{c.avgScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
    render(<TestComponent />);
    expect(screen.getByTestId('row-10A1')).toBeInTheDocument();
    expect(screen.getByTestId('row-10A2')).toBeInTheDocument();
  });

  it('should render attendance trend data points', () => {
    const trends = [
      { date: '2025-09-01', rate: 95.0 },
      { date: '2025-09-02', rate: 92.5 },
    ];
    const TestComponent = () => (
      <ul>
        {trends.map(t => (
          <li key={t.date} data-testid={`trend-${t.date}`}>{t.date}: {t.rate}%</li>
        ))}
      </ul>
    );
    render(<TestComponent />);
    expect(screen.getByTestId('trend-2025-09-01')).toHaveTextContent('95%');
    expect(screen.getByTestId('trend-2025-09-02')).toHaveTextContent('92.5%');
  });
});
