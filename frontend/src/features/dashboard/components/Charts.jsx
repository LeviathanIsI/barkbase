import OccupancyAreaChart from './OccupancyAreaChart';

const DashboardCharts = ({ occupancyData = [] }) => {
  return <OccupancyAreaChart data={occupancyData} />;
};

export default DashboardCharts;
