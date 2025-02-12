import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { MapComponent } from './components/map/map.component';
import { userGuard } from '../auth/user.guard';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    canActivate: [userGuard], // Allow public routes for all users except admins
    children: [
      { path: '', component: MapComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PublicRoutingModule { }