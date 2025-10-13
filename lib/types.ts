export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  active: boolean;
  payType: 'Hourly' | 'Salary' | 'Pct';
}

export interface AuthState {
  isAuthenticated: boolean;
}
