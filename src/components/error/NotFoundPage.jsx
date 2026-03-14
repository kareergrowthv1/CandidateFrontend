import React from 'react';
import ErrorLayout from './ErrorLayout';

const NotFoundPage = () => {
    return (
        <ErrorLayout
            title="404"
            subtitle="Page Not Found"
            message="The page you are looking for might have been removed, had its name changed, or is temporarily unavailable."
            actionLink="/"
            actionLabel="Back to Home"
        />
    );
};

export default NotFoundPage;
