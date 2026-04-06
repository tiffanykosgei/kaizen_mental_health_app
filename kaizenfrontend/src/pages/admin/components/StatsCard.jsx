export default function StatsCard({ title, value, color, icon }) {
  const getColorStyles = () => {
    switch(color) {
      case 'purple': return { bg: '#EEEDFE', text: '#6c63ff' };
      case 'green': return { bg: '#E1F5EE', text: '#085041' };
      case 'orange': return { bg: '#FAEEDA', text: '#633806' };
      case 'red': return { bg: '#FCEBEB', text: '#791F1F' };
      default: return { bg: '#F1EFE8', text: '#444441' };
    }
  };

  const styles = getColorStyles();

  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      padding: 20,
      border: '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>
        <p style={{ fontSize: 13, color: '#718096', marginBottom: 8 }}>{title}</p>
        <p style={{ fontSize: 28, fontWeight: 600, color: '#1a202c', margin: 0 }}>{value}</p>
      </div>
      <div style={{
        width: 48,
        height: 48,
        background: styles.bg,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 24
      }}>
        {icon}
      </div>
    </div>
  );
}