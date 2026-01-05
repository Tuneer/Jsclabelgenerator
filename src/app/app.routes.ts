import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ExcelImportPageComponent } from './pages/excel-import-page/excel-import-page.component';
import { ExcelManagementPage } from './pages/excel-management-page/excel-management-page';
import { LabelGeneratorPageComponent } from './pages/label-generator-page/label-generator-page.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'excel-import', component: ExcelImportPageComponent },
  { path: 'excel-management', component: ExcelManagementPage },
  { path: 'label-generator', component: LabelGeneratorPageComponent }
];
