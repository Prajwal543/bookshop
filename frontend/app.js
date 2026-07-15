const api = window.location.port === "8080" ? "/api" : "http://localhost:5000/api";
const state = {
  user: JSON.parse(localStorage.getItem("papertrailUser") || "null"),
  books: [],
  cart: []
};

const loginPage = document.querySelector("#loginPage");
const appShell = document.querySelector("#appShell");
const loginForm = document.querySelector("#loginForm");
const booksGrid = document.querySelector("#booksGrid");
const searchInput = document.querySelector("#searchInput");
const genreSelect = document.querySelector("#genreSelect");
const sortSelect = document.querySelector("#sortSelect");
const cartItems = document.querySelector("#cartItems");
const cartCount = document.querySelector("#cartCount");
const profileCard = document.querySelector("#profileCard");
const checkoutPanel = document.querySelector("#checkoutPanel");
const pages = [...document.querySelectorAll(".app-shell .page")];

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function ratingFor(book) {
  return (4.1 + (book.id.length % 8) / 10).toFixed(1);
}

function showApp() {
  loginPage.classList.toggle("hidden", Boolean(state.user));
  appShell.classList.toggle("hidden", !state.user);
  document.body.classList.toggle("logged-in", Boolean(state.user));
  if (state.user) routePage();
}

function routePage() {
  const requested = (location.hash || "#home").replace("#", "");
  const pageId = pages.some((page) => page.id === requested) ? requested : "home";
  pages.forEach((page) => page.classList.toggle("active-page", page.id === pageId));
  document.querySelectorAll("nav a, .cart-link").forEach((link) => {
    link.classList.toggle("active-nav", link.getAttribute("href") === `#${pageId}`);
  });
}

function renderProfile() {
  if (!state.user) return;
  profileCard.innerHTML = `
    <div class="profile-card-header">
      <div class="profile-top">
        <div class="avatar">${state.user.name.slice(0, 1).toUpperCase()}</div>
        <div>
          <span class="profile-status">Papertrail member</span>
          <h3>${state.user.name}</h3>
        </div>
      </div>
      <span class="profile-ready">Ready to order</span>
    </div>
    <div class="profile-details">
      <div class="profile-detail"><span>Contact</span><strong>${state.user.contact}</strong></div>
      <div class="profile-detail"><span>Email</span><strong>${state.user.email}</strong></div>
      <div class="profile-detail address"><span>Delivery address</span><strong>${state.user.deliveryAddress}</strong></div>
    </div>
    <div class="profile-card-footer">
      <span><b>✦</b> Delivery profile saved</span>
      <button id="logoutButton" class="button ghost">Switch profile</button>
    </div>
  `;
  document.querySelector("#logoutButton").addEventListener("click", () => {
    localStorage.removeItem("papertrailUser");
    location.reload();
  });
}

function renderBooks() {
  let books = [...state.books];
  if (sortSelect.value === "price-low") books.sort((a, b) => a.price - b.price);
  if (sortSelect.value === "price-high") books.sort((a, b) => b.price - a.price);
  if (sortSelect.value === "title") books.sort((a, b) => a.title.localeCompare(b.title));

  booksGrid.innerHTML = books.map((book) => `
    <article class="book-card">
      <div class="cover">
        ${book.thumbnail ? `<img src="${book.thumbnail}" alt="${book.title} cover" />` : `<span>${book.title.slice(0, 1)}</span>`}
        <div class="book-preview">
          <strong>${book.title}</strong>
          <span>${(book.categories || ["General"])[0]} · ${money(book.price)} · ${ratingFor(book)} rating</span>
          <p>${book.description.slice(0, 130)}...</p>
        </div>
      </div>
      <div class="book-info">
        <div class="book-meta">
          <p class="genre">${(book.categories || ["General"])[0]}</p>
          <span>${ratingFor(book)}</span>
        </div>
        <h3>${book.title}</h3>
        <p>${(book.authors || ["Unknown author"]).join(", ")}</p>
        <div class="book-actions">
          <span>${money(book.price)}</span>
          <button data-book="${book.id}">Add to cart</button>
        </div>
      </div>
    </article>
  `).join("");

  document.querySelectorAll("[data-book]").forEach((button) => {
    button.addEventListener("click", () => addToCart(button.dataset.book));
  });
}

