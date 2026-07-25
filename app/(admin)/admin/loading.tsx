export default function AdminLoading(){
  return <div className="dashboard" aria-busy="true" aria-label="جارٍ تحميل لوحة التحكم"><div className="dashboard-hero dashboard-skeleton"/><div className="metric-grid">{Array.from({length:5},(_,index)=><div className="metric-card dashboard-skeleton" key={index}/>)}</div><div className="dashboard-columns"><div className="dashboard-panel dashboard-skeleton"/><div className="dashboard-panel dashboard-skeleton"/></div></div>
}
