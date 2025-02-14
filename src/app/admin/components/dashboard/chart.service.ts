import { Injectable } from '@angular/core';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { RouteUsage } from '../../../models/routeusage';
import { LocationSearch } from '../../../models/locationsearch';

@Injectable({
  providedIn: 'root'
})
export class ChartService {
  private charts: Map<string, Chart> = new Map();

  constructor() {
    Chart.register(...registerables);
  }

  initializeCharts(activeTab: string, routeUsages: RouteUsage[], locationSearches: LocationSearch[]): void {
    if (activeTab === 'overview' || activeTab === 'all') {
      this.initializeTransportTypeChart(routeUsages);
      this.initializePopularRoutesChart(routeUsages);
    }
    if (activeTab === 'trends' || activeTab === 'all') {
      this.initializeRouteUsageTrendsChart(routeUsages);
    }
    if (activeTab === 'locations' || activeTab === 'all') {
      this.initializeOriginChart(locationSearches);
      this.initializeDestinationChart(locationSearches);
    }
  }

  private initializeTransportTypeChart(routeUsages: RouteUsage[]): void {
    const transportTypes = this.processTransportTypeData(routeUsages);
    const chartConfig = this.getTransportTypeChartConfig(transportTypes);
    this.createOrUpdateChart('transportType', 'pie', chartConfig);
  }

  private initializePopularRoutesChart(routeUsages: RouteUsage[]): void {
    const popularRoutes = this.processPopularRoutesData(routeUsages);
    const chartConfig = this.getPopularRoutesChartConfig(popularRoutes);
    this.createOrUpdateChart('popularRoutes', 'bar', chartConfig);
  }

  private initializeRouteUsageTrendsChart(routeUsages: RouteUsage[]): void {
    const trends = this.processRouteUsageTrendsData(routeUsages);
    const chartConfig = this.getRouteUsageTrendsChartConfig(trends);
    this.createOrUpdateChart('routeUsageTrends', 'line', chartConfig);
  }

  private initializeOriginChart(locationSearches: LocationSearch[]): void {
    const originData = this.processLocationData(locationSearches, 'origin');
    const chartConfig = this.getOriginChartConfig(originData);
    this.createOrUpdateChart('originChart', 'doughnut', chartConfig);
  }

  private initializeDestinationChart(locationSearches: LocationSearch[]): void {
    const destinationData = this.processLocationData(locationSearches, 'destination');
    const chartConfig = this.getDestinationChartConfig(destinationData);
    this.createOrUpdateChart('destinationChart', 'bar', chartConfig);
  }

  private processTransportTypeData(routeUsages: RouteUsage[]) {
    return routeUsages.reduce((acc: { [key: string]: number }, usage) => {
      const type = usage.route_type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }

  private processPopularRoutesData(routeUsages: RouteUsage[]) {
    const routeCounts = routeUsages.reduce((acc: { [key: string]: number }, usage) => {
      acc[usage.route_name] = (acc[usage.route_name] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(routeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }

  private processRouteUsageTrendsData(routeUsages: RouteUsage[]) {
    const monthlyData = routeUsages.reduce((acc: { [key: string]: number }, usage) => {
      const date = new Date(usage.created_at);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      acc[monthYear] = (acc[monthYear] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b));
  }

  private processLocationData(locationSearches: LocationSearch[], type: 'origin' | 'destination') {
    const locationCounts = locationSearches.reduce((acc: { [key: string]: number }, search) => {
      const location = search[type];
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(locationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);
  }

  private getTransportTypeChartConfig(data: any): ChartConfiguration {
    return {
      type: 'pie',
      data: {
        labels: Object.keys(data),
        datasets: [{
          data: Object.values(data),
          backgroundColor: [
            '#1d58c6', // Royal Blue
            '#f98100', // Bright Orange
            '#4378d6', // Light Blue
            '#fa9424'  // Light Orange
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: {
                family: "'Inter', sans-serif",
                size: 12,
                weight: 500
              },
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
        }
      }
    };
  }

  private getPopularRoutesChartConfig(data: [string, number][]): ChartConfiguration {
    return {
      type: 'bar',
      data: {
        labels: data.map(([name]) => name),
        datasets: [{
          label: 'Usage Count',
          data: data.map(([, count]) => count),
          backgroundColor: [
            '#1d58c6', // Royal Blue
            '#4378d6', // Light Blue
            '#6998e6', // Lighter Blue
            '#f98100', // Bright Orange
            '#fa9424'  // Light Orange
          ],
          borderWidth: 1,
          borderRadius: 8,
          maxBarThickness: 70
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Most Popular Routes',
            font: { size: 16, weight: 'bold' },
            padding: { bottom: 20 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: '#cbd5e1', // Lightest Neutral
            },
            ticks: {
              font: {
                family: "'Inter', sans-serif",
                size: 12
              }
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: {
                family: "'Inter', sans-serif",
                size: 12
              }
            }
          }
        }
      }
    };
  }

  private getRouteUsageTrendsChartConfig(data: [string, number][]): ChartConfiguration {
    return {
      type: 'line',
      data: {
        labels: data.map(([date]) => date),
        datasets: [{
          label: 'Monthly Usage',
          data: data.map(([, count]) => count),
          borderColor: '#1d58c6', // Royal Blue
          backgroundColor: '#1d58c615', // Royal Blue with transparency
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#1d58c6', // Royal Blue
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Route Usage Trends',
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: '#cbd5e1', // Lightest Neutral
            },
            ticks: {
              font: {
                family: "'Inter', sans-serif",
                size: 12
              }
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              maxRotation: 45,
              font: {
                family: "'Inter', sans-serif",
                size: 12
              }
            }
          }
        }
      }
    };
  }

  private getOriginChartConfig(data: [string, number][]): ChartConfiguration {
    return {
      type: 'doughnut',
      data: {
        labels: data.map(([location]) => location),
        datasets: [{
          data: data.map(([, count]) => count),
          backgroundColor: [
            '#1d58c6', // Royal Blue
            '#4378d6', // Light Blue
            '#6998e6', // Lighter Blue
            '#f98100', // Bright Orange
            '#fa9424', // Light Orange
            '#fba749'  // Lighter Orange
          ],
          borderWidth: 2,
          borderColor: '#ffffff',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: {
                size: 12
              },
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          title: {
            display: false
          }
        }
      }
    };
  }

  private getDestinationChartConfig(data: [string, number][]): ChartConfiguration {
    return {
      type: 'bar',
      data: {
        labels: data.map(([location]) => location),
        datasets: [{
          label: 'Number of Searches',
          data: data.map(([, count]) => count),
          backgroundColor: [
            '#1d58c6', // Royal Blue
            '#4378d6', // Light Blue
            '#6998e6', // Lighter Blue
            '#f98100', // Bright Orange
            '#fa9424', // Light Orange
            '#fba749'  // Lighter Orange
          ],
          borderWidth: 0,
          borderRadius: 6,
          maxBarThickness: 40
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: '#cbd5e1', // Lightest Neutral
              display: true
            },
            ticks: {
              font: {
                size: 12
              }
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                size: 12
              }
            }
          }
        }
      }
    };
  }

  private createOrUpdateChart(id: string, type: ChartType, config: ChartConfiguration): void {
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas) return;

    const existingChart = this.charts.get(id);
    if (existingChart) {
      existingChart.destroy();
    }

    const chart = new Chart(canvas, config);
    this.charts.set(id, chart);
  }

  destroyCharts(): void {
    this.charts.forEach(chart => chart.destroy());
    this.charts.clear();
  }
}