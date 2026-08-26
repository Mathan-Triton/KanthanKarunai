/**
 * Centralised auth helpers for the frontend.
 * Always read from the session set by authApi on login.
 */
import { authApi } from '../services/authApi';

export const getCurrentUser = () => authApi.getCurrentUser();
export const isAuthenticated = () => authApi.isAuthenticated();
export const hasRole = (role: string) => authApi.hasRole(role);
export const hasAnyRole = (roles: string[]) => authApi.hasAnyRole(roles);

export const isAdmin = () => authApi.isAdmin();
export const isStaff = () => authApi.isStaff();
export const isAdminOrStaff = () => authApi.isAdminOrStaff();
export const isCustomer = () => authApi.isCustomer();
export const isDriver = () => authApi.isDriver();
