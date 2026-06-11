import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ExcelImportPageComponent } from './pages/excel-import-page/excel-import-page.component';
import { ExcelManagementPage } from './pages/excel-management-page/excel-management-page';
import { LabelGeneratorPageComponent } from './pages/label-generator-page/label-generator-page.component';
import { CouponGeneratorPageComponent } from './pages/coupon-generator-page/coupon-generator-page.component';
import { LoginPageComponent } from './pages/login-page/login-page.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  { path: '', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'excel-import', component: ExcelImportPageComponent, canActivate: [AuthGuard] },
  { path: 'excel-management', component: ExcelManagementPage, canActivate: [AuthGuard] },
  { path: 'label-generator', component: LabelGeneratorPageComponent, canActivate: [AuthGuard] },
  { path: 'coupon-generator', component: CouponGeneratorPageComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '' }
];