function renderCart() {
  cartCount.textContent = state.cart.reduce((total, item) => total + Number(item.quantity || 1), 0);
  if (!state.cart.length) {
    cartItems.innerHTML = `<div class="empty">Your cart is waiting for its first story.</div>`;
    checkoutPanel.classList.add("hidden");
    return;
  }
  const total = state.cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  cartItems.innerHTML = `
    ${state.cart.map((item) => `
      <article class="cart-item">
        ${item.thumbnail ? `<img src="${item.thumbnail}" alt="" />` : `<div class="cart-cover"></div>`}
        <div>
          <h3>${item.title}</h3>
          <p>${item.authors || "Unknown author"}</p>
          <span>${money(item.price)} x ${item.quantity}</span>
        </div>
        <strong>${money(Number(item.price) * Number(item.quantity))}</strong>
        <button data-remove="${item.book_id}">Remove</button>
      </article>
    `).join("")}
  `;
  checkoutPanel.classList.remove("hidden");
  checkoutPanel.innerHTML = `
    <div>
      <p class="eyebrow">Checkout</p>
      <h3>Order summary</h3>
      <p>${state.cart.length} selected title${state.cart.length === 1 ? "" : "s"}</p>
      <div class="summary-line"><span>Subtotal</span><strong>${money(total)}</strong></div>
      <div class="summary-line"><span>Delivery</span><strong>${total >= 35 ? "Free" : "$4.99"}</strong></div>
      <div class="summary-line total"><span>Total</span><strong>${money(total + (total >= 35 ? 0 : 4.99))}</strong></div>
      <div class="delivery-box">
        <span>Deliver to</span>
        <strong>${state.user.name}</strong>
        <p>${state.user.deliveryAddress}</p>
      </div>
    </div>
    <button id="checkoutButton">Confirm checkout</button>
  `;
  document.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => removeFromCart(button.dataset.remove));
  });
  document.querySelector("#checkoutButton").addEventListener("click", () => {
    checkoutPanel.innerHTML = `
      <div>
        <p class="eyebrow">Order received</p>
        <h3>Your Papertrail order is ready for confirmation.</h3>
        <p>We will contact ${state.user.contact} before delivery.</p>
      </div>
      <a class="button ghost" href="#catalog">Keep browsing</a>
    `;
  });
}

async function loadBooks() {
  booksGrid.innerHTML = `<div class="empty">Loading books from the shelf...</div>`;
  const params = new URLSearchParams({ q: searchInput.value || "popular books", genre: genreSelect.value });
  try {
    const response = await fetch(`${api}/books?${params}`);
    if (!response.ok) throw new Error("Unable to load catalog");
    state.books = await response.json();
    renderBooks();
  } catch {
    booksGrid.innerHTML = `<div class="empty">The catalog is taking a breather. Start the API or try again in a moment.</div>`;
  }
}

async function loadCart() {
  if (!state.user) return;
  const response = await fetch(`${api}/cart/${encodeURIComponent(state.user.email)}`);
  state.cart = await response.json();
  renderCart();
}

async function addToCart(bookId) {
  const book = state.books.find((item) => item.id === bookId);
  await fetch(`${api}/cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: state.user.email, book })
  });
  await loadCart();
}

async function removeFromCart(bookId) {
  await fetch(`${api}/cart/${encodeURIComponent(state.user.email)}/${encodeURIComponent(bookId)}`, { method: "DELETE" });
  await loadCart();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(loginForm));
  const response = await fetch(`${api}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  state.user = await response.json();
  localStorage.setItem("papertrailUser", JSON.stringify(state.user));
  showApp();
  renderProfile();
  await loadBooks();
  await loadCart();
});

document.querySelector("#searchButton").addEventListener("click", loadBooks);
sortSelect.addEventListener("change", renderBooks);
document.querySelectorAll("[data-genre]").forEach((button) => {
  button.addEventListener("click", async () => {
    genreSelect.value = button.dataset.genre;
    location.hash = "catalog";
    await loadBooks();
  });
});
window.addEventListener("hashchange", routePage);

// A small, dependency-free depth effect for the glass gallery.
document.addEventListener("pointermove", (event) => {
  const gallery = document.querySelector(".hero-gallery");
  if (!gallery || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const x = (event.clientX / window.innerWidth - 0.5) * 7;
  const y = (event.clientY / window.innerHeight - 0.5) * -7;
  gallery.style.setProperty("--tilt-x", `${x}deg`);
  gallery.style.setProperty("--tilt-y", `${y}deg`);
});

showApp();
if (state.user) {
  renderProfile();
  loadBooks();
  loadCart();
}
