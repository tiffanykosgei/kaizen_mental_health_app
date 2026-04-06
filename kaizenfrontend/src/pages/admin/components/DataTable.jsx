export default function DataTable({ columns, data, onEdit, onDelete }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      border: '1px solid #e2e8f0',
      overflow: 'hidden'
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f7f9fc', borderBottom: '1px solid #e2e8f0' }}>
              {columns.map(col => (
                <th key={col.key} style={{
                  padding: '12px 16px',
                  textAlign: col.align || 'left',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#4a5568'
                }}>
                  {col.label}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>
                  Actions
                </th>
              )}
             </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={row.id || index} style={{ borderBottom: index < data.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                {columns.map(col => (
                  <td key={col.key} style={{
                    padding: '12px 16px',
                    textAlign: col.align || 'left',
                    fontSize: 13,
                    color: '#1a202c'
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
                          color: '#6c63ff',
                          border: '1px solid #6c63ff',
                          padding: '4px 10px',
                          fontSize: 11,
                          borderRadius: 6,
                          cursor: 'pointer',
                          marginRight: 8
                        }}
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row)}
                        style={{
                          background: '#FCEBEB',
                          color: '#791F1F',
                          border: '1px solid #F09595',
                          padding: '4px 10px',
                          fontSize: 11,
                          borderRadius: 6,
                          cursor: 'pointer'
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