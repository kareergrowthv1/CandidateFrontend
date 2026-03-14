import React from 'react';
import ErrorLayout from './ErrorLayout';

const ServiceUnavailablePage = () => {
    return (
        <ErrorLayout
            title="503"
            subtitle="Service Unavailable"
            message="The server is currently unable to handle the request due to a temporary overload or scheduled maintenance. Please try again later."
            showScreenshotMessage={true}
            actionLink="/"
            actionLabel="Try Again"
        />
    );
};

export default ServiceUnavailablePage;
