import React, { Component } from 'react';
import ErrorLayout from './ErrorLayout';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <ErrorLayout
                    title="Oops!"
                    subtitle="Something went wrong"
                    message="It seems like Bigfoot has broken this page or a technical glitch occurred."
                    showScreenshotMessage={true}
                    errorDetails={this.state.error}
                    actionLink="https://example.com/contact-us"
                    actionLabel="Contact Support"
                />
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
