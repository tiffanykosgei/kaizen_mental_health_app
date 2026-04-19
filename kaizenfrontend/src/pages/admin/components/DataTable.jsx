export default function DataTable({ columns, data, onEdit, onDelete }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 12,
      border: '1px solid var(--border)',
      overflow: 'hidden'
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
              {columns.map(col => (
                <th key={col.key} style={{
                  padding: '12px 16px',
                  textAlign: col.align || 'left',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-secondary)'
                }}>
                  {col.label}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Actions
                </th>
              )}
             </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={row.id || index} style={{ 
                borderBottom: index < data.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background-color 0.2s ease'
              }}>
                {columns.map(col => (
                  <td key={col.key} style={{
                    padding: '12px 16px',
                    textAlign: col.align || 'left',
                    fontSize: 13,
                    color: 'var(--text-primary)'
                  }}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        style={{
                          background: 'transparent',
                          color: 'var(--accent)',
                          border: '1px solid var(--accent)',
                          padding: '4px 10px',
                          fontSize: 11,
                          borderRadius: 6,
                          cursor: 'pointer',
                          marginRight: 8,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'var(--accent)';
                          e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                          e.target.style.color = 'var(--accent)';
                        }}
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row)}
                        style={{
                          background: 'var(--error-bg)',
                          color: 'var(--error-text)',
                          border: '1px solid var(--error-text)',
                          padding: '4px 10px',
                          fontSize: 11,
                          borderRadius: 6,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'var(--error-text)';
                          e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'var(--error-bg)';
                          e.target.style.color = 'var(--error-text)';
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}