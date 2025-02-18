// const apiUrl = 'https://api.clarknav.com'; 

const apiUrl = 'http://localhost:8000/api'; 
const webUrl = 'http://localhost:8000';

export const environment = {
    production: true,
    googleMapsApiKey: 'AIzaSyBcBSQmpNYjVOZtWYCKuP8kka1M60sfbHo', 
    apiUrl: apiUrl,
    webUrl: webUrl,
    auth: {
        login: `${webUrl}/login`,
        register: `${webUrl}/register`,
        forgotPassword: `${webUrl}/password/email`,
        resetPassword: `${webUrl}/password/reset`,
        logout: `${webUrl}/logout`,
    },
    user: {
        getUsers: `${apiUrl}/users`,
        storeUser: `${apiUrl}/users`,
        showUser: (id: number) => `${apiUrl}/users/${id}`,
        updateUser: (id: number) => `${apiUrl}/users/${id}`,
        deleteUser: (id: number) => `${apiUrl}/users/${id}`,
        getAuthenticatedUser: `${apiUrl}/getAuthenticatedUser`,
    },
    feedback: {
        storeFeedback: `${apiUrl}/feedback`,
        getFeedback: `${apiUrl}/feedback`,
        showFeedback: (id: number) => `${apiUrl}/feedback/${id}`,
        updateFeedback: (id: number) => `${apiUrl}/feedback/${id}`,
        deleteFeedback: (id: number) => `${apiUrl}/feedback/${id}`,
    },
    locationSearches: {
        storeLocationSearch: `${apiUrl}/location-searches`,
        getLocationSearches: `${apiUrl}/location-searches`,
        showLocationSearch: (id: number) => `${apiUrl}/location-searches/${id}`,
        updateLocationSearch: (id: number) => `${apiUrl}/location-searches/${id}`,
        deleteLocationSearch: (id: number) => `${apiUrl}/location-searches/${id}`,
    },
    navigationHistories: {
        storeNavigationHistory: `${apiUrl}/navigation-histories`,
        getNavigationHistories: `${apiUrl}/navigation-histories`,
        deleteNavigationHistory: (id: number) => `${apiUrl}/navigation-histories/${id}`,
    },
    routeUsages: {
        storeRouteUsage: `${apiUrl}/route-usages`,
        getRouteUsages: `${apiUrl}/route-usages`,
        showRouteUsage: (id: number) => `${apiUrl}/route-usages/${id}`,
        updateRouteUsage: (id: number) => `${apiUrl}/route-usages/${id}`,
        deleteRouteUsage: (id: number) => `${apiUrl}/route-usages/${id}`,
    },
    customRoutes: {
        getCustomRoutes: `${apiUrl}/custom-routes`,
        storeCustomRoute: `${apiUrl}/custom-routes`,
        showCustomRoute: (id: number) => `${apiUrl}/custom-routes/${id}`,
        updateCustomRoute: (id: number) => `${apiUrl}/custom-routes/${id}`,
        deleteCustomRoute: (id: number) => `${apiUrl}/custom-routes/${id}`,
    }
};


// new api key AIzaSyBcBSQmpNYjVOZtWYCKuP8kka1M60sfbHo
// old api key AIzaSyDiudS4qTFzpF3NE-dx8PL-t8Rr6GI0RDo
