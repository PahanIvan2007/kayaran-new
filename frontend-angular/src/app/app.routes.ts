import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'scan', loadComponent: () => import('./pages/scanner/scanner.component').then(m => m.ScannerComponent) },
  { path: 'boats', loadComponent: () => import('./pages/boats/boats.component').then(m => m.BoatsComponent) },
  { path: 'events', loadComponent: () => import('./pages/events/events.component').then(m => m.EventsComponent) },
  { path: 'rentals', loadComponent: () => import('./pages/rentals/rentals.component').then(m => m.RentalsComponent) },
  { path: 'sport', loadComponent: () => import('./pages/sport/sport.component').then(m => m.SportComponent) },
  { path: 'gps', loadComponent: () => import('./pages/gps/gps.component').then(m => m.GpsComponent) },
  { path: 'routes', loadComponent: () => import('./pages/routes/routes.component').then(m => m.RoutesComponent) },
  { path: 'stations', loadComponent: () => import('./pages/stations/stations.component').then(m => m.StationsComponent) },
  { path: 'tariffs', loadComponent: () => import('./pages/tariffs/tariffs.component').then(m => m.TariffsComponent) },
  { path: 'profile', loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent) },
];
