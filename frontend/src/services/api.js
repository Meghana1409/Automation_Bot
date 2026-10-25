import axios from 'axios';

/**
 * Base URL for the FastAPI backend.
 * Uses VITE_API_URL if configured, otherwise falls back to local FastAPI on port 8000.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

/**
 * Configured Axios Client Instance
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

/**
 * Request Interceptor: Automatically attaches Bearer JWT token from localStorage.
 */
apiClient.interceptors.request.use(
  (config) => {
    config.metadata = { startTime: new Date() };
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor: Handles standardizing errors and auto-clearing session on 401.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let errorMessage = 'An unexpected error occurred with the salon backend.';

    if (error.response) {
      const data = error.response.data;
      if (error.response.status === 401) {
        // If not already on login and unauthorized, clear token
        if (localStorage.getItem('admin_token')) {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
          window.dispatchEvent(new Event('auth:logout'));
        }
      }

      if (typeof data === 'string') {
        errorMessage = data;
      } else if (data && data.detail) {
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorMessage = data.detail.map((err) => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
        }
      } else if (data && data.message) {
        errorMessage = data.message;
      }
    } else if (error.request) {
      errorMessage = 'Could not reach the FastAPI server. Please ensure the backend is running on port 8000.';
    } else {
      errorMessage = error.message;
    }

    error.friendlyMessage = errorMessage;
    return Promise.reject(error);
  }
);

/**
 * 1. Admin Auth Service
 */
export const authService = {
  async login(username, password) {
    const res = await apiClient.post('/auth/login', { username, password });
    return res.data;
  },
  async getMe() {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
  async changePassword(old_password, new_password) {
    const res = await apiClient.post('/auth/change-password', { old_password, new_password });
    return res.data;
  },
};

/**
 * 2. Service & Price Management Service
 */
export const serviceService = {
  async getAll(params = {}) {
    const res = await apiClient.get('/services', { params });
    return res.data;
  },
  async getById(id) {
    const res = await apiClient.get(`/services/${id}`);
    return res.data;
  },
  async create(data) {
    const res = await apiClient.post('/services', data);
    return res.data;
  },
  async update(id, data) {
    const res = await apiClient.put(`/services/${id}`, data);
    return res.data;
  },
  async delete(id) {
    const res = await apiClient.delete(`/services/${id}`);
    return res.data;
  },
  async uploadPhoto(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/services/upload-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

/**
 * 3. Discount Engine Service
 */
export const discountService = {
  async getAll(params = {}) {
    const res = await apiClient.get('/discounts', { params });
    return res.data;
  },
  async getById(id) {
    const res = await apiClient.get(`/discounts/${id}`);
    return res.data;
  },
  async create(data) {
    const res = await apiClient.post('/discounts', data);
    return res.data;
  },
  async update(id, data) {
    const res = await apiClient.put(`/discounts/${id}`, data);
    return res.data;
  },
  async delete(id) {
    const res = await apiClient.delete(`/discounts/${id}`);
    return res.data;
  },
  async calculate(cartPayload) {
    const res = await apiClient.post('/discounts/calculate', cartPayload);
    return res.data;
  },
};

/**
 * 4. Staff Management Service
 */
export const staffService = {
  async getAll(params = {}) {
    const res = await apiClient.get('/staff', { params });
    return res.data;
  },
  async getById(id) {
    const res = await apiClient.get(`/staff/${id}`);
    return res.data;
  },
  async create(data) {
    const res = await apiClient.post('/staff', data);
    return res.data;
  },
  async update(id, data) {
    const res = await apiClient.put(`/staff/${id}`, data);
    return res.data;
  },
  async delete(id) {
    const res = await apiClient.delete(`/staff/${id}`);
    return res.data;
  },
  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/staff/upload-avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

/**
 * 5. Working Hours & Schedule Service
 */
export const scheduleService = {
  async getWorkingHours() {
    const res = await apiClient.get('/schedule/working-hours');
    return res.data;
  },
  async updateWorkingHours(hours) {
    const res = await apiClient.put('/schedule/working-hours', { hours });
    return res.data;
  },
  async getHolidays() {
    const res = await apiClient.get('/schedule/holidays');
    return res.data;
  },
  async addHoliday(data) {
    const res = await apiClient.post('/schedule/holidays', data);
    return res.data;
  },
  async deleteHoliday(id) {
    const res = await apiClient.delete(`/schedule/holidays/${id}`);
    return res.data;
  },
};

/**
 * 6. Booking Capacity Limit Service
 */
export const capacityService = {
  async getCapacity() {
    const res = await apiClient.get('/capacity');
    return res.data;
  },
  async updateCapacity(data) {
    const res = await apiClient.put('/capacity', data);
    return res.data;
  },
  async getOccupancy(date_str) {
    const res = await apiClient.get('/capacity/occupancy', {
      params: { date_str },
    });
    return res.data;
  },
};

/**
 * 7. Appointment & Calendar Service
 */
export const appointmentService = {
  async getAll(params = {}) {
    const res = await apiClient.get('/appointments', { params });
    return res.data;
  },
  async getCalendar(start_date, end_date, params = {}) {
    const res = await apiClient.get('/appointments/calendar', {
      params: { start_date, end_date, ...params },
    });
    return res.data;
  },
  async getById(id) {
    const res = await apiClient.get(`/appointments/${id}`);
    return res.data;
  },
  async create(data) {
    const res = await apiClient.post('/appointments', data);
    return res.data;
  },
  async approve(id) {
    const res = await apiClient.put(`/appointments/${id}/approve`);
    return res.data;
  },
  async cancel(id, reason) {
    const res = await apiClient.put(`/appointments/${id}/cancel`, { reason });
    return res.data;
  },
  async reschedule(id, new_date, new_time, reason = '') {
    const res = await apiClient.put(`/appointments/${id}/reschedule`, {
      new_date,
      new_time,
      reason,
    });
    return res.data;
  },
  async complete(id, completed_by = '', notes = '') {
    const res = await apiClient.put(`/appointments/${id}/complete`, {
      completed_by,
      notes,
    });
    return res.data;
  },
  async updateStatus(id, status, notes = '', completed_by = '') {
    const res = await apiClient.patch(`/appointments/${id}/status`, {
      status,
      notes,
      completed_by,
    });
    return res.data;
  },
  async delete(id) {
    const res = await apiClient.delete(`/appointments/${id}`);
    return res.data;
  },
  async checkSlot(doctor_name, date, time) {
    const res = await apiClient.get('/appointments/check-slot', {
      params: { doctor_name, date, time },
    });
    return res.data;
  },
  async getAvailableSlots(doctor_name, date) {
    const res = await apiClient.get('/appointments/available-slots', {
      params: { doctor_name, date },
    });
    return res.data;
  },
  async getStats() {
    const res = await apiClient.get('/appointments/stats');
    return res.data;
  },
};

/**
 * Diagnostics & Health Service
 */
export const healthService = {
  async getHealth() {
    const res = await apiClient.get('/health');
    return res.data;
  },
};

/**
 * Consolidated API Export
 */
export const api = {
  auth: authService,
  services: serviceService,
  discounts: discountService,
  staff: staffService,
  schedule: scheduleService,
  capacity: capacityService,
  appointments: appointmentService,
  health: healthService,
};

export default api;
