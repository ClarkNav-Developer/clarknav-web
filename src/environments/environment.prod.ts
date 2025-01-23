const apiUrl = 'http://localhost:8000';  // Fixed apiUrl declaration

export const environment = {
    production: true,
    googleMapsApiKey: 'AIzaSyBcBSQmpNYjVOZtWYCKuP8kka1M60sfbHo', 
    // // NEW API KEY
    // googleMapsApiKey: 'AIzaSyDiudS4qTFzpF3NE-dx8PL-t8Rr6GI0RDo', 
    //OLD API KEY

    apiUrl: apiUrl,
    loginUrl: `${apiUrl}/api/login`,
    logoutUrl: `${apiUrl}/api/logout`,   
    registerUrl: `${apiUrl}/api/register`,
    identityUrl: `${apiUrl}/api/get-identity`,
    updateUserUrl: `${apiUrl}/api/update-credentials`,
};

// new api key AIzaSyBcBSQmpNYjVOZtWYCKuP8kka1M60sfbHo
// old api key AIzaSyDiudS4qTFzpF3NE-dx8PL-t8Rr6GI0RDo
