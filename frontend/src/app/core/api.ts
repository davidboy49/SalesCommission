import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Dashboard,
  Employee,
  PayoutHistory,
  Period,
  Plan,
  ResultDetail,
  ResultSummary,
} from './models';

/** Relative so the same build works behind any host; `ng serve` proxies it (proxy.conf.json), a reverse proxy does in production. */
export const API_URL = '/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  periods() {
    return this.http.get<Period[]>(`${API_URL}/periods`);
  }

  calculate(periodCode: string) {
    return this.http.post<Period>(`${API_URL}/periods/${periodCode}/calculate`, {});
  }

  dashboard(period: string) {
    return this.http.get<Dashboard>(`${API_URL}/dashboard`, { params: { period } });
  }

  results(period: string) {
    return this.http.get<ResultSummary[]>(`${API_URL}/results`, { params: { period } });
  }

  resultDetail(employeeId: number, period: string) {
    return this.http.get<ResultDetail>(`${API_URL}/results/${employeeId}`, { params: { period } });
  }

  myCommission(period: string) {
    return this.http.get<ResultDetail>(`${API_URL}/me/commission`, { params: { period } });
  }

  myHistory() {
    return this.http.get<PayoutHistory[]>(`${API_URL}/me/history`);
  }

  employees() {
    return this.http.get<Employee[]>(`${API_URL}/employees`);
  }

  plans() {
    return this.http.get<Plan[]>(`${API_URL}/plans`);
  }
}
