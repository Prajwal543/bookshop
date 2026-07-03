const api = "http://localhost:5000/api";
const state = {
  user: JSON.parse(localStorage.getItem("papertrailUser") || "null"),
  books: [],
  cart: [],
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

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function showApp() {
  loginPage.classList.toggle("hidden", Boolean(state.user));
  appShell.classList.toggle("hidden", !state.user);
  document.body.classList.toggle("logged-in", Boolean(state.user));
}

function renderProfile() {
  if (!state.user) return;
  profileCard.innerHTML = `
    <div class="avatar">${state.user.name.slice(0, 1).toUpperCase()}</div>
    <h3>${state.user.name}</h3>
    <p><strong>Contact</strong>${state.user.contact}</p>
    <p><strong>Email</strong>${state.user.email}</p>
    <p><strong>Delivery address</strong>${state.user.deliveryAddress}</p>
    <button id="logoutButton" class="button ghost">Switch profile</button>
  `;
  document.querySelector("#logoutButton").addEventListener("click", () => {
    localStorage.removeItem("papertrailUser");
    location.reload();
  });
}

function renderBooks() {
  let books = [...state.books];
  if (sortSelect.value === "price-low") books.sort((a, b) => a.price - b.price);
  if (sortSelect.value === "price-high")
    books.sort((a, b) => b.price - a.price);
  if (sortSelect.value === "title")
    books.sort((a, b) => a.title.localeCompare(b.title));

  booksGrid.innerHTML = books
    .map(
      (book) => `
    <article class="book-card">
      <div class="cover">
        ${book.thumbnail ? `<img src="${book.thumbnail}" alt="${book.title} cover" />` : `<span>${book.title.slice(0, 1)}</span>`}
        <div class="book-preview">
          <strong>${book.title}</strong>
          <p>${book.description.slice(0, 170)}...</p>
        </div>
      </div>
      <div class="book-info">
        <p class="genre">${(book.categories || ["General"])[0]}</p>
        <h3>${book.title}</h3>
        <p>${(book.authors || ["Unknown author"]).join(", ")}</p>
        <div class="book-actions">
          <span>${money(book.price)}</span>
          <button data-book="${book.id}">Add</button>
        </div>
      </div>
    </article>
  `,
    )
    .join("");

  document.querySelectorAll("[data-book]").forEach((button) => {
    button.addEventListener("click", () => addToCart(button.dataset.book));
  });
}

function renderCart() {
  cartCount.textContent = state.cart.reduce(
    (total, item) => total + Number(item.quantity || 1),
    0,
  );
  if (!state.cart.length) {
    cartItems.innerHTML = `<div class="empty">Your cart is waiting for its first story.</div>`;
    return;
  }
  const total = state.cart.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0,
  );
  cartItems.innerHTML = `
    ${state.cart
      .map(
        (item) => `
      <article class="cart-item">
        ${item.thumbnail ? `<img src="${item.thumbnail}" alt="" />` : `<div class="cart-cover"></div>`}
        <div>
          <h3>${item.title}</h3>
          <p>${item.authors || "Unknown author"}</p>
          <span>${money(item.price)} x ${item.quantity}</span>
        </div>
        <button data-remove="${item.book_id}">Remove</button>
      </article>
    `,
      )
      .join("")}
    <div class="cart-total"><span>Total</span><strong>${money(total)}</strong></div>
  `;
  document.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () =>
      removeFromCart(button.dataset.remove),
    );
  });
}

async function loadBooks() {
  booksGrid.innerHTML = `<div class="empty">Loading books from the shelf...</div>`;
  const params = new URLSearchParams({
    q: searchInput.value || "modern books",
    genre: genreSelect.value,
  });
  const response = await fetch(`${api}/books?${params}`);
  state.books = await response.json();
  renderBooks();
}

async function loadCart() {
  if (!state.user) return;
  const response = await fetch(
    `${api}/cart/${encodeURIComponent(state.user.email)}`,
  );
  state.cart = await response.json();
  renderCart();
}

async function addToCart(bookId) {
  const book = state.books.find((item) => item.id === bookId);
  await fetch(`${api}/cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: state.user.email, book }),
  });
  await loadCart();
}

async function removeFromCart(bookId) {
  await fetch(
    `${api}/cart/${encodeURIComponent(state.user.email)}/${encodeURIComponent(bookId)}`,
    { method: "DELETE" },
  );
  await loadCart();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(loginForm));
  const response = await fetch(`${api}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

showApp();
if (state.user) {
  renderProfile();
  loadBooks();
  loadCart();
}
