import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer id="footer" className="bg-gray-950 text-gray-200 border-t border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-semibold mb-3">About Us</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-white transition-colors">Shop IXTAbox</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Benefits of IXTAbox</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Vision and Philosophy</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Our Timeline</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Reseller Portal</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Affiliate Portal</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">Information</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-white transition-colors">FAQs</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Shipping</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Refund Policy</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
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
              <button type="submit" className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-400 transition-colors">Go</button>
            </form>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">Get In Touch</h3>
            <ul className="space-y-2 text-sm">
              <li className="text-gray-300">+46-70-2223250</li>
              <li className="flex flex-col sm:flex-row sm:items-center gap-1">
                <a href="mailto:developerixtarent@gmail.com" className="hover:text-white transition-colors">developerixtarent@gmail.com</a>
              </li>
              <li className="text-gray-400">Hudenevägen 34, 524 92 Herrljunga</li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-10 border-t border-white/10 pt-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            {/* Copyright */}
            <div className="text-sm text-gray-400">
              © 2025, IXTAbox
            </div>

            {/* Language and Country */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <button className="hover:text-white transition-colors">Language</button>
              <span className="text-gray-600">|</span>
              <button className="hover:text-white transition-colors">Country/region</button>
            </div>

            {/* Payment Methods */}
            <div className="w-full lg:w-auto">
              <div className="text-xs text-gray-500 mb-2">We accept</div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="h-8 w-12 relative bg-white/10 rounded overflow-hidden border border-white/10">
                  <Image
                    src="/images/payments/visa.png"
                    alt="Visa"
                    fill
                    className="object-contain p-1"
                  />
                </div>
                <div className="h-8 w-12 relative bg-white/10 rounded overflow-hidden border border-white/10">
                  <Image
                    src="/images/payments/card.png"
                    alt="Mastercard"
                    fill
                    className="object-contain p-1"
                  />
                </div>
                <div className="h-8 w-16 relative bg-white/10 rounded overflow-hidden border border-white/10">
                  <Image
                    src="/images/payments/klarna.png"
                    alt="Klarna"
                    fill
                    className="object-contain p-1"
                  />
                </div>
                <div className="h-8 w-16 relative bg-white/10 rounded overflow-hidden border border-white/10">
                  <Image
                    src="/images/payments/google-pay.png"
                    alt="Google Pay"
                    fill
                    className="object-contain p-1"
                  />
                </div>
                <div className="h-8 w-12 relative bg-white/10 rounded overflow-hidden border border-white/10">
                  <Image
                    src="/images/payments/payment-point.png"
                    alt="Payment Point"
                    fill
                    className="object-contain p-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
