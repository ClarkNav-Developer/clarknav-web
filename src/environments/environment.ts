const apiUrl = 'https://api.clarknav.com'; 

// const apiUrl = 'http://localhost:8000'; 

export const environment = {
    production: true,
    googleMapsApiKey: 'AIzaSyBcBSQmpNYjVOZtWYCKuP8kka1M60sfbHo', 
    // // NEW API KEY
    // googleMapsApiKey: 'AIzaSyDiudS4qTFzpF3NE-dx8PL-t8Rr6GI0RDo', 
    //OLD API KEY

    apiUrl: apiUrl,
    loginUrl: `${apiUrl}/api/auth/login`,
    logoutUrl: `${apiUrl}/api/auth/logout`,   
    registerUrl: `${apiUrl}/api/auth/register`,
    identityUrl: `${apiUrl}/api/auth/get-identity`,
    updateUserUrl: `${apiUrl}/api/auth/update-credentials`,
    refreshUrl: `${apiUrl}/api/auth/refresh`,

    bugReportsUrl: `${apiUrl}/api/bug-reports`,
    feedbackUrl: `${apiUrl}/api/feedback`,
    locationSearchesUrl: `${apiUrl}/api/location-searches`,
    navigationHistoriesUrl: `${apiUrl}/api/navigation-histories`,
    routeUsagesUrl: `${apiUrl}/api/route-usages`,
    customRoutesUrl: `${apiUrl}/api/custom-routes`,

    forgotPasswordUrl: `${apiUrl}/api/auth/forgot-password`,
    resetPasswordUrl: `${apiUrl}/api/auth/reset-password`,
    verifyEmailUrl: `${apiUrl}/api/auth/verify-email`,
    resendEmailUrl: `${apiUrl}/api/auth/resend-verification`,

    usersUrl: `${apiUrl}/api/users`, // Add this line
};


// new api key AIzaSyBcBSQmpNYjVOZtWYCKuP8kka1M60sfbHo
// old api key AIzaSyDiudS4qTFzpF3NE-dx8PL-t8Rr6GI0RDo
