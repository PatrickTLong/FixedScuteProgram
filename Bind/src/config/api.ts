/**
 * API Configuration
 * Centralized API URL for all backend requests
 */

import Config from 'react-native-config';

// Backend API URL - loaded from .env file
// Development: .env (http://10.0.0.252:3000)
// Production: .env.production (https://your-backend.railway.app)
export const API_URL = Config.API_URL || 'http://localhost:3000';
