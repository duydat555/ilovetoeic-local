import React from 'react';

/** Kept outside every provider so failed providers and lazy imports cannot clear the page. */
export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[App] Không thể hiển thị ứng dụng', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main role="alert" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: '#f8fafc', color: '#0f172a', font: '16px/1.6 system-ui, sans-serif' }}>
      <div style={{ maxWidth: 440 }}>
        <h1 style={{ fontSize: 24, lineHeight: 1.3, marginBottom: 12 }}>Chưa thể mở nội dung</h1>
        <p>Trang có thể vừa được cập nhật hoặc kết nối bị gián đoạn. Bạn có thể tải lại để thử tiếp.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginTop: 20 }}>
          <button type="button" onClick={() => window.location.reload()} style={{ minHeight: 44, padding: '10px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffc72c', color: '#0f172a', font: 'inherit', cursor: 'pointer' }}>Tải lại trang</button>
          <a href="/" style={{ color: '#1d4ed8', padding: '10px 0' }}>Về trang chủ</a>
        </div>
      </div>
    </main>;
  }
}
