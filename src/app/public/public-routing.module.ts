import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Layout Components
import { LayoutComponent } from './layout/layout.component';

// Feature Components
import { MapComponent } from './components/map/map.component';

// Guards
import { authGuard } from '../auth/auth.guard';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: MapComponent }, // Set MapComponent as the default route
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PublicRoutingModule { }