export default function AdminDashboardLoading() {
  return (
    <div
      className="admin-dashboard admin-dashboard-loading"
      aria-label="대시보드 불러오는 중"
    >
      <div className="admin-loading-heading" />
      <div className="admin-stat-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="admin-loading-card" key={index} />
        ))}
      </div>
      <div className="admin-dashboard-grid">
        <div className="admin-loading-panel" />
        <div className="admin-loading-panel" />
      </div>
    </div>
  )
}
