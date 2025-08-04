import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
        
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary">
                    <div className="error-content">
                        <h1>🎮 Game Error</h1>
                        <p>Something went wrong with the game. Don't worry, your progress is saved!</p>
                        <details style={{ whiteSpace: 'pre-wrap', marginTop: '20px' }}>
                            <summary>Technical Details (click to expand)</summary>
                            <p><strong>Error:</strong> {this.state.error && this.state.error.toString()}</p>
                            <p><strong>Stack Trace:</strong></p>
                            <pre>{this.state.errorInfo.componentStack}</pre>
                        </details>
                        <div className="error-actions">
                            <button 
                                onClick={() => window.location.reload()}
                                className="error-button"
                            >
                                🔄 Reload Game
                            </button>
                            <button 
                                onClick={() => {
                                    localStorage.clear();
                                    window.location.reload();
                                }}
                                className="error-button secondary"
                            >
                                🗑️ Clear Data & Reload
                            </button>
                        </div>
                    </div>
                    
                    <style jsx>{`
                        .error-boundary {
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                            background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
                            color: #ffffff;
                            font-family: 'Arial', sans-serif;
                            padding: 20px;
                        }
                        
                        .error-content {
                            max-width: 600px;
                            text-align: center;
                            background: rgba(0, 0, 0, 0.8);
                            padding: 40px;
                            border-radius: 10px;
                            border: 2px solid #ff4444;
                        }
                        
                        .error-content h1 {
                            color: #ff4444;
                            margin-bottom: 20px;
                            font-size: 2.5em;
                        }
                        
                        .error-content p {
                            margin-bottom: 20px;
                            font-size: 1.2em;
                            line-height: 1.5;
                        }
                        
                        .error-actions {
                            display: flex;
                            gap: 15px;
                            justify-content: center;
                            margin-top: 30px;
                        }
                        
                        .error-button {
                            padding: 12px 24px;
                            font-size: 1.1em;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            background: #ff4444;
                            color: white;
                        }
                        
                        .error-button:hover {
                            background: #ff6666;
                            transform: translateY(-2px);
                        }
                        
                        .error-button.secondary {
                            background: #666666;
                        }
                        
                        .error-button.secondary:hover {
                            background: #888888;
                        }
                        
                        details {
                            text-align: left;
                            background: rgba(255, 255, 255, 0.1);
                            padding: 15px;
                            border-radius: 5px;
                            margin: 20px 0;
                        }
                        
                        summary {
                            cursor: pointer;
                            font-weight: bold;
                            margin-bottom: 10px;
                        }
                        
                        pre {
                            background: rgba(0, 0, 0, 0.5);
                            padding: 10px;
                            border-radius: 3px;
                            overflow-x: auto;
                            font-size: 0.9em;
                        }
                    `}</style>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;