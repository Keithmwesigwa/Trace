// API service file
const API_URL = '/api';

// Global price formatter — UGX currency
function formatPrice(price) {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return 'UGX ' + num.toLocaleString('en-UG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
window.formatPrice = formatPrice;

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
                // Auto-logout only if user had a token (prevents loops)
                if (localStorage.getItem('token') && window.location.pathname !== '/login.html') {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/login.html';
                    return;
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
    },

    vendor: {
        getInventory: () => api.request('/vendor/inventory'),
        addToInventory: (product_id, stock) => api.request('/vendor/inventory', { method: 'POST', body: JSON.stringify({ product_id, stock }) }),
        removeFromInventory: (product_id) => api.request(`/vendor/inventory/${product_id}`, { method: 'DELETE' })
    },

    orders: {
        create: (data) => api.request('/orders', { method: 'POST', body: JSON.stringify(data) }),
        getNearby: () => api.request('/orders/nearby'),
        accept: (id) => api.request(`/orders/${id}/accept`, { method: 'POST' }),
        getMyOrders: () => api.request('/orders/my-orders')
    }
};

window.api = api;
