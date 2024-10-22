// app/page.js
import Landing from './landing';
import SmartPoolsList from './list';

export default function HomePage() {
  return (
    <div>
      <Landing />
      <SmartPoolsList />
    </div>
  );
}
