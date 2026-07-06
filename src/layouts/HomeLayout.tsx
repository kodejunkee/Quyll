import { Outlet } from 'react-router-dom';
import './HomeLayout.css';

export function HomeLayout() {
  return (
    <div className="home-layout">
      <Outlet />
    </div>
  );
}
