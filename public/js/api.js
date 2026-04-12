// API service file
const API_URL = '/api';

const api = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // If body is FormData (for file uploads), let browser set Content-Type
        if (options.body instanceof FormData) {
            delete headers['Content-Type'];
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = errorData.error || errorData.message || 'API request failed';
            
            if (response.status === 401 || response.status === 403) {
                console.warn('Authentication error:', message);
                // Optionally auto-logout on 401
                if (window.location.pathname !== '/login.html') {
                    alert('Session expired. Please log in again.');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/login.html';
                }
            }
            
            throw new Error(message);
        }

        return response.json();
    },

    auth: {
        login: (credentials) => api.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        }),
        register: (userData) => api.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        }),
        me: () => api.request('/auth/me')
    },

    products: {
        getAll: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return api.request(`/products?${queryString}`);
        },
        getById: (id) => api.request(`/products/${id}`),
        getBrands: () => api.request('/products/brands'),
        create: (data) => api.request('/products', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => api.request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id) => api.request(`/products/${id}`, { method: 'DELETE' })
    },

    categories: {
        getAll: () => api.request('/categories')
    },
    
    upload: (file) => {
        const formData = new FormData();
        formData.append('image', file);
        return api.request('/upload', { method: 'POST', body: formData });
    },

    wishlist: {
        toggle: (productId) => api.request('/wishlist', { method: 'POST', body: JSON.stringify({ productId }) }),
        getAll: () => api.request('/wishlist')
    },

    ratings: {
        submit: (data) => api.request('/ratings', { method: 'POST', body: JSON.stringify(data) }),
        getAll: () => api.request('/ratings')
    }
};

window.api = api;
