export default function CTAButton({ to, onClick, children }) {
  const common = "btn btn-primary text-white px-6 py-3 rounded-2xl";
  if (to) {
    return <a href={to} className={common}>{children}</a>;
  }
  return <button onClick={onClick} className={common}>{children}</button>;
}
