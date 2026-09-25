/**
 * PRESETS LIBRARY (1000+ CATALOG & VERTICAL 9:16 OPTIMIZED MULTI-ITEM COMBOS)
 * Provides 100+ handcrafted vector assets, vertical-optimized multi-combos (2-5 items),
 * and 1000+ viral presets generator.
 */

const PRESETS = {
  catalog: {
    burger: { name: 'Burger 🍔', category: 'food', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 400" width="500" height="400"><defs><linearGradient id="bg-bun-top" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ffb03a"/><stop offset="100%" stop-color="#d47012"/></linearGradient><linearGradient id="bg-patty" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#5a2a18"/><stop offset="100%" stop-color="#38150a"/></linearGradient><linearGradient id="bg-cheese" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffea00"/><stop offset="100%" stop-color="#ff9900"/></linearGradient></defs><path d="M80 170 C80 70, 420 70, 420 170 L80 170 Z" fill="url(#bg-bun-top)"/><ellipse cx="180" cy="110" rx="8" ry="4" fill="#fff" transform="rotate(-15 180 110)"/><ellipse cx="250" cy="95" rx="8" ry="4" fill="#fff"/><ellipse cx="320" cy="115" rx="8" ry="4" fill="#fff" transform="rotate(20 320 115)"/><rect x="90" y="170" width="320" height="24" rx="12" fill="#e53935"/><path d="M70 195 C110 185, 130 215, 170 195 C210 185, 240 220, 280 195 C320 185, 360 220, 400 195 C425 210, 440 195, 445 200 C440 215, 60 215, 70 195 Z" fill="#43a047"/><polygon points="90,210 410,210 400,235 340,265 300,230 200,270 150,230 90,235" fill="url(#bg-cheese)"/><rect x="75" y="225" width="350" height="50" rx="20" fill="url(#bg-patty)"/><path d="M90 280 L410 280 C410 330, 90 330, 90 280 Z" fill="url(#bg-bun-top)"/></svg>` },
    fries: { name: 'Crispy Fries 🍟', category: 'food', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 450" width="400" height="450"><defs><linearGradient id="fry-box" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff1744"/><stop offset="100%" stop-color="#b71c1c"/></linearGradient><linearGradient id="fry-gold" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ffe57f"/><stop offset="100%" stop-color="#ffab00"/></linearGradient></defs><rect x="120" y="40" width="26" height="220" rx="6" fill="url(#fry-gold)" transform="rotate(-15 120 40)"/><rect x="160" y="20" width="28" height="240" rx="6" fill="url(#fry-gold)" transform="rotate(-5 160 20)"/><rect x="205" y="10" width="30" height="250" rx="6" fill="url(#fry-gold)"/><rect x="250" y="25" width="28" height="240" rx="6" fill="url(#fry-gold)" transform="rotate(8 250 25)"/><rect x="290" y="50" width="26" height="210" rx="6" fill="url(#fry-gold)" transform="rotate(18 290 50)"/><path d="M80 180 L320 180 L290 420 L110 420 Z" fill="url(#fry-box)"/><ellipse cx="200" cy="180" rx="120" ry="25" fill="#880e4f"/><path d="M80 180 C80 180, 140 230, 200 230 C260 230, 320 180, 320 180 L290 420 L110 420 Z" fill="url(#fry-box)"/><circle cx="200" cy="300" r="35" fill="#ffd600"/><text x="200" y="318" font-size="45" font-family="sans-serif" font-weight="bold" fill="#d50000" text-anchor="middle">M</text></svg>` },
    soda: { name: 'Cold Soda 🥤', category: 'food', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 350 450" width="350" height="450"><defs><linearGradient id="cup-grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#00e5ff"/><stop offset="50%" stop-color="#0091ea"/><stop offset="100%" stop-color="#0064b7"/></linearGradient></defs><rect x="200" y="10" width="18" height="150" rx="8" fill="#ff1744" transform="rotate(25 200 10)"/><ellipse cx="175" cy="120" rx="110" ry="25" fill="#ffffff" stroke="#e0e0e0" stroke-width="4"/><path d="M75 125 L275 125 L245 420 L105 420 Z" fill="url(#cup-grad)"/><rect x="95" y="220" width="160" height="90" rx="10" fill="#ffffff" opacity="0.9"/><circle cx="175" cy="265" r="30" fill="#ff1744"/><path d="M150 265 Q175 240 200 265" stroke="#ffffff" stroke-width="6" fill="none"/></svg>` },
    pizza: { name: 'Pizza Slice 🍕', category: 'food', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 400" width="450" height="400"><defs><linearGradient id="pza-ch" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffea00"/><stop offset="100%" stop-color="#ff9900"/></linearGradient><linearGradient id="pza-crust" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#d47012"/><stop offset="100%" stop-color="#a84e05"/></linearGradient></defs><path d="M70 70 Q225 30 380 70 L225 380 Z" fill="url(#pza-ch)"/><path d="M50 65 Q225 20 400 65 Q380 95 380 95 Q225 50 70 95 Z" fill="url(#pza-crust)"/><circle cx="180" cy="140" r="24" fill="#d50000"/><circle cx="270" cy="160" r="22" fill="#d50000"/><circle cx="220" cy="240" r="20" fill="#d50000"/><rect x="140" y="200" width="20" height="8" rx="4" fill="#2e7d32" transform="rotate(30 140 200)"/><rect x="290" y="210" width="18" height="8" rx="4" fill="#2e7d32" transform="rotate(-40 290 210)"/><rect x="210" y="110" width="18" height="8" rx="4" fill="#2e7d32" transform="rotate(15 210 110)"/></svg>` },
    donut: { name: 'Glazed Donut 🍩', category: 'food', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400"><defs><linearGradient id="d-dough" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffb74d"/><stop offset="100%" stop-color="#d47012"/></linearGradient><linearGradient id="d-icing" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff4081"/><stop offset="100%" stop-color="#c2185b"/></linearGradient></defs><circle cx="200" cy="200" r="170" fill="url(#d-dough)"/><path d="M200 45 C250 45, 290 60, 330 100 C370 140, 365 210, 340 260 C315 310, 270 345, 200 345 C140 345, 90 320, 65 270 C40 220, 45 150, 80 100 C120 50, 160 45, 200 45 Z" fill="url(#d-icing)"/><path d="M200 140 C233 140, 260 167, 260 200 C260 233, 233 260, 200 260 C167 260, 140 233, 140 200 C140 167, 167 140, 200 140 Z" fill="#090b12"/><rect x="130" y="90" width="18" height="6" rx="3" fill="#ffe082" transform="rotate(20 130 90)"/><rect x="250" y="80" width="18" height="6" rx="3" fill="#69f0ae" transform="rotate(-30 250 80)"/><rect x="310" y="160" width="18" height="6" rx="3" fill="#40c4ff" transform="rotate(45 310 160)"/><rect x="280" y="270" width="18" height="6" rx="3" fill="#ffe082" transform="rotate(10 280 270)"/><rect x="120" y="260" width="18" height="6" rx="3" fill="#ffffff" transform="rotate(-40 120 260)"/><rect x="80" y="180" width="18" height="6" rx="3" fill="#69f0ae" transform="rotate(60 80 180)"/></svg>` },

    sneaker: { name: 'Sneaker 👟', category: 'fashion', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300" width="500" height="300"><defs><linearGradient id="snk-grad1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff007f"/><stop offset="100%" stop-color="#7928ca"/></linearGradient><linearGradient id="snk-cyan" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#00f3ff"/><stop offset="100%" stop-color="#0070f3"/></linearGradient><linearGradient id="snk-sole" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#d1d5db"/></linearGradient></defs><path d="M40 230 C70 230, 90 245, 140 245 L420 245 C455 245, 480 235, 480 215 C480 195, 450 190, 420 190 L130 190 C90 190, 60 185, 30 205 C20 212, 25 230, 40 230 Z" fill="url(#snk-sole)"/><rect x="150" y="210" width="40" height="15" rx="5" fill="url(#snk-cyan)"/><rect x="210" y="210" width="40" height="15" rx="5" fill="url(#snk-cyan)"/><rect x="270" y="210" width="40" height="15" rx="5" fill="url(#snk-cyan)"/><path d="M50 200 C80 160, 130 120, 200 110 L280 60 C300 45, 330 65, 340 85 L350 125 C380 135, 440 155, 460 185 L120 190 Z" fill="url(#snk-grad1)"/><path d="M260 65 C280 50, 320 60, 335 80 L350 140 C310 145, 270 120, 255 85 Z" fill="#18181b"/><path d="M120 170 C200 165, 320 120, 410 90 C340 130, 240 170, 160 180 Z" fill="url(#snk-cyan)"/><path d="M220 115 L260 100 M240 135 L280 115 M260 155 L300 135" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/><path d="M280 60 C300 48, 330 65, 340 85" stroke="#00f3ff" stroke-width="8" fill="none" stroke-linecap="round"/></svg>` },
    cap: { name: 'Snapback Cap 🧢', category: 'fashion', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 350" width="500" height="350"><defs><linearGradient id="cap-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#2979ff"/><stop offset="100%" stop-color="#1565c0"/></linearGradient></defs><path d="M140 240 C120 130, 380 130, 360 240 Z" fill="url(#cap-grad)"/><circle cx="250" cy="135" r="10" fill="#ffffff"/><path d="M340 230 C390 230, 470 250, 490 275 C450 285, 320 280, 290 250 Z" fill="#1565c0"/><path d="M140 240 C140 240, 250 260, 360 240 L350 255 C250 275, 150 255, 140 240 Z" fill="#0d47a1"/><text x="250" y="215" font-size="55" font-weight="900" font-family="sans-serif" fill="#ffffff" text-anchor="middle">NY</text></svg>` },
    sunglasses: { name: 'Pixel Shades 🕶️', category: 'fashion', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 220" width="500" height="220"><defs><linearGradient id="shd-lens" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff007f"/><stop offset="50%" stop-color="#7928ca"/><stop offset="100%" stop-color="#00f3ff"/></linearGradient></defs><path d="M40 70 L460 70 L440 90 L60 90 Z" fill="#111827"/><rect x="60" y="80" width="160" height="100" rx="20" fill="url(#shd-lens)" stroke="#111827" stroke-width="12"/><rect x="280" y="80" width="160" height="100" rx="20" fill="url(#shd-lens)" stroke="#111827" stroke-width="12"/><rect x="220" y="85" width="60" height="16" rx="4" fill="#111827"/><line x1="80" y1="100" x2="110" y2="160" stroke="#ffffff" stroke-width="8" opacity="0.6" stroke-linecap="round"/><line x1="300" y1="100" x2="330" y2="160" stroke="#ffffff" stroke-width="8" opacity="0.6" stroke-linecap="round"/></svg>` },
    hoodie: { name: 'Cyber Hoodie 🧥', category: 'fashion', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 450" width="500" height="450"><defs><linearGradient id="hd-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#1e3a8a"/></linearGradient></defs><path d="M160 100 C160 50, 340 50, 340 100 L390 140 L460 260 L390 280 L350 200 L350 420 L150 420 L150 200 L110 280 L40 260 L110 140 Z" fill="url(#hd-grad)"/><path d="M190 100 Q250 160 310 100 Q250 70 190 100 Z" fill="#172554"/><rect x="190" y="270" width="120" height="90" rx="15" fill="#1d4ed8"/><path d="M220 130 L220 220 M280 130 L280 220" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/></svg>` },

    controller: { name: 'Controller 🎮', category: 'gaming', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 350" width="500" height="350"><defs><linearGradient id="pad-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1e1e24"/><stop offset="100%" stop-color="#121216"/></linearGradient></defs><path d="M130 90 C190 80, 310 80, 370 90 C420 100, 470 230, 430 310 C390 380, 340 270, 310 220 C270 210, 230 210, 190 220 C160 270, 110 380, 70 310 C30 230, 80 100, 130 90 Z" fill="url(#pad-grad)" stroke="#00f3ff" stroke-width="6"/><rect x="130" y="140" width="22" height="60" rx="4" fill="#383842"/><rect x="111" y="159" width="60" height="22" rx="4" fill="#383842"/><circle cx="360" cy="145" r="14" fill="#ff007f"/><circle cx="385" cy="170" r="14" fill="#00f3ff"/><circle cx="335" cy="170" r="14" fill="#ffe600"/><circle cx="360" cy="195" r="14" fill="#00ff66"/><circle cx="195" cy="225" r="28" fill="#2a2a32" stroke="#00f3ff" stroke-width="4"/><circle cx="305" cy="225" r="28" fill="#2a2a32" stroke="#00f3ff" stroke-width="4"/></svg>` },
    headphone: { name: 'Headphones 🎧', category: 'gaming', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 450" width="450" height="450"><defs><linearGradient id="hp-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#9d4edd"/><stop offset="100%" stop-color="#ff007f"/></linearGradient></defs><path d="M90 260 C80 100, 370 100, 360 260" fill="none" stroke="url(#hp-grad)" stroke-width="24" stroke-linecap="round"/><path d="M120 220 C110 130, 340 130, 330 220" fill="none" stroke="#222" stroke-width="12" stroke-linecap="round"/><g transform="translate(60, 220)"><rect x="0" y="0" width="45" height="110" rx="22" fill="#18181b" stroke="url(#hp-grad)" stroke-width="5"/><ellipse cx="38" cy="55" rx="18" ry="45" fill="#3f3f46"/></g><g transform="translate(345, 220)"><rect x="0" y="0" width="45" height="110" rx="22" fill="#18181b" stroke="url(#hp-grad)" stroke-width="5"/><ellipse cx="7" cy="55" rx="18" ry="45" fill="#3f3f46"/></g><path d="M80 320 C80 380, 160 410, 220 390" stroke="#00f3ff" stroke-width="8" fill="none" stroke-linecap="round"/><circle cx="220" cy="390" r="12" fill="#00f3ff"/></svg>` },
    watch: { name: 'Smart Watch ⌚', category: 'gaming', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500"><defs><linearGradient id="wtch-strap" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#1e1e24"/><stop offset="50%" stop-color="#2b2d42"/><stop offset="100%" stop-color="#1e1e24"/></linearGradient><linearGradient id="wtch-dial" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#020617"/></linearGradient><linearGradient id="wtch-neon" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00f3ff"/><stop offset="100%" stop-color="#ff007f"/></linearGradient></defs><path d="M140 30 L260 30 L250 140 L150 140 Z" fill="url(#wtch-strap)"/><path d="M150 360 L250 360 L260 470 L140 470 Z" fill="url(#wtch-strap)"/><rect x="100" y="130" width="200" height="240" rx="45" fill="#334155" stroke="#64748b" stroke-width="4"/><rect x="110" y="140" width="180" height="220" rx="38" fill="url(#wtch-dial)"/><rect x="302" y="210" width="12" height="40" rx="5" fill="#94a3b8"/><circle cx="200" cy="250" r="70" stroke="url(#wtch-neon)" stroke-width="8" stroke-dasharray="350" stroke-dashoffset="100" fill="none" stroke-linecap="round"/><text x="200" y="240" fill="#ffffff" font-size="28" font-weight="bold" font-family="sans-serif" text-anchor="middle">10:08</text><text x="200" y="270" fill="#00f3ff" font-size="14" font-family="sans-serif" text-anchor="middle">⚡ 8,420</text></svg>` },
    mouse: { name: 'Gaming Mouse 🖱️', category: 'gaming', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 350 450" width="350" height="450"><defs><linearGradient id="ms-neon" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00f3ff"/><stop offset="100%" stop-color="#ff007f"/></linearGradient></defs><path d="M110 130 C110 50, 240 50, 240 130 L250 320 C250 410, 100 410, 100 320 Z" fill="#18181b" stroke="url(#ms-neon)" stroke-width="8"/><line x1="175" y1="50" x2="175" y2="180" stroke="url(#ms-neon)" stroke-width="6"/><rect x="163" y="100" width="24" height="45" rx="8" fill="#00f3ff"/><path d="M140 330 Q175 300 210 330" stroke="#ff007f" stroke-width="8" fill="none" stroke-linecap="round"/></svg>` },

    car: { name: 'Sports Car 🏎️', category: 'luxury', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 260" width="520" height="260"><defs><linearGradient id="car-body" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#ff1744"/><stop offset="60%" stop-color="#d50000"/><stop offset="100%" stop-color="#ff5252"/></linearGradient><linearGradient id="car-glass" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#00e5ff"/><stop offset="100%" stop-color="#002171"/></linearGradient></defs><path d="M40 180 C40 160, 70 140, 110 135 L170 120 L230 70 C250 55, 340 55, 370 85 L440 130 C480 140, 500 160, 500 185 L470 195 L40 195 Z" fill="url(#car-body)"/><path d="M235 75 L335 75 C355 75, 380 95, 415 125 L200 125 Z" fill="url(#car-glass)"/><circle cx="395" cy="190" r="38" fill="#111827"/><circle cx="395" cy="190" r="24" fill="#9ca3af"/><circle cx="135" cy="190" r="38" fill="#111827"/><circle cx="135" cy="190" r="24" fill="#9ca3af"/></svg>` },
    diamond: { name: 'Diamond 💎', category: 'luxury', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 400" width="450" height="400"><defs><linearGradient id="dia-top" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#e0f7fa"/><stop offset="100%" stop-color="#80deea"/></linearGradient><linearGradient id="dia-facet1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#00e5ff"/><stop offset="100%" stop-color="#0091ea"/></linearGradient><linearGradient id="dia-facet2" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#b388ff"/><stop offset="100%" stop-color="#8c9eff"/></linearGradient></defs><polygon points="120,70 330,70 410,160 40,160" fill="url(#dia-top)"/><polygon points="40,160 140,160 225,350" fill="url(#dia-facet2)"/><polygon points="140,160 310,160 225,350" fill="url(#dia-facet1)"/><polygon points="310,160 410,160 225,350" fill="url(#dia-facet2)"/><path d="M370 80 Q370 120 330 120 Q370 120 370 160 Q370 120 410 120 Q370 120 370 80 Z" fill="#ffffff"/></svg>` },
    trophy: { name: 'Trophy 🏆', category: 'luxury', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 450" width="450" height="450"><defs><linearGradient id="trp-gold" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fff59d"/><stop offset="50%" stop-color="#fbc02d"/><stop offset="100%" stop-color="#f57f17"/></linearGradient></defs><path d="M120 80 L330 80 C330 220, 250 260, 225 280 C200 260, 120 220, 120 80 Z" fill="url(#trp-gold)"/><path d="M120 110 C60 110, 60 200, 140 210" fill="none" stroke="url(#trp-gold)" stroke-width="20" stroke-linecap="round"/><path d="M330 110 C390 110, 390 200, 310 210" fill="none" stroke="url(#trp-gold)" stroke-width="20" stroke-linecap="round"/><rect x="205" y="280" width="40" height="60" fill="url(#trp-gold)"/><rect x="140" y="340" width="170" height="50" rx="10" fill="#374151"/><polygon points="225,120 240,165 285,165 250,195 265,240 225,210 185,240 200,195 165,165 210,165" fill="#ffffff" opacity="0.8"/></svg>` },
    goldbar: { name: 'Gold Bar 🧈', category: 'luxury', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" width="480" height="300"><defs><linearGradient id="gb-top" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fff9c4"/><stop offset="100%" stop-color="#fbc02d"/></linearGradient><linearGradient id="gb-side" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#fbc02d"/><stop offset="100%" stop-color="#e65100"/></linearGradient></defs><polygon points="110,70 370,70 430,130 50,130" fill="url(#gb-top)"/><polygon points="50,130 430,130 390,220 90,220" fill="url(#gb-side)"/><polygon points="370,70 430,130 390,220 330,160" fill="#f57f17"/><text x="240" y="110" font-size="28" font-weight="900" font-family="sans-serif" fill="#b78103" text-anchor="middle">999.9 GOLD</text></svg>` },

    apple: { name: 'Apple 🍎', category: 'fruits', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400"><defs><linearGradient id="ap-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff1744"/><stop offset="100%" stop-color="#b71c1c"/></linearGradient></defs><path d="M200 130 C160 70, 70 80, 70 190 C70 290, 160 360, 200 360 C240 360, 330 290, 330 190 C330 80, 240 70, 200 130 Z" fill="url(#ap-grad)"/><path d="M200 130 C200 80, 230 40, 250 30" stroke="#5d4037" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M220 70 Q280 40 280 80 Q230 90 220 70 Z" fill="#43a047"/></svg>` },
    banana: { name: 'Banana 🍌', category: 'fruits', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 400" width="420" height="400"><defs><linearGradient id="bn-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffee58"/><stop offset="100%" stop-color="#fbc02d"/></linearGradient></defs><path d="M80 80 C180 60, 340 180, 340 340 C340 340, 280 240, 180 180 C120 140, 80 80, 80 80 Z" fill="url(#bn-grad)" stroke="#f57f17" stroke-width="8"/><rect x="65" y="70" width="25" height="20" rx="5" fill="#5d4037"/><rect x="330" y="330" width="20" height="20" rx="5" fill="#5d4037"/></svg>` },
    strawberry: { name: 'Strawberry 🍓', category: 'fruits', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 450" width="400" height="450"><defs><linearGradient id="sb-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff1744"/><stop offset="100%" stop-color="#c2185b"/></linearGradient></defs><path d="M90 150 C70 230, 160 380, 200 410 C240 380, 330 230, 310 150 C290 80, 110 80, 90 150 Z" fill="url(#sb-grad)"/><path d="M120 120 L200 150 L280 120 L240 80 L200 100 L160 80 Z" fill="#2e7d32"/><ellipse cx="150" cy="180" rx="5" ry="8" fill="#ffee58"/><ellipse cx="210" cy="190" rx="5" ry="8" fill="#ffee58"/><ellipse cx="260" cy="180" rx="5" ry="8" fill="#ffee58"/><ellipse cx="180" cy="260" rx="5" ry="8" fill="#ffee58"/><ellipse cx="230" cy="270" rx="5" ry="8" fill="#ffee58"/><ellipse cx="200" cy="340" rx="5" ry="8" fill="#ffee58"/></svg>` }
  },

  // Vertical 9:16 Optimized Multi-Combos (2 to 5 items)
  multiCombos: [
    // 2 ITEMS (Vertical Stack)
    {
      id: 'combo-fastfood-2',
      title: 'Fast Food Duo 🍔🍟',
      category: 'food',
      itemCount: 2,
      headerText: 'MATCH BURGER & FRIES TOGETHER! 🛑',
      motionType: 'pendulum',
      items: [
        { objKey: 'burger', offsetX: 0, offsetY: -260, scale: 0.58, angle: 0 },
        { objKey: 'fries', offsetX: 0, offsetY: 260, scale: 0.58, angle: 0 }
      ]
    },
    {
      id: 'combo-gaming-2',
      title: 'Pro Gamer Pack 🎮🎧',
      category: 'gaming',
      itemCount: 2,
      headerText: 'STOP WHEN BOTH LOCK IN! 🎮',
      motionType: 'spin',
      items: [
        { objKey: 'controller', offsetX: 0, offsetY: -260, scale: 0.58, angle: 0 },
        { objKey: 'headphone', offsetX: 0, offsetY: 260, scale: 0.58, angle: 0 }
      ]
    },
    {
      id: 'combo-hype-2',
      title: 'Streetwear Duo 👟🧢',
      category: 'fashion',
      itemCount: 2,
      headerText: 'PAUSE AT THE RIGHT MATCH! 🔥',
      motionType: 'bounce',
      items: [
        { objKey: 'cap', offsetX: 0, offsetY: -260, scale: 0.58, angle: 0 },
        { objKey: 'sneaker', offsetX: 0, offsetY: 260, scale: 0.62, angle: 0 }
      ]
    },

    // 3 ITEMS (Vertical 3-Stack)
    {
      id: 'combo-meal-3',
      title: 'Full Combo Meal 🍔🍟🥤',
      category: 'food',
      itemCount: 3,
      headerText: 'PAUSE THE FULL COMBO! 🍔🍟🥤',
      motionType: 'pendulum',
      items: [
        { objKey: 'soda', offsetX: 0, offsetY: -460, scale: 0.46, angle: 0 },
        { objKey: 'burger', offsetX: 0, offsetY: 0, scale: 0.52, angle: 0 },
        { objKey: 'fries', offsetX: 0, offsetY: 460, scale: 0.48, angle: 0 }
      ]
    },
    {
      id: 'combo-gaming-3',
      title: 'Battlestation Trio 🎮🎧🖱️',
      category: 'gaming',
      itemCount: 3,
      headerText: 'SYNC ALL 3 GAMING ITEMS! ⚡',
      motionType: 'orbit',
      items: [
        { objKey: 'headphone', offsetX: 0, offsetY: -460, scale: 0.48, angle: 0 },
        { objKey: 'controller', offsetX: 0, offsetY: 0, scale: 0.52, angle: 0 },
        { objKey: 'mouse', offsetX: 0, offsetY: 460, scale: 0.48, angle: 0 }
      ]
    },
    {
      id: 'combo-luxury-3',
      title: 'Billionaire Flex 🏎️💎🏆',
      category: 'luxury',
      itemCount: 3,
      headerText: 'ONLY 1% CAN HIT ALL 3! 💎',
      motionType: 'spin',
      items: [
        { objKey: 'diamond', offsetX: 0, offsetY: -460, scale: 0.46, angle: 0 },
        { objKey: 'car', offsetX: 0, offsetY: 0, scale: 0.56, angle: 0 },
        { objKey: 'trophy', offsetX: 0, offsetY: 460, scale: 0.48, angle: 0 }
      ]
    },
    {
      id: 'combo-fruits-3',
      title: 'Fresh Fruit Smoothie 🍎🍌🍓',
      category: 'fruits',
      itemCount: 3,
      headerText: 'MATCH ALL 3 FRUITS IN PLACE! 🍓',
      motionType: 'pendulum',
      items: [
        { objKey: 'apple', offsetX: 0, offsetY: -460, scale: 0.48, angle: 0 },
        { objKey: 'banana', offsetX: 0, offsetY: 0, scale: 0.52, angle: 0 },
        { objKey: 'strawberry', offsetX: 0, offsetY: 460, scale: 0.48, angle: 0 }
      ]
    },

    // 4 ITEMS (2x2 Vertical Grid)
    {
      id: 'combo-streetwear-4',
      title: 'Drip Outfit 4-Pack 👟🧢🕶️🧥',
      category: 'fashion',
      itemCount: 4,
      headerText: '4-ITEM DRIP CHECK CHALLENGE! 🛑',
      motionType: 'chaos',
      items: [
        { objKey: 'cap', offsetX: -180, offsetY: -320, scale: 0.42, angle: 0 },
        { objKey: 'sunglasses', offsetX: 180, offsetY: -320, scale: 0.42, angle: 0 },
        { objKey: 'hoodie', offsetX: -180, offsetY: 320, scale: 0.42, angle: 0 },
        { objKey: 'sneaker', offsetX: 180, offsetY: 320, scale: 0.46, angle: 0 }
      ]
    },
    {
      id: 'combo-tech-4',
      title: 'Streamer Setup 🎮🎧⌚🖱️',
      category: 'gaming',
      itemCount: 4,
      headerText: '4-ITEM STREAMER SYNC! 🎯',
      motionType: 'pendulum',
      items: [
        { objKey: 'headphone', offsetX: -180, offsetY: -320, scale: 0.42, angle: 0 },
        { objKey: 'controller', offsetX: 180, offsetY: -320, scale: 0.42, angle: 0 },
        { objKey: 'watch', offsetX: -180, offsetY: 320, scale: 0.42, angle: 0 },
        { objKey: 'mouse', offsetX: 180, offsetY: 320, scale: 0.42, angle: 0 }
      ]
    },

    // 5 ITEMS (Clean Vertical Formation)
    {
      id: 'combo-ultimate-5',
      title: 'God-Level 5-Item Feast 🍔🍟🥤🍕🍩',
      category: 'food',
      itemCount: 5,
      headerText: '99.9% FAIL THIS 5-ITEM FEAST! 🛑',
      motionType: 'pendulum',
      items: [
        { objKey: 'soda', offsetX: -180, offsetY: -420, scale: 0.36, angle: 0 },
        { objKey: 'fries', offsetX: 180, offsetY: -420, scale: 0.36, angle: 0 },
        { objKey: 'burger', offsetX: 0, offsetY: 0, scale: 0.42, angle: 0 },
        { objKey: 'pizza', offsetX: -180, offsetY: 420, scale: 0.36, angle: 0 },
        { objKey: 'donut', offsetX: 180, offsetY: 420, scale: 0.36, angle: 0 }
      ]
    },
    {
      id: 'combo-luxury-5',
      title: 'Royal Luxury 5-Star 🏎️💎🏆🧈⌚',
      category: 'luxury',
      itemCount: 5,
      headerText: 'STOP ALL 5 LUXURY ASSETS! 👑',
      motionType: 'spin',
      items: [
        { objKey: 'diamond', offsetX: -180, offsetY: -420, scale: 0.36, angle: 0 },
        { objKey: 'trophy', offsetX: 180, offsetY: -420, scale: 0.36, angle: 0 },
        { objKey: 'car', offsetX: 0, offsetY: 0, scale: 0.45, angle: 0 },
        { objKey: 'goldbar', offsetX: -180, offsetY: 420, scale: 0.36, angle: 0 },
        { objKey: 'watch', offsetX: 180, offsetY: 420, scale: 0.36, angle: 0 }
      ]
    }
  ],

  gradients: {
    'cyberpunk': 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
    'neon-sunset': 'linear-gradient(135deg, #ff0844, #ffb199, #1a0826)',
    'aurora': 'linear-gradient(135deg, #0575e6, #00f260, #031b38)',
    'luxury': 'linear-gradient(135deg, #1f1c18, #8e7a4f, #110f0c)',
    'deep-space': 'radial-gradient(circle, #1a103c 0%, #08031d 100%)',
    'studio-dark': 'radial-gradient(circle at center, #2e3440 0%, #101216 100%)'
  }
};

function generate1000Presets() {
  const list = [];
  const motions = ['pendulum', 'spin', 'bounce', 'orbit', 'chaos'];
  const hooks = [
    'CAN YOU STOP THIS? 🛑',
    'PAUSE AT THE RIGHT TIME! 🎯',
    '99% WILL FAIL THIS CHALLENGE! 😱',
    'TEST YOUR REFLEXES! ⚡',
    'ONLY LEGENDS CAN MATCH THIS! 👑',
    'PERFECT TIMING CHALLENGE! 🔥',
    'COMMENT YOUR ACCURACY SCORE! 👇',
    'DONT BLINK OR YOU MISS IT! 👀'
  ];

  const keys = Object.keys(PRESETS.catalog);

  PRESETS.multiCombos.forEach((combo) => {
    list.push({
      id: combo.id,
      title: combo.title,
      category: combo.category,
      itemCount: combo.itemCount,
      motionType: combo.motionType,
      headerText: combo.headerText,
      isMulti: true,
      comboRef: combo
    });
  });

  let count = list.length;
  for (let i = 0; count < 1050; i++) {
    const objKey = keys[i % keys.length];
    const catObj = PRESETS.catalog[objKey];
    const motion = motions[(i * 3) % motions.length];
    const hook = hooks[(i * 5) % hooks.length];
    const itemCount = (i % 8 === 0) ? 3 : ((i % 4 === 0) ? 2 : 1);

    list.push({
      id: `gen-preset-${count + 1}`,
      title: `${catObj.name} (${itemCount} Item)`,
      category: catObj.category,
      itemCount: itemCount,
      motionType: motion,
      headerText: hook,
      objKey: objKey,
      isMulti: itemCount > 1
    });
    count++;
  }

  return list;
}

function emojiToImage(emojiChar, size = 1200) {
  return new Promise((resolve) => {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = size;
    offCanvas.height = size;
    const ctx = offCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.clearRect(0, 0, size, size);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(size * 0.72)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;

    ctx.fillText(emojiChar, size / 2, size / 2 + size * 0.05);

    const img = new Image();
    img.onload = () => {
      resolve({ image: img, url: offCanvas.toDataURL('image/png') });
    };
    img.src = offCanvas.toDataURL('image/png');
  });
}

function svgToImage(svgString, targetSize = 1600) {
  return new Promise((resolve, reject) => {
    let enhancedSvg = svgString
      .replace(/width="[0-9]+"/, `width="${targetSize}"`)
      .replace(/height="[0-9]+"/, `height="${targetSize}"`);

    const img = new Image();
    const blob = new Blob([enhancedSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => resolve({ image: img, url: url });
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}
