const statusStyles = {
  Confirmed:  { bg: '#E1F5EE', color: '#085041' },
  Pending:    { bg: '#FAEEDA', color: '#633806' },
  Completed:  { bg: '#EAF3DE', color: '#27500A' },
  Cancelled:  { bg: '#FCEBEB', color: '#791F1F' },
  Paid:       { bg: '#E1F5EE', color: '#085041' },
  Failed:     { bg: '#FCEBEB', color: '#791F1F' },
  Good:       { bg: '#EAF3DE', color: '#27500A' },
  Mild:       { bg: '#FAEEDA', color: '#633806' },
  Moderate:   { bg: '#FAECE7', color: '#712B13' },
  Severe:     { bg: '#FCEBEB', color: '#791F1F' },
  Client:     { bg: '#EEEDFE', color: '#3C3489' },
  Professional: { bg: '#E1F5EE', color: '#085041' },
  Admin:      { bg: '#F1EFE8', color: '#444441' },
  default:    { bg: '#F1EFE8', color: '#444441' }
};

export default function StatusBadge({ status, size = 'md' }) {
  if (!status) return null;
  const style = statusStyles[status] || statusStyles.default;
  const padding = size === 'sm' ? '2px 8px' : '4px 12px';
  const fontSize = size === 'sm' ? 11 : 12;

  return (
    <span style={{
      display: 'inline-block',
      padding,
      borderRadius: 20,
      fontSize,
      fontWeight: 500,
      background: style.bg,
      color: style.color,
      whiteSpace: 'nowrap'
    }}>
      {status}
    </span>
  );
}