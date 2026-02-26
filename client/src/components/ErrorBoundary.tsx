import { Component, ErrorInfo, ReactNode } from 'react';
import { Container } from './primitives/Container';
import { Card } from './primitives/Card';
import { Button } from './primitives/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md">
          <div style={{ marginTop: '64px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Card>
              <Card.Content>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' }}>
                  <h1 style={{ fontSize: '2.125rem', color: '#d32f2f', marginBottom: '8px' }}>
                    Oops! Something went wrong
                  </h1>
                  <p style={{ marginBottom: '24px', textAlign: 'center' }}>
                    We apologize for the inconvenience. An unexpected error has occurred.
                  </p>
                  {this.state.error && (
                    <div style={{
                      width: '100%',
                      padding: '16px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '4px',
                      marginBottom: '24px',
                    }}>
                      <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem', margin: 0 }}>
                        {this.state.error.message}
                      </pre>
                    </div>
                  )}
                  <Button variant="primary" onClick={this.handleReset}>
                    Try Again
                  </Button>
                </div>
              </Card.Content>
            </Card>
          </div>
        </Container>
      );
    }

    return this.props.children;
  }
}
