import logo from '../assets/logo.png';

export function Header() {
  return (
    <header className="bg-white/10 backdrop-blur-md py-4 px-8 fixed top-0 left-0 right-0 z-50">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <img src={logo} alt="MAHR Bank Logo" className="w-10 h-10 rounded-full object-cover" />
          <h1 className="text-2xl font-bold text-white">MAHR Bank</h1>
        </div>
        <nav>
          <ul className="flex space-x-6">
            <li>
              <a href="#" className="text-white/80 hover:text-white transition-colors">About</a>
            </li>
            <li>
              <a href="#" className="text-white/80 hover:text-white transition-colors">Services</a>
            </li>
            <li>
              <a href="#" className="text-white/80 hover:text-white transition-colors">Contact</a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}