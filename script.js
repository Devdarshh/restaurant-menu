const dishes = [
  { name: "Crispy Garden Salad", category: "Starters", price: 179, description: "Fresh greens, crunchy vegetables and a zesty house dressing.", image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80" },
  { name: "Creamy Tomato Soup", category: "Starters", price: 129, description: "Slow-cooked tomatoes, herbs and a swirl of fresh cream.", image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80" },
  { name: "Classic Margherita Pizza", category: "Mains", price: 299, description: "Stone-baked crust, mozzarella, basil and rich tomato sauce.", image: "https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=900&q=80" },
  { name: "Creamy Alfredo Pasta", category: "Mains", price: 279, description: "Pasta tossed in a silky parmesan and garlic cream sauce.", image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80" },
  { name: "Garden Veggie Burger", category: "Mains", price: 249, description: "A hearty veggie patty, crisp lettuce and our signature sauce.", image: "https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=900&q=80" },
  { name: "Chocolate Brownie", category: "Desserts", price: 149, description: "Warm chocolate brownie with a rich, fudgy centre.", image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=80" },
  { name: "Classic Cheesecake", category: "Desserts", price: 169, description: "Smooth, creamy cheesecake on a buttery biscuit base.", image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=900&q=80" },
  { name: "Fresh Lemon Cooler", category: "Drinks", price: 99, description: "Fresh lemon, mint and sparkling water served chilled.", image: "https://images.unsplash.com/photo-1513558161293-cdaf765edfd7?auto=format&fit=crop&w=900&q=80" },
  { name: "Iced Coffee", category: "Drinks", price: 139, description: "Cold-brew coffee blended with milk and a touch of sweetness.", image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=80" }
];

let selectedCategory = "All";
const grid = document.getElementById("menu-grid");
const search = document.getElementById("search");
const emptyMessage = document.getElementById("empty-message");

function renderMenu() {
  const term = search.value.trim().toLowerCase();
  const filtered = dishes.filter(dish =>
    (selectedCategory === "All" || dish.category === selectedCategory) &&
    (dish.name.toLowerCase().includes(term) || dish.description.toLowerCase().includes(term))
  );

  grid.innerHTML = filtered.map(dish => `
    <article class="card">
      <img src="${dish.image}" alt="${dish.name}" loading="lazy"
           onerror="this.onerror=null;this.src='https://placehold.co/800x500/eae9dc/1e392d?text=Fresh+and+Delicious'">
      <div class="card-body">
        <div class="card-top">
          <h3>${dish.name}</h3>
          <span class="price">₹${dish.price}</span>
        </div>
        <p>${dish.description}</p>
        <span class="tag">${dish.category}</span>
      </div>
    </article>
  `).join("");

  emptyMessage.classList.toggle("hidden", filtered.length > 0);
}

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelector(".filter.active").classList.remove("active");
    button.classList.add("active");
    selectedCategory = button.dataset.category;
    renderMenu();
  });
});

search.addEventListener("input", renderMenu);
document.getElementById("year").textContent = new Date().getFullYear();
renderMenu();
