import { Utensils, Search } from 'lucide-react'

export default function NutritionPage() {
  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ marginBottom: '4px' }}>Nutrition</h1>
        <p className="text-secondary text-sm">Track macros and calories</p>
      </div>

      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-tile">
          <div className="stat-label">Calories</div>
          <div className="stat-value">—</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>kcal today</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Protein</div>
          <div className="stat-value">—</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>g</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Carbs</div>
          <div className="stat-value">—</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>g</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Fat</div>
          <div className="stat-value">—</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>g</div>
        </div>
      </div>

      <div className="empty-state">
        <div className="empty-icon">
          <Utensils size={24} />
        </div>
        <p className="empty-title">Food tracking coming in Phase 3</p>
        <p className="empty-desc">
          Search and log food using USDA and Open Food Facts databases.
          Barcode scanning available later.
        </p>
      </div>
    </div>
  )
}
