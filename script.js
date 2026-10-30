// ── MENU DATA ─────────────────────────────────────────────
const dishes = [
  // STARTERS
  {
    name: "Crispy Garden Salad",
    category: "Starters",
    price: 179,
    description: "Fresh greens, crunchy vegetables, cherry tomatoes and our signature zesty house dressing.",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80",
    veg: true, badge: "Fan Favourite"
  },
  {
    name: "Creamy Tomato Soup",
    category: "Starters",
    price: 129,
    description: "Slow-cooked vine tomatoes, fresh herbs, and a generous swirl of cream.",
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80",
    veg: true, badge: null
  },
  {
    name: "Mushroom Bruschetta",
    category: "Starters",
    price: 159,
    description: "Toasted sourdough topped with sautéed wild mushrooms, garlic butter and fresh herbs.",
    image: "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=900&q=80",
    veg: true, badge: "New"
  },
  {
    name: "Stuffed Jalapeños",
    category: "Starters",
    price: 149,
    description: "Cream cheese and corn stuffed jalapeños, panko-coated and golden fried.",
    image: "https://images.unsplash.com/photo-1633804773544-8b74b6d9aded?auto=format&fit=crop&w=900&q=80",
    veg: true, badge: null
  },

  // MAINS
  {
    name: "Classic Margherita Pizza",
    category: "Mains",
    price: 299,
    description: "Stone-baked thin crust, fresh mozzarella, San Marzano tomatoes and basil.",
    image: "https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=900&q=80",
    veg: true, badge: "Best Seller"
  },
  {
    name: "Creamy Alfredo Pasta",
    category: "Mains",
    price: 279,
    description: "Fettuccine tossed in a silky parmesan-garlic cream sauce with fresh black pepper.",
    image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80",
    veg: true, badge: null
  },
  {
    name: "Garden Veggie Burger",
    category: "Mains",
    price: 249,
    description: "Hearty housemade veggie patty, crisp lettuce, pickled onions and our signature aioli.",
    image: "https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=900&q=80",
    veg: true, badge: null
  },
  {
    name: "Paneer Tikka Wrap",
    category: "Mains",
    price: 269,
    description: "Chargrilled spiced paneer, roasted peppers and mint chutney rolled in a warm flatbread.",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=900&q=80",
    veg: true, badge: "Chef's Pick"
  },
  {
    name: "Truffle Mushroom Risotto",
    category: "Mains",
    price: 349,
    description: "Arborio rice slow-cooked with wild mushrooms, white wine and finished with truffle oil.",
    image: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&w=900&q=80",
    veg: true, badge: "Premium"
  },

  // DESSERTS
  {
    name: "Warm Chocolate Brownie",
    category: "Desserts",
    price: 149,
    description: "Rich, fudgy chocolate brownie served warm with vanilla ice cream and a chocolate drizzle.",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=80",
    veg: true, badge: null
  },
  {
    name: "Classic Cheesecake",
    category: "Desserts",
    price: 169,
    description: "Smooth New York–style cheesecake on a buttery biscuit base with berry compote.",
    image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=900&q=80",
    veg: true, badge: "Fan Favourite"
  },
  {
    name: "Mango Panna Cotta",
    category: "Desserts",
    price: 159,
    description: "Silky Italian custard with fresh Alphonso mango coulis and toasted coconut flakes.",
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80",
    veg: true, badge: "Seasonal"
  },

  // DRINKS
  {
    name: "Fresh Lemon Cooler",
    category: "Drinks",
    price: 99,
    description: "Freshly squeezed lemon, crushed mint leaves and sparkling water, served over ice.",
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765edfd7?auto=format&fit=crop&w=900&q=80",
    veg: true, badge: null
  },
  {
    name: "Cold Brew Iced Coffee",
    category: "Drinks",
    price: 139,
    description: "12-hour cold-brew concentrate blended with oat milk and a touch of raw cane sugar.",
    image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=80",
    veg: true, badge: null
  },
  {
    name: "Tropical Mango Smoothie",
    category: "Drinks",
    price: 149,
    description: "Alphonso mangoes blended with yoghurt, honey and a hint of cardamom.",
    image: "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?auto=format&fit=crop&w=900&q=80",
    veg: true, badge: "New"
  }
];

// ── STATE ──────────────────────────────────────────────────
let selectedCategory = "All";

// ── DOM REFS ───────────────────────────────────────────────
const grid         = document.getElementById("menu-grid");
const searchInput  = document.getElementById("search");
const emptyMessage = document.getElementById("empty-message");

// ── RENDER ─────────────────────────────────────────────────
function renderMenu() {
  const term = searchInput.value.trim().toLowerCase();

  const filtered = dishes.filter(dish =>
    (selectedCategory === "All" || dish.category === selectedCategory) &&
    (dish.name.toLowerCase().includes(term) || dish.description.toLowerCase().includes(term))
  );

  grid.innerHTML = filtered.map((dish, i) => `
    <article class="card" style="animation-delay:${i * 0.05}s" aria-label="${dish.name}">
      <div class="card-img-wrap">
        <img
          src="${dish.image}"
          alt="${dish.name}"
          loading="lazy"
          onerror="this.onerror=null;this.src='https://placehold.co/900x600/eae9dc/1e392d?text=${encodeURIComponent(dish.name)}'"
        >
        ${dish.badge ? `<span class="card-badge">${dish.badge}</span>` : ''}
      </div>
      <div class="card-body">
        <div class="card-top">
          <h3>${dish.name}</h3>
          <span class="price">₹${dish.price}</span>
        </div>
        <p class="card-desc">${dish.description}</p>
        <div class="card-footer">
          <span class="tag">${dish.category}</span>
          ${dish.veg ? '<div class="veg-dot" title="Vegetarian" aria-label="Vegetarian"></div>' : ''}
        </div>
      </div>
    </article>
  `).join("");

  emptyMessage.classList.toggle("hidden", filtered.length > 0);
}

// ── FILTER BUTTONS ─────────────────────────────────────────
document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelector(".filter.active").classList.remove("active");
    button.classList.add("active");
    selectedCategory = button.dataset.category;
    renderMenu();
  });
});

// ── SEARCH ─────────────────────────────────────────────────
searchInput.addEventListener("input", renderMenu);

// ── HAMBURGER NAV ──────────────────────────────────────────
const hamburger = document.getElementById("hamburger");
const navLinks  = document.querySelector(".nav-links");

hamburger.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  hamburger.setAttribute("aria-expanded", isOpen);
  document.body.style.overflow = isOpen ? "hidden" : "";
});

navLinks.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    hamburger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  });
});

// ── YEAR ───────────────────────────────────────────────────
document.getElementById("year").textContent = new Date().getFullYear();

// ── INIT ───────────────────────────────────────────────────
renderMenu();
