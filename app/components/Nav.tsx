import Link from 'next/link';

const links = [
  ['/', 'Dashboard'],
  ['/topics', 'Topic Library'],
  ['/practice', 'Practice'],
  ['/results', 'Results'],
  ['/review', 'Review'],
  ['/settings', 'Settings'],
];

export function Nav() {
  return (
    <nav>
      {links.map(([href, label]) => (
        <Link key={href} href={href} className="badge">
          {label}
        </Link>
      ))}
    </nav>
  );
}
