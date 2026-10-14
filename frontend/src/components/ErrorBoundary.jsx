import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="container py-5 text-center">
          <div className="card shadow-sm border-0 rounded-4 p-4 mx-auto" style={{ maxWidth: '540px' }}>
            <div className="text-danger mb-3">
              <i className="bi bi-exclamation-triangle-fill display-4"></i>
            </div>
            <h4 className="fw-bold text-dark">Something went wrong</h4>
            <p className="text-secondary small mb-3">
              {this.state.error?.message || 'An unexpected error occurred while loading this view.'}
            </p>
            <div className="d-flex justify-content-center gap-2">
              <button onClick={this.handleReload} className="btn btn-primary btn-sm px-3">
                <i className="bi bi-arrow-clockwise me-1"></i> Reload Page
              </button>
              <a href="/admin/dashboard" className="btn btn-outline-secondary btn-sm px-3">
                <i className="bi bi-house me-1"></i> Admin Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
