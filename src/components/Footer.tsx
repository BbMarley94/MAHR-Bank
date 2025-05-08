export function Footer() {
    return (
      <footer className="bg-white/10 backdrop-blur-md py-8 px-8">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-semibold mb-4">About MAHR Bank</h3>
            <p className="text-white/70">
              Providing secure and innovative banking solutions for a better financial future.
            </p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-white/70 hover:text-white transition-colors">Terms & Conditions</a>
              </li>
              <li>
                <a href="#" className="text-white/70 hover:text-white transition-colors">Privacy Policy</a>
              </li>
              <li>
                <a href="#" className="text-white/70 hover:text-white transition-colors">Security</a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-2">
              <li className="text-white/70">📍 123 Banking Street</li>
              <li className="text-white/70">📞 (555) 123-4567</li>
              <li className="text-white/70">✉️ support@mahrbank.com</li>
            </ul>
          </div>
        </div>
        <div className="max-w-4xl mx-auto mt-8 pt-8 border-t border-white/20">
          <p className="text-center text-white/50">
            © {new Date().getFullYear()} MAHR Bank. All rights reserved.
          </p>
        </div>
      </footer>
    );
  }