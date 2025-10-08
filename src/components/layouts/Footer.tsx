import Link from "next/link";

export default function Footer() {
  return (
    <footer id="footer" className="bg-gray-950 text-gray-200 border-t border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-semibold mb-3">About Us</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-white">Shop IXTAbox</Link></li>
              <li><Link href="#" className="hover:text-white">Benefits of IXTAbox</Link></li>
              <li><Link href="#" className="hover:text-white">Vision and Philosophy</Link></li>
              <li><Link href="#" className="hover:text-white">Our Timeline</Link></li>
              <li><Link href="#" className="hover:text-white">Reseller Portal</Link></li>
              <li><Link href="#" className="hover:text-white">Affiliate Portal</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">Information</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-white">FAQs</Link></li>
              <li><Link href="#" className="hover:text-white">Shipping</Link></li>
              <li><Link href="#" className="hover:text-white">Refund Policy</Link></li>
              <li><Link href="#" className="hover:text-white">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-white">Terms of Service</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">Join Our Newsletter</h3>
            <p className="text-sm text-gray-400 mb-3">Subscribe to be the first to hear about the latest updates!</p>
            <form className="flex gap-2">
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button type="submit" className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-400">Go</button>
            </form>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">Get In Touch</h3>
            <ul className="space-y-2 text-sm">
              <li className="text-gray-300">+46-70-2223250</li>
              <li>
                <a href="mailto:info@ixtabox.com" className="hover:text-white">info@ixtabox.com</a>
                <span className="text-gray-500"> | </span>
                <a href="mailto:order@ixtabox.com" className="hover:text-white">order@ixtabox.com</a>
              </li>
              <li className="text-gray-400">Hudenevägen 34, 524 92 Herrljunga</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-gray-400">
          <div>© 2025, IXTAbox</div>
          <div className="flex items-center gap-4">
            <span>Language</span>
            <span>Country/region</span>
            <div className="flex items-center gap-2">
              <span>Payment methods</span>
              <span className="inline-flex items-center gap-2 text-xs text-gray-500">Apple Pay · Google Pay · Klarna · Mastercard · Visa</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
